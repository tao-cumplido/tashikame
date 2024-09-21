import assert from "node:assert/strict";
import test from "node:test";

import { parse } from "./core.js";
import { object } from "./object.js";

test.describe("object", () => {
	test.describe("valid", () => {
		test("simple shape", () => {
			const schema = object({
				a: "string",
				b: "number",
			});

			assert(parse.safe(schema, { a: "", b:  0, }).valid);
		});

		test("optional property", () => {
			const schema = object({
				a: "string",
				b: {
					value: "number",
					optional: true,
				},
			});

			assert(parse.safe(schema, { a: "", }).valid);
		});

		test("any additional property", () => {
			const schema = object({
				a: "number",
			}, {
				additionalProperties: true,
			});

			assert(parse.safe(schema, { a: 0, b: "", c: [], }).valid);
		});

		test("specific additional property", () => {
			const schema = object({
				a: "string",
			}, {
				additionalProperties: "number",
			});

			assert(parse.safe(schema, { a: "", b: 0, }).valid);
		});
	});

	test.describe("invalid", () => {
		test("simple shape", () => {
			const schema = object({
				a: "string",
				b: "number",
			});

			assert(!parse.safe(schema, { a: 0, b:  "", }).valid);
		});

		test("missing property", () => {
			const schema = object({
				a: "string",
				b: "number",
			});

			assert(!parse.safe(schema, { a: "", }).valid);
		});

		test("excess property", () => {
			const schema = object({
				a: "string",
			});

			assert(!parse.safe(schema, { a: "", b: 0, }).valid);
		});

		test("explicit undefined for optional property", () => {
			const schema = object({
				a: {
					value: "string",
					optional: true,
				},
			});

			assert(!parse.safe(schema, { a: undefined, }).valid);
		});
	});
});
