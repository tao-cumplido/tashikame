import { makeIterable, type InferReadonlyOption, type IterableSchema } from "./collection.js";
import { formatSchema, formatValue, parse, registerSchemaName, type Infer, type Schema } from "./core.js";

export type ArraySchemaConfig = InferReadonlyOption;

export type InferArray<ItemSchema extends Schema, Config extends ArraySchemaConfig> =
	Config["inferReadonly"] extends true ?
	readonly Infer<ItemSchema>[] :
	Infer<ItemSchema>[];

export function array<
	ItemSchema extends Schema,
	Config extends ArraySchemaConfig
>(schema: ItemSchema, config?: Config): IterableSchema<InferArray<ItemSchema, Config>> {
	const name = `Array<${formatSchema(schema)}>`;

	return registerSchemaName(
		name,
		makeIterable(
			Infinity,
			(input) => {
				if (!Array.isArray(input)) {
					return {
						valid: false,
						description: `Input isn't array`,
						expected: name,
						received: formatValue(input),
					};
				}

				for (const [ index, item, ] of input.entries()) {
					const report = parse.safe(schema, item);

					if (!report.valid) {
						return {
							valid: false,
							description: `Invalid array item`,
							expected: name,
							received: {
								[index]: report,
							},
						};
					}
				}

				return {
					valid: true,
					data: input,
				};
			},
		),
	);
}
