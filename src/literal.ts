import { formatValue, registerSchemaName, type SchemaFunction } from "./core.js";

export type Literal = string | number | bigint | boolean;

export function literal<T extends Literal>(value: T): SchemaFunction<T> {
	// verify value is valid in non-TS
	if (![ "string", "number", "bigint", "boolean", ].includes(typeof value)) {
		throw new TypeError(`Value type must be one of "string", "number", "bigint" or "boolean". Got: "${typeof value}"`);
	}

	const name = `Literal<${formatValue(value)}>`;

	return registerSchemaName(name, (input) => {
		if (input === value) {
			return {
				valid: true,
				data: value,
			};
		}

		return {
			valid: false,
			expected: name,
			received: formatValue(input),
		};
	});
}
