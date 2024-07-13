import { registerSchemaName, formatSchema, parse, formatValue, type Infer, type SchemaPredicate, type Schema } from "./core.js";

export function union<UnionSchema extends readonly [Schema, ...Schema[]]>(schemas: UnionSchema): SchemaPredicate<{
	[P in keyof UnionSchema]: Infer<UnionSchema[P]>
}[number]> {
	return registerSchemaName(
		schemas.map((schema) => formatSchema(schema)).join(' | '),
		(input, reports): input is any => {
			if (schemas.some((schema) => parse.is(schema, input))) {
				return true;
			}

			reports?.push({
				valid: false,
				issue: `Value mismatch`,
				received: formatValue(input),
			});

			return false;
		},
	);
}
