import assert from "node:assert/strict";
import test from "node:test";

import { expectTypeOf } from "expect-type";

import { parse, type Infer } from "./core.js";
import { union } from "./union.js";

test.describe("union", () => {
	test.describe("valid", () => {
		test("string | number", () => {
			const schema = union([ "string", "number", ]);
			expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<string | number>();
			assert(parse.safe(schema, "").valid);
			assert(parse.safe(schema, 0).valid);
		});
	});

	test.describe("invalid", () => {
		test("string | number", () => {
			const schema = union([ "string", "number", ]);
			const report = parse.safe(schema, {});
			assert(!report.valid);
			assert(report.expected === "string | number");
			assert(report.received === "Object");
		});
	});
});
