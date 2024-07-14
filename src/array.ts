import { makeIterable, type IterableSchema } from "./iterable.js";
import { formatSchema, formatValue, registerSchemaName, parse, type Infer, type Schema } from "./core.js";

export type ArraySchemaConfig = {
	readonly inferReadonly?: boolean;
}

type InferArray<ItemSchema extends Schema, Config extends ArraySchemaConfig> =
	Config['inferReadonly'] extends true ?
	readonly Infer<ItemSchema>[] :
	Infer<ItemSchema>[];

export function array<
	ItemSchema extends Schema,
	Config extends ArraySchemaConfig
>(schema: ItemSchema, config?: Config): IterableSchema<InferArray<ItemSchema, Config>> {
	return registerSchemaName(
		`Array<${formatSchema(schema)}>`,
		makeIterable(
			Infinity,
			(input, reports): input is any => {
				if (!Array.isArray(input)) {
					reports?.push({
						valid: false,
						issue: `Input isn't array`,
						received: input,
					});

					return false;
				}

				return input.every((item, index) => {
					const itemReport = parse.safe(schema, item);

					if (!itemReport.valid) {
						reports?.push({
							valid: false,
							issue: `Invalid item`,
							index,
							received: item,
							parts: [itemReport],
						});

						return false;
					}

					return true;
				});
			},
		),
	);
}
