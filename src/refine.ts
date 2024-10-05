import { formatSchema, formatValue, parse, type Infer, type Schema, type SchemaFunction } from "./core.js";

export type Constraint<S extends Schema> = (input: Infer<S>) => boolean;
export type ConstraintsArray<S extends Schema> = readonly [Constraint<S>, ...Constraint<S>[]];
export type NamedConstraints<S extends Schema> = {
	readonly [key: string]: Constraint<S>;
};

type NonEmpty<T extends object> = keyof T extends never ? never : T;

function isConstraintsArray<S extends Schema>(constraints: ConstraintsArray<S> | [NamedConstraints<S>]): constraints is ConstraintsArray<S> {
	return typeof constraints[0] === "function";
}

export function refine<
	S extends Schema,
	C extends NamedConstraints<S> = NamedConstraints<S>
>(schema: S, ...constraints: ConstraintsArray<S> | [NonEmpty<C>]): SchemaFunction<Infer<S>> {
	const checks = isConstraintsArray(constraints) ? [ ...constraints.entries(), ] : Object.entries(constraints[0]);

	if (checks.length === 0) {
		throw new TypeError(`At least one constraint has to be specified`);
	}

	return (input) => {
		const result = parse.safe(schema, input);

		if (!result.valid) {
			return result;
		}

		for (const [ key, check, ] of checks) {
			if (!check(result.data)) {
				return {
					valid: false,
					description: `Constraint check failed`,
					expected: `${formatSchema(schema)} with constraint "${key}"`,
					received: formatValue(result.data),
				};
			}
		}

		return result;
	};
}
