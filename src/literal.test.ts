import assert from 'node:assert/strict';
import test from 'node:test';

import { literal } from './literal.js';
import { parse } from './core.js';

test.describe('literal', () => {
	test('valid', () => {
		const report = parse.safe(literal(0), 0);
		assert(report.valid);
	});

	test('invalid', () => {
		const report = parse.safe(literal(0), 1);
		assert(!report.valid);
	});
});

