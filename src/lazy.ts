import { parse, type Infer, type Schema, type SchemaFunction } from "./core.js";

export function lazy<LazySchema extends Schema>(getSchema: () => LazySchema): SchemaFunction<Infer<LazySchema>> {
	return (input) => parse.safe(getSchema(), input);
}
