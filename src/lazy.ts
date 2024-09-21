import { parse, type Infer, type Schema, type SchemaPredicate } from "./core.js";

export function lazy<LazySchema extends Schema>(getter: () => LazySchema): SchemaPredicate<Infer<LazySchema>> {
	return (input, reports): input is Infer<LazySchema> => {
		const schema = getter();
		const result = parse.safe(schema, input);

		if (!result.valid) {
			reports?.push(result);
			return false;
		}

		return true;
	};
}
