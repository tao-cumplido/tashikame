import type { Tagged } from "type-fest";

import { formatSchema, formatValue, parse, registerSchemaName, type Infer, type Schema } from "./core.js";
import { makeIterable, type IterableSchema } from "./iterable.js";

const spreadables = new WeakSet();

export type SpreadableSchema<T extends readonly unknown[] = unknown[]> = Tagged<IterableSchema<T>, "SpreadableSchema">;

function isSpreadable(schema: Schema): schema is SpreadableSchema {
	return typeof schema === "function" && spreadables.has(schema);
}

export function spread<SpreadSchema extends IterableSchema<readonly unknown[]>>(schema: SpreadSchema): SpreadableSchema<Infer<SpreadSchema>> {
	const spreadableSchema = makeIterable(schema.fixedSize, (input) => schema(input));

	spreadables.add(spreadableSchema);

	registerSchemaName(
		`...${formatSchema(schema)}`,
		spreadableSchema,
	);

	// @ts-expect-error
	return spreadableSchema;
}

export type TupleSchemaBase = ReadonlyArray<Schema | SpreadableSchema>;

export type InferTuple<
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
			number extends T["length"] ?
				Seen extends true ?
					ConstraintError<"Only one SpreadableSchema of arbitrary length is allowed."> :
					EnsureSpreadableCount<Tail, true> :
				EnsureSpreadableCount<Tail, Seen> :
		EnsureSpreadableCount<Tail, Seen> :
	unknown;

export type TupleSchemaConfig = {
	readonly inferReadonly?: boolean;
};

type FixedOrSpreadable = Schema | SpreadableSchema;

type Chunk = {
	readonly input: readonly unknown[];
	readonly schema: FixedOrSpreadable | FixedOrSpreadable[];
};

export function tuple<
	const TupleSchema extends TupleSchemaBase,
	const Config extends TupleSchemaConfig
>(
	schema: TupleSchema & EnsureSpreadableCount<TupleSchema>,
	config?: Config,
): IterableSchema<InferTuple<TupleSchema, Config["inferReadonly"] extends true ? true : false>> {
	// collect some data necessary to check edges of spreadable schemas of arbitrary length (= variadic schema)
	const {
		minItems,
		maxItems, // when minItems !== maxItems, then maxItems === Infinity
		variadicSchemaIndex, // index of variable schema in the schema list
		variadicInputStart, // index in the input array where variadic data starts
	} = schema.reduce((data, item, index) => {
		if (isSpreadable(item)) {
			if (item.fixedSize === Infinity) {
				if (data.variadicSchemaIndex >= 0) {
					throw new TypeError(`Only one spreadable schema of arbitrary length is allowed`);
				}

				data.variadicSchemaIndex = index;
				data.variadicInputStart = data.minItems;
			} else {
				data.minItems += item.fixedSize;
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

	const name = `[${schema.map((item) => formatSchema(item)).join(", ")}]`;

	return registerSchemaName(
		name,
		makeIterable(
			maxItems,
			(input) => {
				if (!Array.isArray(input)) {
					return {
						valid: false,
						description: `Input isn't array`,
						expected: name,
						received: formatValue(input),
					};
				}

				if (input.length < minItems || input.length > maxItems) {
					return {
						valid: false,
						description: `Input length mismatch for ${name}`,
						expected: minItems === maxItems ? `n = ${minItems}` : `${minItems} <= n <= ${maxItems}`,
						received: `n = ${input.length}`,
					};
				}

				const chunks: Chunk[] = [];

				if (variadicInputStart === -1) {
					// use input as-is whith no variadic schema present
					chunks.push({
						input,
						// @ts-expect-error: EnsureSpreadableCount confuses TS here
						schema,
					});
				} else {
					if (variadicInputStart > 0) {
						// add items before variadic part
						chunks.push({
							input: input.slice(0, variadicInputStart),
							schema: schema.slice(0, variadicSchemaIndex),
						});
					}

					if (variadicSchemaIndex >= 0) {
						// add variadic part
						chunks.push({
							input: input.slice(variadicInputStart, variadicInputEnd),
							schema: schema[variadicSchemaIndex]!,
						});
					}

					if (variadicSchemaIndex >= 0 && variadicInputEnd < Infinity) {
						// add items after variadic part
						chunks.push({
							input: input.slice(variadicInputEnd),
							schema: schema.slice(variadicSchemaIndex + 1),
						});
					}
				}

				let inputIndex = 0;

				for (const chunk of chunks) {
					if (Array.isArray(chunk.schema)) {
						let index = 0;

						for (const itemSchema of chunk.schema) {
							const value = isSpreadable(itemSchema) ?
								chunk.input.slice(index, index + itemSchema.fixedSize) :
								chunk.input[index];

							const result = parse.safe(itemSchema, value);

							if (!result.valid) {
								return {
									valid: false,
									description: `Tuple item check failed`,
									expected: name,
									received: {
										[inputIndex]: result,
									},
								};
							}

							index += 1;

							inputIndex += isSpreadable(itemSchema) ? itemSchema.fixedSize : 1;
						}
					} else {
						const result = parse.safe(chunk.schema, chunk.input);

						if (!result.valid) {
							return {
								valid: false,
								description: `Variadic tuple part check failed`,
								expected: name,
								received: {
									[variadicInputStart]: result,
								},
							};
						}

						inputIndex += chunk.input.length;
					}
				}

				// make sure that every item in the tuple was checked
				if (inputIndex !== input.length) {
					throw new Error(`Unexpected error: possibly some items in the tuple were not verified. Please file an issue.`);
				}

				return {
					valid: true,
					data: input as InferTuple<TupleSchema>,
				};
			},
		),
	);
}
