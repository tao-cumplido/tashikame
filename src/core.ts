import type { IfAny, IsAny, IsLiteral } from "type-fest";

const primitiveMap = {
	string: 0 as unknown as string,
	number: 0,
	bigint: 0 as unknown as bigint,
	boolean: 0 as unknown as boolean,
	symbol: 0 as unknown as symbol,
	null: 0 as unknown as null,
	undefined: 0 as unknown as undefined,
	function: 0 as unknown as (...args: unknown[]) => unknown,
	unknown: 0 as unknown,
};

const primitives = new Set(Object.keys(primitiveMap));

type PrimitiveMap = typeof primitiveMap;

export type SchemaKeyword<T> =
	IsAny<T> extends true ? keyof PrimitiveMap :
	IsLiteral<T> extends true ? never :
	unknown extends T ? "unknown" :
	never extends T ? never :
	[T] extends [string] ? "string" :
	[T] extends [number] ? "number" :
	[T] extends [boolean] ? "boolean" :
	[T] extends [bigint] ? "bigint" :
	[T] extends [symbol] ? "symbol" :
	[T] extends [null] ? "null" :
	[T] extends [undefined] ? "undefined" :
	[T] extends [Function] ? "function" :
	never;

export type DataValidReport<T = unknown> = {
	readonly valid: true;
	readonly data: T;
};

export type DataInvalidReport = {
	readonly valid: false;
	readonly description?: string;
	readonly expected?: string;
	readonly received?: string | { readonly [key: string]: DataInvalidReport; };
};

export type ValidationReport<T = unknown> = DataValidReport<T> | DataInvalidReport;

export type SchemaFunction<T = unknown> = (input: unknown) => ValidationReport<T>;

export type Schema<T = any> = SchemaKeyword<T> | SchemaFunction<T>;

export type Infer<S extends Schema> =
	S extends keyof PrimitiveMap ? PrimitiveMap[S] :
	S extends Schema<infer T> ? IfAny<T, unknown, T> :
	never;

const nameRegistry = new WeakMap<SchemaFunction, string>();

export function registerSchemaName<T extends SchemaFunction>(name: string, schema: T): T {
	nameRegistry.set(schema, name);
	return schema;
}

export function formatSchema(schema: Schema): string {
	if (typeof schema === "function") {
		return nameRegistry.get(schema) ?? `Unnamed schema`;
	}

	return schema;
}

export function formatValue(value: unknown): string {
	switch (typeof value) {
		case "undefined": return "undefined";
		case "string": return `"${value}"`;
		case "bigint": return `${value}n`;
		case "object": return value?.constructor.name ?? "null";
		case "function": return value.name || "Function";
	}

	return value!.toString();
}

function parseSafe<S extends Schema>(schema: S, input: unknown): ValidationReport<Infer<S>> {
	const validReport = {
		valid: true,
		data: input as Infer<S>,
	} as const;

	if (typeof schema === "function") {
		return schema(input);
	}

	if (schema === "unknown") {
		return validReport;
	}

	if (schema === "null") {
		return input === null ? validReport : {
			valid: false,
			expected: "null",
			received: formatValue(input),
		};
	}

	if (primitives.has(schema)) {
		return typeof input === schema ? validReport : {
			valid: false,
			expected: formatSchema(schema),
			received: formatValue(input),
		};
	}

	throw new TypeError(`Invalid schema: ${formatSchema(schema)}`);
}

function parsePredicate<S extends Schema>(schema: S, input: unknown): input is Infer<S> {
	return parseSafe(schema, input).valid;
}

export class ValidationError extends Error {
	readonly schema: Schema;
	readonly input: unknown;
	readonly report: DataInvalidReport;

	constructor(schema: Schema, input: unknown, report: DataInvalidReport) {
		super();
		this.name = "SchemaError";
		this.schema = schema;
		this.input = input;
		this.report = report;
	}
}

export function parse<S extends Schema>(schema: S, input: unknown): Infer<S> {
	const report = parseSafe(schema, input);

	if (!report.valid) {
		throw new ValidationError(schema, input, report);
	}

	return report.data;
}

parse.safe = parseSafe;
parse.is = parsePredicate;
