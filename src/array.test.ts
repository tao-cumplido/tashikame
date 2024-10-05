import assert from "node:assert/strict";
import test from "node:test";

import { array } from "./array.js";
import { parse } from "./core.js";

test.describe("array", () => {
	test.describe("valid", () => {
		test("empty", () => {
			const report = parse.safe(array("unknown"), []);
			assert(report.valid);
		});

		test("non-empty", () => {
			const report = parse.safe(array("unknown"), [ 0, "", {}, ]);
			assert(report.valid);
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
