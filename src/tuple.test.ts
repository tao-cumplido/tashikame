import assert from 'node:assert/strict';
import test from 'node:test';

import { tuple, spread } from './tuple.js';
import { parse } from './core.js';
import { array } from './array.js';
import { union } from './union.js';

test.describe('tuple', () => {
	test.describe('valid', () => {
		test('empty', () => {
			const report = parse.safe(tuple([]), []);
			assert(report.valid);
		});

		test('non-empty', () => {
			const report = parse.safe(tuple(['unknown']), [0]);
			assert(report.valid);
		});

		test('single infinite spread', () => {
			const schema = tuple([spread(array('number'))]);

			assert(parse.safe(schema, []).valid);
			assert(parse.safe(schema, [0]).valid);
			assert(parse.safe(schema, [0, 0]).valid);
		});

		test('constant and infinite spread', () => {
			const schema = tuple([spread(array('number')), spread(tuple(['string', 'null']))]);

			assert(parse.safe(schema, ['', null]).valid);
			assert(parse.safe(schema, [0, '', null]).valid);
			assert(parse.safe(schema, [0, 0, '', null]).valid);
		});

		test('infinite and constant spread', () => {
			const schema = tuple([spread(tuple(['string', 'null'])), spread(array('number'))]);

			assert(parse.safe(schema, ['', null]).valid);
			assert(parse.safe(schema, ['', null, 0]).valid);
			assert(parse.safe(schema, ['', null, 0, 0]).valid);
		});
	});

	test.describe('invalid', () => {
		test('non-array', () => {
			const report = parse.safe(tuple([]), 0);
			assert(!report.valid);
			assert(report.parts?.length === 1);
		});

		test('empty input', () => {
			const report = parse.safe(tuple(['unknown']), []);
			assert(!report.valid);
		});

		test('empty schema', () => {
			const report = parse.safe(tuple([]), [0]);
			assert(!report.valid);
		});

		test('multiple infinites', () => {
			assert.throws(() =>
				// @ts-expect-error
				tuple([spread(array('number')), spread(array('string'))])
			);
		});

		// test('item mismatch', () => {
		// 	const report = parse.safe(array('string'), ['', 0]);
		// 	assert(!report.valid);
		// 	assert(report.parts?.length === 1);
		// 	assert(report.parts[0]?.index === 1);
		// });
	});

	test('edges', () => {
		const schema = tuple(['string', spread(array('number')), union(['number', 'null']), union(['number', 'string'])]);

		const case1 = parse.safe(schema, ['', 0, 0, null, 0]);
		const case2 = parse.safe(schema, ['', 0, 0, 0, null, 0]);
		const case3 = parse.safe(schema, ['', 0, 0, 0, 0]);
		const case4 = parse.safe(schema, ['', 0, '']);
		const case5 = parse.safe(schema, ['', null, 0]);
		const case6 = parse.safe(schema, ['', 0]);

		assert(case1.valid);
		assert(case2.valid);
		assert(case3.valid);
		assert(case4.valid);
		assert(case5.valid);
		assert(!case6.valid);
	});
});
