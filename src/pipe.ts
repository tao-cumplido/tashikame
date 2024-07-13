import { parse, type Infer, type Schema, type SchemaPredicate } from "./core.js";

export function pipe<S extends Schema>(schema: S, ...constraints: ReadonlyArray<(input: Infer<S>) => boolean>): SchemaPredicate<Infer<S>> {
	return (input, reports): input is Infer<S> => {
		const result = parse.safe(schema, input);

		if (!result.valid) {
			reports?.push(result);
			return false;
		}

		return constraints.every((check) => check(result.data));
	}
}
