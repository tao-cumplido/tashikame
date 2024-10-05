import assert from "node:assert/strict";
import test from "node:test";

import { parse, type Schema } from "./core.js";
import { lazy } from "./lazy.js";
import { object } from "./object.js";
import { union } from "./union.js";

type Tree = {
	node: number | Tree;
};

test("lazy", () => {
	const schema: Schema<Tree> = lazy(() => object({
		node: union([ "number", schema, ]),
	}));

	assert(parse.safe(schema, { node: 0, }).valid);
	assert(parse.safe(schema, { node: { node:  0, }, }).valid);
	assert(!parse.safe(schema, { node: {}, }).valid);
	assert(!parse.safe(schema, { node: { node: "", }, }).valid);
});
