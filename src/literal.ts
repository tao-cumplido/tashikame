import { formatValue, registerSchemaName, type SchemaPredicate } from "./core.js";

export type Literal = string | number | bigint | boolean;

export function literal<T extends Literal>(value: T): SchemaPredicate<T> {
	return registerSchemaName(`Literal<${formatValue(value)}>`, (input, reports): input is T => {
		const result = input === value;

		if (!result && reports) {
			reports.push({
				valid: false,
				issue: `Value mismatch`,
				received: formatValue(input),
			});
		}

		return result;
	});
}
