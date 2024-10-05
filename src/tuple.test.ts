import assert from "node:assert/strict";
import test from "node:test";

import { array } from "./array.js";
import { parse } from "./core.js";
import { spread, tuple } from "./tuple.js";
import { union } from "./union.js";

test.describe("tuple", () => {
	test.describe("valid", () => {
		test("empty", () => {
			const report = parse.safe(tuple([]), []);
			assert(report.valid);
		});

		test("non-empty", () => {
			const report = parse.safe(tuple([ "unknown", ]), [ 0, ]);
			assert(report.valid);
		});

		test("single infinite spread", () => {
			const schema = tuple([ spread(array("number")), ]);

			assert(parse.safe(schema, []).valid);
			assert(parse.safe(schema, [ 0, ]).valid);
			assert(parse.safe(schema, [ 0, 0, ]).valid);
		});

		test("constant and infinite spread", () => {
			const schema = tuple([ spread(array("number")), spread(tuple([ "string", "null", ])), ]);

			assert(parse.safe(schema, [ "", null, ]).valid);
			assert(parse.safe(schema, [ 0, "", null, ]).valid);
			assert(parse.safe(schema, [ 0, 0, "", null, ]).valid);
		});

		test("infinite and constant spread", () => {
			const schema = tuple([ spread(tuple([ "string", "null", ])), spread(array("number")), ]);

			assert(parse.safe(schema, [ "", null, ]).valid);
			assert(parse.safe(schema, [ "", null, 0, ]).valid);
			assert(parse.safe(schema, [ "", null, 0, 0, ]).valid);
		});
	});

	test.describe("invalid", () => {
		test("non-array", () => {
			const report = parse.safe(tuple([]), 0);
			assert(!report.valid);
			assert(report.expected === "[]");
			assert(report.received === "0");
		});

		test("empty input", () => {
			const report = parse.safe(tuple([ "unknown", ]), []);
			assert(!report.valid);
			assert(report.expected === "n = 1");
			assert(report.received === "n = 0");
		});

		test("empty schema", () => {
			const report = parse.safe(tuple([]), [ 0, ]);
			assert(!report.valid);
		});

		test("invalid input", () => {
			const report = parse.safe(tuple([ "string", ]), [ 0, ]);
			assert(!report.valid);
			assert(report.expected === "[string]");
		});

		test("multiple infinites", () => {
			assert.throws(() =>
				// @ts-expect-error: types should prevent more than one spread of arbitrary length
				tuple([ spread(array("number")), spread(array("string")), ]),
			);
		});
	});

	test("edges", () => {
		const schema = tuple([ "string", spread(array("number")), union([ "number", "null", ]), union([ "number", "string", ]), ]);

		const case1 = parse.safe(schema, [ "", 0, 0, null, 0, ]);
		const case2 = parse.safe(schema, [ "", 0, 0, 0, null, 0, ]);
		const case3 = parse.safe(schema, [ "", 0, 0, 0, 0, ]);
		const case4 = parse.safe(schema, [ "", 0, "", ]);
		const case5 = parse.safe(schema, [ "", null, 0, ]);
		const case6 = parse.safe(schema, [ "", 0, ]);
		const case7 = parse.safe(schema, [ "", 0, 0, true, 0, ]);

		assert(case1.valid);
		assert(case2.valid);
		assert(case3.valid);
		assert(case4.valid);
		assert(case5.valid);

		assert(!case6.valid);
		assert(case6.expected === "3 <= n <= Infinity");
		assert(case6.received === "n = 2");

		assert(!case7.valid);
		assert(case7.expected === "[string, ...Array<number>, number | null, number | string]");
		assert(typeof case7.received === "object");
		assert("3" in case7.received);
		assert(case7.received[3].expected === "number | null");
		assert(case7.received[3].received === "true");
	});
});
