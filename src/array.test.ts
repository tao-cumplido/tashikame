import assert from "node:assert/strict";
import test from "node:test";

import { expectTypeOf } from "expect-type";

import { array } from "./array.js";
import { parse, type Infer } from "./core.js";

test.describe("array", () => {
	test.describe("valid", () => {
		test("empty", () => {
			const report = parse.safe(array("unknown"), []);
			assert(report.valid);
			expectTypeOf(report.data).toEqualTypeOf<unknown[]>();
		});

		test("non-empty", () => {
			const report = parse.safe(array("unknown"), [ 0, "", {}, ]);
			assert(report.valid);
			expectTypeOf(report.data).toEqualTypeOf<unknown[]>();
		});

		test("infer readonly", () => {
			const schema = array("unknown", { inferReadonly: true, });
			expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<readonly unknown[]>();
		});
	});

	test.describe("invalid", () => {
		test("non-array", () => {
			const report = parse.safe(array("unknown"), 0);
			assert(!report.valid);
			assert(report.expected === "Array<unknown>");
			assert(report.received === "0");
		});

		test("item mismatch", () => {
			const report = parse.safe(array("string"), [ "", 0, ]);
			assert(!report.valid);
			assert(report.expected === "Array<string>");
			assert(typeof report.received === "object");
			assert("1" in report.received);
			assert(report.received[1].expected === "string");
			assert(report.received[1].received === "0");
		});
	});
});
