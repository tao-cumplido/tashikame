import assert from 'node:assert/strict';
import test from 'node:test';

import { pipe } from './pipe.js';
import { parse } from './core.js';

test.describe('pipe', () => {
	test('no constraints', () => {
		const schema = pipe('string');
		assert(parse.safe(schema, '').valid);
		assert(!parse.safe(schema, 0).valid);
	});

	test('single constraint', () => {
		const schema = pipe('string', (value) => value.length > 0);
		assert(parse.safe(schema, '0').valid);
		assert(!parse.safe(schema, '').valid);
	});

	test('multiple constraints', () => {
		const schema = pipe('number', (value) => value >= 0, (value) => value < 2);
		assert(parse.safe(schema, 0).valid);
		assert(parse.safe(schema, 1).valid);
		assert(!parse.safe(schema, -1).valid);
		assert(!parse.safe(schema, 2).valid);
	});
});
