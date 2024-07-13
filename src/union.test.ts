import assert from 'node:assert/strict';
import test from 'node:test';

import { parse } from './core.js';
import { union } from './union.js';

test.describe('union', () => {
	test.describe('valid', () => {
		test('string | number', () => {
			const schema = union(['string', 'number']);
			assert(parse.safe(schema, '').valid);
			assert(parse.safe(schema, 0).valid);
		});
	});

	test.describe('invalid', () => {
		test('string | number', () => {
			const schema = union(['string', 'number']);
			assert(!parse.safe(schema, {}).valid);
		});
	});
});
