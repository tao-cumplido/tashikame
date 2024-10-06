import assert from "node:assert/strict";
import test from "node:test";

import { expectTypeOf } from "expect-type";

import { formatSchema, formatValue, parse, registerSchemaName, type ValidationReport } from "./core.js";

test("schema registry", () => {
	const schema = (input: unknown): ValidationReport => ({ valid: true, data: input, });
	registerSchemaName("SchemaRegistryTest", schema);
	assert.equal(formatSchema(schema), "SchemaRegistryTest");
});

test.describe("formatValue", () => {
	test("undefined", () => {
		assert.equal(formatValue(undefined), "undefined");
	});

	test("string", () => {
		assert.equal(formatValue("test"), `"test"`);
	});

	test("bigint", () => {
		assert.equal(formatValue(1n), "1n");
	});

	test("object", () => {
		assert.equal(formatValue(null), "null");
		assert.equal(formatValue({}), "Object");
		assert.equal(formatValue([]), "Array");
		assert.equal(formatValue(new Set()), "Set");
	});

	test("function", () => {
		assert.equal(formatValue(function Test() {}), "Test");
		assert.equal(formatValue(() => {}), "Function");
	});

	test("number", () => {
		assert.equal(formatValue(1), "1");
	});

	test("boolean", () => {
		assert.equal(formatValue(true), "true");
	});

	test("symbol", () => {
		assert.equal(formatValue(Symbol("test")), "Symbol(test)");
	});
});

test.describe("parse", () => {
	test.describe("valid", () => {
		test("null", () => {
			const report = parse.safe("null", null);
			assert(report.valid);
			expectTypeOf(report.data).toEqualTypeOf<null>();
		});

		test("undefined", () => {
			const report = parse.safe("undefined", undefined);
			assert(report.valid);
			expectTypeOf(report.data).toEqualTypeOf<undefined>();
		});

		test("string", () => {
			const report = parse.safe("string", "");
			assert(report.valid);
			expectTypeOf(report.data).toEqualTypeOf<string>();
		});

		test("number", () => {
			const report = parse.safe("number", 0);
			assert(report.valid);
			expectTypeOf(report.data).toEqualTypeOf<number>();
		});

		test("bigint", () => {
			const report = parse.safe("bigint", 0n);
			assert(report.valid);
			expectTypeOf(report.data).toEqualTypeOf<bigint>();
		});

		test("boolean", () => {
			const report = parse.safe("boolean", true);
			assert(report.valid);
			expectTypeOf(report.data).toEqualTypeOf<boolean>();
		});

		test("symbol", () => {
			const report = parse.safe("symbol", Symbol.match);
			assert(report.valid);
			expectTypeOf(report.data).toEqualTypeOf<symbol>();
		});

		test("function", () => {
			const report = parse.safe("function", () => {});
			assert(report.valid);
			expectTypeOf(report.data).toEqualTypeOf<(...args: unknown[]) => unknown>();
		});

		test("unknown", () => {
			const report = parse.safe("unknown", 0);
			assert(report.valid);
			expectTypeOf(report.data).toEqualTypeOf<unknown>();
		});
	});

	test.describe("invalid", () => {
		test("null", () => {
			const report = parse.safe("null", 0);
			assert(!report.valid);
			assert.equal(report.expected, "null");
			assert.equal(report.received, "0");
		});

		test("undefined", () => {
			const report = parse.safe("undefined", 0);
			assert(!report.valid);
			assert.equal(report.expected, "undefined");
			assert.equal(report.received, "0");
		});

		test("string", () => {
			const report = parse.safe("string", 0);
			assert(!report.valid);
			assert.equal(report.expected, "string");
			assert.equal(report.received, "0");
		});

		test("object", () => {
			// @ts-expect-error: "object" is not a valid schema keyword
			assert.throws(() => parse.safe("object", {}));
		});
	});
});
