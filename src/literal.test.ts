import assert from "node:assert/strict";
import test from "node:test";

import { expectTypeOf } from "expect-type";

import { parse } from "./core.js";
import { literal } from "./literal.js";

test.describe("literal", () => {
	test("valid", () => {
		const report = parse.safe(literal(0), 0);
		assert(report.valid);
		expectTypeOf(report.data).toEqualTypeOf<0>();
	});

	test("invalid", () => {
		const report = parse.safe(literal(0), 1);
		assert(!report.valid);
		assert(report.expected === "Literal<0>");
		assert(report.received === "1");
	});
});

