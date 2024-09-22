# tashikame

> Lightweight data validation for JavaScript and TypeScript

[![NPM Version][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/tashikame.svg
[npm-url]: https://npmjs.org/package/tashikame

Validata data against schemas at runtime and infer TypeScript types from schemas. Lightweight alternative to and inspired by Zod, Valibot and ArkType.

## Usage

Schemas are simply string keywords for primitives (and some other values) or type predicate functions for complex data. This means a function like `<T>(input: unknown) => input is T` already is a schema which makes it very easy to write custom schemas. `tashikame` ships with built-in schemas for the most common use cases.

### Schema keywords

`tashikame` recognizes the following strings as schema keywords:

- `unknown`
- `string`
- `number`
- `boolean`
- `bigint`
- `symbol`
- `null`
- `undefined`
- `function`

### Validating data

Input data is validated with the `parse` function. The function takes a schema as first argument, the input data as second argument and returns the input data or throws an error if it doesn't conform to the given schema.

> :warning: Input data is only validated and not copied, i.e. `parse` returns the input as is if it conforms to the given schema.

Additionally to the `parse` function there are also `parse.safe` which returns an instance of `SchemaReport` instead of throwing an error and `parse.is` which is a type predicate function.

### Feedback

`parse` throws with an instance of `SchemaError` when the given input doesn't match the schema. The error contains a detailed report of the issue. Currently built-in schemas stop validation at the first issue encountered.

### Constraints

The `pipe` function creates a wrapped schema with additional constraints.

```typescript
import { parse, pipe } from "tashikame";

// a number greater or equal to 0 and lower than 10
const schema = pipe("number", (n) => n >= 0, (n) => n < 10);

parse(schema, 11); // 💥
```

Constraint functions are only called when the input matches the wrapped schema.

### TypeScript

In TypeScript it is not necessary to write a type that matches a schema separately. Instead the type helper `Infer` can be used to produce a type from a schema. Some schemas can be configured to produce `readonly` variants by setting the `inferReadonly` option.

```typescript
import { array, type Infer } from "tashikame";

const schema = array("number", { inferReadonly: true });

type S = Infer<typeof schema>; // readonly number[]
```

The `readonly` flag is only considered at the type level and not actually checked at runtime.

> :warning: `Infer` automatically converts `any` types to `unknown`

### Recursive schemas

Self-referencing schemas can be created with the `lazy` function. It takes a getter function as argument that produces the actual schema which makes it possible to reference the created schema in itself. Recursive schema types cannot be inferred in TypeScript and have to be written separately.

```typescript
import { record, union, lazy, type Schema } from "tashikame";

type Tree = {
	[key: string]: number | Tree;
};

const treeSchema: Schema<Tree> = lazy(() => record(union(["number", treeSchema])));
```

### Literals and unions
Literal and union schemas can be created with the `literal` and `union` functions respectively. The `literal` function creates a schema for an exact value and is restricted to the same types as TypeScript literals, i.e. a value of type `string`, `number`, `bigint` or `boolean`. The `union` function takes an array of schemas and validates if the input matches one of the given schemas. `union` and `literal` can be combined to match against a list of allowed values.

### Arrays and tuples

Array schemas are created with the `array` function which takes a schema as argument to match items against.

Tuple schemas can be created with the `tuple` function which takes an array of schemas for each item position. Item schemas can additionally be a schema created with the special `spread` function which wraps a spreadable schema, i.e. an array schema or another tuple schema. Spreadables in tuple schemas have the same restrictions as spreadables in tuple types in TypeScript, that is only one item schema can be a spreadable of arbitrary length.

```typescript
import { array, tuple, type Infer } from "tashikame";
import { spread } from "tashikame/tuple";

const schema = tuple([spread(array("number")), "string"]);

type S = Infer<typeof schema>; // [...number[], string]
```

Both `array` and `tuple` can take a second argument of the type `{ inferReadonly: boolean }` for inferring a readonly array in TypeScript. Addtional constraints like array length can be imposed with the `pipe` function.

### Objects and records
Object schemas are created with the `object` function. It takes as first argument an object that describes the shape of the object by providing a schema for each property. Instead of only a schema a property can be described by the `ObjectSchemaProperty` type. The `object` function can additionally take a second argument of the type `ObjectSchemaConfig`.

```typescript
type ObjectSchemaPropert = {
	value: Schema;
	optional?: boolean;
	inferReadonly?: boolean;
}

type ObjectSchemaConfig = {
	name?: string;
	additionalProperties?: boolean | Schema | { value?: Schema; inferReadonly?: boolean };
}
```

The `name` option in `ObjectSchemaConfig` controls what to display in `SchemaReport`s and defaults to `Object`. The `additionalProperties` option configures whether unspecified keys are allowed and if the should conform to a schema. If the option is set to `true` additional properties are inferred as type `unknown`. Currently it's not possible to validate properties with `symbol` keys.

Record schemas are created with the `record` function. It is simply a shorthand for `object({}, { additionalProperties: schema })`.
