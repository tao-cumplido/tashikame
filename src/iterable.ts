import type { SchemaPredicate } from "./core.js";

export type IterableSchema<T extends Iterable<unknown> = Iterable<unknown>> = SchemaPredicate<T> & { fixedSize: number };

export function makeIterable<T extends Iterable<unknown>>(size: number, schema: SchemaPredicate<T>): IterableSchema<T> {
	return Object.assign(schema, { fixedSize: size });
}
