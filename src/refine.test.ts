import assert from "node:assert/strict";
import test from "node:test";

import { parse } from "./core.js";
import { refine } from "./refine.js";

test.describe("refine", () => {
	test("no constraints", () => {
		// @ts-expect-error: types should prevent call without constraints
		assert.throws(() => refine("string"));
		// @ts-expect-error: types should prevent call with empty named constraints
		assert.throws(() => refine("string", {}));
	});

	test("single constraint", () => {
		const schema = refine("string", (value) => value.length > 0);
		assert(parse.safe(schema, "0").valid === true);
		assert(parse.safe(schema, "").valid === false);
	});

	test("multiple constraints", () => {
		const schema = refine("number", (value) => value >= 0, (value) => value < 2);
		assert(parse.safe(schema, 0).valid === true);
		assert(parse.safe(schema, 1).valid === true);
		assert(parse.safe(schema, -1).valid === false);
		assert(parse.safe(schema, 2).valid === false);
	});

	test("named constraints", () => {
		const schema = refine("number", { int: Number.isInteger, });
		const report = parse.safe(schema, 0.1);
		assert(!report.valid);
		assert(report.expected === `number with constraint "int"`);
		assert(report.received === "0.1");
	});
});
