import type { SchemaFunction } from "./core.js";

export type InferReadonlyOption = {
	readonly inferReadonly?: boolean;
};

export type IterableSchema<T extends Iterable<unknown> = Iterable<unknown>> = SchemaFunction<T> & { fixedSize: number; };

export function makeIterable<T extends Iterable<unknown>>(size: number, schema: SchemaFunction<T>): IterableSchema<T> {
	return Object.assign(schema, { fixedSize: size, });
}
