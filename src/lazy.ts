import type { Schema } from "./core.js";

export function lazy<LazySchema extends Schema>(getter: () => LazySchema): LazySchema {
	return getter();
}
