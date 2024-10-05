# tashikame
> Lightweight data validation for JavaScript and TypeScript

[![NPM Version][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/tashikame.svg
[npm-url]: https://npmjs.org/package/tashikame

Validata data against schemas at runtime and infer TypeScript types from schemas. Lightweight alternative to and inspired by Zod, Valibot and ArkType.

## Usage
Schemas are simply string keywords for primitives (and some other values) or functions for complex data. Schema functions return a validation report (see [Feedback](#feedback)). `tashikame` ships with built-in schemas for the most common use cases.

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

> :warning: Input data is only validated and not cloned, i.e. `parse` returns the input as is if it conforms to the given schema.

Additionally to the `parse` function there are also `parse.safe` which returns a `ValidationReport` instead of throwing an error and `parse.is` which is a type predicate function.

### Feedback
`parse.safe` returns a `ValidationReport` which can be one of two shapes:

```typescript
type DataValidReport<T> = {
	valid: true;
	data: T;
};

type DataInvalidReport = {
	valid: false;
	description?: string;
	expected?: string;
	received?: string | Record<string, DataInvalidReport>;
}

type ValidationReport<T> =  DataValidReport<T> | DataInvalidReport;
```

`parse` throws with an instance of `ValidationError` when the given input doesn't match the schema. The error contains a detailed `DataInvalidReport` of the issue. Currently built-in schemas stop validation at the first issue encountered.

### TypeScript
In TypeScript it is not necessary to write a type that matches a schema separately. Instead the type helper `Infer` can be used to produce a type from a schema. Some schemas can be configured to produce `readonly` variants by setting the `inferReadonly` option.

```typescript
import { array, type Infer } from "tashikame";

const schema = array("number", { inferReadonly: true });

type S = Infer<typeof schema>; // readonly number[]
```

The `readonly` flag is only considered at the type level and not actually checked at runtime.

> [!NOTE]
> `Infer` automatically converts `any` types to `unknown`

### Custom schemas
Custom schemas are simply functions that return a `ValidationReport`. TypeScript inference works by providing the generic type argument for the `data` property when the input is valid.

The `tashikame/core` entry point provides a few utilities for writing custom schemas (it's not mandatory to use them though). See [`tashikame/core`](#tashikamecore) in the API section for details.

- `registerSchemaName`  
A function that registers a name for a given schema function that is used in `ValidationReport`s.

- `formatSchema`  
Retrieves the registered name for a given schema.

- `formatValue`  
Generates a string represantion of an input value.

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

Both `array` and `tuple` can take a second argument of the type `{ inferReadonly: boolean }` for inferring a readonly array in TypeScript. Addtional constraints like array length can be imposed with the `refine` function (see [Refining schemas](#refining-schemas)).

### Objects and records
Object schemas are created with the `object` function. It takes as first argument an object that describes the shape of the object by providing a schema for each property. Instead of only a schema a property can be described by the `ObjectSchemaProperty` type. The `object` function can additionally take a second argument of the type `ObjectSchemaConfig`.

```typescript
type ObjectSchemaProperty = {
	value: Schema;
	optional?: boolean;
	inferReadonly?: boolean;
}

type ObjectSchemaConfig = {
	name?: string;
	additionalProperties?: boolean | Schema | { value?: Schema; inferReadonly?: boolean };
}
```

When optional properties are used with TypeScript it is recommended to enable the `exactOptionalPropertyTypes` setting in `tsconfig.json` as that's how optional properties are treated in `tashikame`.

The `name` option in `ObjectSchemaConfig` controls what to display in `ValidationReport`s and defaults to a formatted representation of the property schemas. The `additionalProperties` option configures whether unspecified keys are allowed and if they should conform to a schema. If the option is set to `true` additional properties are inferred as type `unknown`. Currently it's not possible to validate properties with `symbol` keys.

Record schemas are created with the `record` function. It is simply a shorthand for `object({}, { additionalProperties: schema })`. In contrast to how TypeScript's `Record` is defined, the `record` function only uses a schema for the values and expects all keys to be strings.

### Refining schemas
The `refine` function creates a wrapped schema with additional constraints.

```typescript
import { parse, refine } from "tashikame";

// a number greater or equal to 0 and lower than 10
const schema = refine("number", (n) => n >= 0, (n) => n < 10);

parse(schema, 11); // 💥
```

Alternatively, the constraints can be given as an object, with the property names providing additional information for the `ValidationReport`.

```typescript
import { parse, refine } from "tashikame";

const schema = refine("number", { Int: Number.isInteger });

console.log(parse.safe(schema, 0.1).expected); // number with constraint "Int"
```

Constraint functions are only called when the input matches the wrapped schema.

## API
`tashikame` is very modular and provides several entry points. The most common functions and types are also exported from the top-level package. The overview below only lists the identifiers exported by each entry point and which are also exported from the top-level package. For details see the respective sources.

### `tashikame/core`
```typescript
// also exported from "tashikame"
export type SchemaKeyword<T>;
export type SchemaFunction<T>;
export type Schema<T>;
export type DataValidReport<T>;
export type DataInvalidReport;
export type ValidationReport<T>;
export type Infer<S extends Schema>;

export class ValidationError;

export function parse<S extends Schema>(schema: S, input: unknown): Infer<S>;
parse.safe = function <S extends Schema>(schema: S, input: unknown): ValidationReport<Infer<S>>;
parse.is = function <S extends Schema>(schema: S, input: unknown): input is Infer<S>;

// only exported from "tashikame/core"
export function registerSchemaName<T extends SchemaFunction>(name: string, schema: T): T;
export function formatSchema(schema: Schema): string;
export function formatValue(value: unknown): string;
```

### `tashikame/lazy`
```typescript
// also exported from "tashikame"
export function lazy<LazySchema extends Schema>(getSchema: () => LazySchema): SchemaFunction<Infer<LazySchema>>;
```

### `tashikame/literal`
```typescript
// also exported from "tashikame"
export type Literal;
export function literal<T extends Literal>(value: T): SchemaFunction<T>;
```

### `tashikame/union`
```typescript
// also exported from "tashikame"
export function union<UnionSchema extends readonly [Schema, ...Schema[]]>(schema: UnionSchema): SchemaFunction<InferUnion<UnionSchema>>;

// only exported from "tashikame/union"
export type InferUnion<S extends readonly Schema[]>;
```

### `tashikame/iterable`
```typescript
// only exported from "tashikame/iterable"
export type IterableSchema<T extends Iterable<unknown>>;
export function makeIterable<T extends Iterable<unknown>>(size: number, schema: SchemaFunction<T>): IterableSchema<T>;
```

### `tashikame/array`
```typescript
// also exported from "tashikame"
export type ArraySchemaConfig;
export function array<
	ItemSchema extends Schema,
	Config extends ArraySchemaConfig
>(schema: ItemSchema, config?: Config): IterableSchema<InferArray<ItemSchema, Config>>;

// only exported from "tashikame/array"
export type InferArray<ItemSchema extends Schema, Config extends ArraySchemaConfig>;
```

### `tashikame/tuple`
```typescript
// also exported from "tashikame"
export type TupleSchemaConfig;
export function tuple<
	const TupleSchema extends TupleSchemaBase,
	const Config extends TupleSchemaConfig
>(schema: TupleSchema, config?: Config): IterableSchema<InferTuple<TupleSchema, Config>>;

// only exported from "tashikame/tuple"
export type SpreadableSchema<T extends readonly unknown[]>;
export type TupleSchemaBase = ReadonlyArray<Schema | SpreadableSchema>;
export type InferTuple<TupleSchema extends TupleSchemaBase, Config extends TupleSchemaConfig>;
export function spread<SpreadSchema extends IterableSchema<readonly unknown[]>>(schema: SpreadSchema): SpreadableSchema<Infer<SpreadSchema>>;
```

### `tashikame/object`
```typescript
// also exported from "tashikame"
export type ObjectSchemaProperty;
export type AdditionalPropertiesConfig;
export type ObjectPropertiesSchema;
export type ObjectSchemaConfig;
export function object<
	PropertySchema extends ObjectPropertiesSchema,
	Config extends ObjectSchemaConfig
>(properties: PropertySchema, config?: Config): Schema<InferObject<PropertySchema, Config>>;

export type RecordSchemaConfig;
export function record<
	RecordSchema extends Schema,
	Config extends RecordSchemaConfig
>(schema: RecordSchema, config?: Config): Schema<InferRecord<RecordSchema, Config>>;

// only exported from "tashikame/object"
export type InferObject<S extends ObjectPropertiesSchema, C extends ObjectSchemaConfig>;
export type InferRecord<S extends Schema, C extends RecordSchemaConfig>;
```

### `tashikame/refine`
```typescript
// also exported from "tashikame"
export function refine<S extends Schema>(schema: S, ...constraints: ConstraintsArray<S>): SchemaFunction<Infer<S>>;
export function refine<S extends Schema>(schema: S, constraints: NamedConstraints<S>): SchemaFunction<Infer<S>>;

// only exported from "tashikame/refine"
export type Constraint<S extends Schema>;
export type ConstraintsArray<S extends Schema>;
export type NamedConstraints<S extends Schema>;
```
