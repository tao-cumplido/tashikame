import { formatSchema, formatValue, parse, registerSchemaName, type Infer, type Schema, type SchemaFunction } from "./core.js";

export type InferUnion<S extends readonly Schema[]> = {
	[P in keyof S]: Infer<S[P]>
}[number];

export function union<UnionSchema extends readonly [Schema, ...Schema[]]>(schemas: UnionSchema): SchemaFunction<InferUnion<UnionSchema>> {
	const name = schemas.map((schema) => formatSchema(schema)).join(" | ");

	return registerSchemaName(
		name,
		(input) => {
			if (schemas.some((schema) => parse.is(schema, input))) {
				return {
					valid: true,
					data: input as InferUnion<UnionSchema>,
				};
			}

			return {
				valid: false,
				expected: name,
				received: formatValue(input),
			};
		},
	);
}
