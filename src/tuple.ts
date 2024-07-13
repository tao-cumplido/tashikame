import type { Tagged } from "type-fest";

import { makeIterable, type IterableSchema } from "./iterable.js";
import { formatSchema, formatValue, registerSchemaName, parse, type Infer, type Schema } from "./core.js";

const spreadables = new WeakSet();

export type SpreadableSchema<T extends readonly unknown[] = unknown[]> = Tagged<IterableSchema<T>, 'SpreadableSchema'>;

function isSpreadable(schema: Schema): schema is SpreadableSchema {
	return typeof schema === 'function' && spreadables.has(schema);
}

export function spread<SpreadSchema extends IterableSchema<readonly unknown[]>>(schema: SpreadSchema): SpreadableSchema<Infer<SpreadSchema>> {
	const spreadableSchema = makeIterable(schema.fixedSize, (input, reports): input is any => schema(input, reports));

	spreadables.add(spreadableSchema);

	registerSchemaName(
		`...${formatSchema(schema)}`,
		spreadableSchema
	);

	// @ts-expect-error
	return spreadableSchema;
}

type TupleSchemaBase = ReadonlyArray<Schema | SpreadableSchema>;

type InferTuple<
	TupleSchema extends TupleSchemaBase,
	InferReadonly extends boolean = false,
	Result extends readonly unknown[] = []
> =
	TupleSchema extends readonly [] ?
		InferReadonly extends true ? Readonly<Result> : Result :
	TupleSchema extends readonly [infer Head, ...infer Tail] ?
		Tail extends TupleSchemaBase ?
			Head extends SpreadableSchema ? InferTuple<Tail, InferReadonly, [...Result, ...Infer<Head>]> :
			Head extends Schema ? InferTuple<Tail, InferReadonly, [...Result, Infer<Head>]> :
			never :
		never :
	never;

type ConstraintError<T> = {
	ERROR: T;
};

type EnsureSpreadableCount<TupleSchema, Seen = false> =
	TupleSchema extends readonly [infer Head, ...infer Tail] ?
		Head extends SpreadableSchema<infer T> ?
			number extends T['length'] ?
				Seen extends true ?
					ConstraintError<"Only one SpreadableSchema of arbitrary length is allowed."> :
					EnsureSpreadableCount<Tail, true> :
				EnsureSpreadableCount<Tail, Seen> :
		EnsureSpreadableCount<Tail, Seen> :
	unknown;

export type TupleSchemaConfig = {
	readonly inferReadonly?: boolean;
}

export function tuple<
	const TupleSchema extends TupleSchemaBase,
	const Config extends TupleSchemaConfig
>(
	schema: TupleSchema & EnsureSpreadableCount<TupleSchema>,
	config?: Config,
): IterableSchema<InferTuple<TupleSchema, Config['inferReadonly'] extends true ? true : false>> {
	const {
		minItems,
		maxItems,
		variadicSchemaIndex,
		variadicInputStart,
	} = schema.reduce((data, item, index) => {
		if (isSpreadable(item)) {
			if (item.fixedSize === Infinity) {
				if (data.variadicSchemaIndex >= 0) {
					throw new Error(`Only one variadic schema of arbitrary length is allowed`);
				}

				data.variadicSchemaIndex = index;
				data.variadicInputStart = data.minItems;
			} else {
				data.minItems += item.fixedSize
			}

			data.maxItems += item.fixedSize;
		} else {
			data.minItems += 1;
			data.maxItems += 1;
		}

		return data;
	}, {
		minItems: 0,
		maxItems: 0,
		variadicSchemaIndex: -1,
		variadicInputStart: -1,
	});

	const variadicInputEnd = (variadicInputStart - minItems) || Infinity;

	return registerSchemaName(
		`[${schema.map((item) => formatSchema(item)).join(', ')}]`,
		makeIterable<InferTuple<TupleSchema>>(
			maxItems,
			(input, reports): input is any => {
				if (!Array.isArray(input)) {
					reports?.push({
						valid: false,
						issue: `Input isn't array`,
						received: formatValue(input),
					});

					return false;
				}

				if (input.length < minItems || input.length > maxItems) {
					reports?.push({
						valid: false,
						issue: `Input length mismatch`,
						expected: `${minItems} <= n <= ${maxItems}`,
						received: `${input.length}`,
					});

					return false;
				}

				const chunks = [
					variadicInputStart > 0 ? {
						input: input.slice(0, variadicInputStart),
						schema: schema.slice(0, variadicSchemaIndex),
					} : [],
					variadicSchemaIndex >= 0 ? {
						input: input.slice(variadicInputStart, variadicInputEnd),
						schema: schema[variadicSchemaIndex]!,
					} : [],
					variadicSchemaIndex >= 0 && variadicInputEnd < Infinity ? {
						input: input.slice(variadicInputEnd),
						schema: schema.slice(variadicSchemaIndex + 1),
					} : [],
				].flat();

				for (const chunk of chunks) {
					if (Array.isArray(chunk.schema)) {
						let index = 0;

						for (const itemSchema of chunk.schema) {
							const result = parse.safe(
								itemSchema,
								isSpreadable(itemSchema) ?
									chunk.input.slice(index, index + itemSchema.fixedSize) :
									chunk.input[index],
							);

							if (!result.valid) {
								reports?.push({
									valid: false,
									issue: `Invalid item`,
									expected: formatSchema(itemSchema),
									parts: [result],
								});

								return false;
							}

							index += 1;
						}
					} else {
						const result = parse.safe(chunk.schema, chunk.input);

						if (!result.valid) {
							reports?.push({
								valid: false,
								issue: `Variadic tuple part invalid`,
								index: variadicInputStart,
								expected: formatSchema(chunk.schema),
								parts: [result],
							});

							return false;
						}
					}
				}

				return true;
			},
		),
	);
}
