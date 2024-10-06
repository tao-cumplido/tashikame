import assert from "node:assert/strict";
import test from "node:test";

import { expectTypeOf } from "expect-type";

import { parse, type Infer } from "./core.js";
import { object, record } from "./object.js";

test.describe("object", () => {
	test.describe("valid", () => {
		test("simple shape", () => {
			const schema = object({
				a: "string",
				b: "number",
			});

			const report = parse.safe(schema, { a: "", b:  0, });

			assert(report.valid);
			expectTypeOf(report.data).toEqualTypeOf<{ a: string; b: number; }>;
		});

		test("optional property", () => {
			const schema = object({
				a: "string",
				b: {
					value: "number",
					optional: true,
				},
			});

			const report = parse.safe(schema, { a: "", });

			assert(report.valid);
			expectTypeOf(report.data).toEqualTypeOf<{ a: string; b?: number; }>();
		});

		test("any additional property", () => {
			const schema = object({
				a: "number",
			}, {
				additionalProperties: true,
			});

			const report = parse.safe(schema, { a: 0, b: "", c: [], });

			assert(report.valid);
			expectTypeOf(report.data).toEqualTypeOf<{ [key: string]: unknown; a: number; }>();
		});

		test("specific additional property", () => {
			const schema = object({
				a: "string",
			}, {
				additionalProperties: "number",
			});

			const report = parse.safe(schema, { a: "", b: 0, });

			assert(report.valid);
			expectTypeOf(report.data).toMatchTypeOf<Record<string, number> & { a: string; }>();
		});

		test("infer readonly", () => {
			const objectSchema = object({
				a: {
					value: "number",
					inferReadonly: true,
				},
			}, {
				additionalProperties: {
					inferReadonly: true,
				},
			});

			expectTypeOf<Infer<typeof objectSchema>>().toEqualTypeOf<{ readonly [key: string]: unknown; readonly a: number; }>();
		});

		const recordSchema = record("number", { inferReadonly: true, });

		expectTypeOf<Infer<typeof recordSchema>>().toEqualTypeOf<{ readonly [key: string]: number; }>();
	});

	test.describe("invalid", () => {
		test("no object", () => {
			const schema = object({ a: "number", });
			const report = parse.safe(schema, 0);

			assert(!report.valid);
			assert(report.expected === "{ a: number }");
			assert(report.received === "0");
		});

		test("simple shape", () => {
			const schema = object({
				a: "string",
				b: "number",
			});

			const report = parse.safe(schema, { a: 0, b:  "", });

			assert(!report.valid);
			assert(report.expected === "{ a: string, b: number }");
			assert(typeof report.received === "object");
			assert("a" in report.received);
			assert(report.received.a.expected === "string");
			assert(report.received.a.received === "0");
		});

		test("missing property", () => {
			const schema = object({
				a: "string",
				b: "number",
			});

			const report = parse.safe(schema, { a: "", });

			assert(!report.valid);
			assert(report.expected === "{ a: string, b: number }");
			assert(typeof report.received === "object");
			assert("b" in report.received);
			assert(report.received.b.expected === "number");
			assert(report.received.b.received === "undefined");
		});

		test("excess property", () => {
			const schema = object({
				a: "string",
			});

			const report = parse.safe(schema, { a: "", b: 0, c: 1, });

			assert(!report.valid);
			assert(report.expected === "{ a: string }");
			assert(typeof report.received === "object");
			assert("b" in report.received);
			assert(report.received.b.received === "0");
			assert("c" in report.received);
			assert(report.received.c.received === "1");
		});

		test("additional property", () => {
			const schema = object({
				a: "number",
			}, {
				additionalProperties: "string",
			});

			const report = parse.safe(schema, { a: 0, b: 0, });

			assert(!report.valid);
			assert(report.expected === "{ [string]: string, a: number }");
			assert(typeof report.received === "object");
			assert("b" in report.received);
			assert(report.received.b.expected === "string");
			assert(report.received.b.received === "0");
		});

		test("explicit undefined for optional property", () => {
			const schema = object({
				a: {
					value: "string",
					optional: true,
				},
			});

			const report = parse.safe(schema, { a: undefined, });

			assert(!report.valid);
			assert(report.expected === "{ a?: string }");
			assert(typeof report.received === "object");
			assert("a" in report.received);
			assert(report.received.a.expected === "string");
			assert(report.received.a.received === "undefined");
		});
	});
});
