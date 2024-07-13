import type { Simplify } from "type-fest";

import { formatSchema, formatValue, registerSchemaName, parse, type Infer, type Schema } from "./core.js";

export type ObjectSchemaProperty = {
	readonly value: Schema;
	readonly optional?: boolean;
	readonly inferReadonly?: boolean;
};

export type AdditionalPropertiesConfig = Simplify<Partial<Omit<ObjectSchemaProperty, 'optional'>>>;

export type ObjectSchemaConfig = {
	readonly name?: string;
	readonly additionalProperties?: boolean | Schema | AdditionalPropertiesConfig;
};

type TypePick<T, S> = Pick<T, { [P in keyof T]: T[P] extends S ? P : never }[keyof T]>;

type Properties = Readonly<Record<string, Schema | ObjectSchemaProperty>>;

type InferMap<T extends Properties> = {
	[P in keyof T]:
		T[P] extends Schema ? Infer<T[P]> :
		T[P] extends ObjectSchemaProperty ? Infer<T[P]['value']> :
		never;
};

type PropertyMap<T extends Properties> =
	Readonly<InferMap<TypePick<T, { inferReadonly: true, optional?: false }>>> &
	Partial<Readonly<InferMap<TypePick<T, { optional: true, inferReadonly: true }>>>> &
	InferMap<TypePick<T, Schema | { value: Schema, optional?: false, inferReadonly?: false }>> &
	Partial<InferMap<TypePick<T, { optional: true, inferReadonly?: false }>>>;

type InferAdditionalProperties<Config extends ObjectSchemaConfig> =
	Config['additionalProperties'] extends { value: Schema, inferReadonly: true } ? Readonly<Record<string, Infer<Config['additionalProperties']['value']>>> :
	Config['additionalProperties'] extends { inferReadonly: true } ? Readonly<Record<string, unknown>> :
	Config['additionalProperties'] extends { value: Schema } ? Record<string, Infer<Config['additionalProperties']['value']>> :
	Config['additionalProperties'] extends Schema ? Record<string, Infer<Config['additionalProperties']>> :
	Config['additionalProperties'] extends true | { inferReadonly: false } ? Record<string, unknown> :
	{}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function getAdditionalPropertiesSchema(config?: ObjectSchemaConfig) {
	if (!config?.additionalProperties) {
		return;
	}

	if (config.additionalProperties === true) {
		return 'unknown';
	}

	if (typeof config.additionalProperties === 'object') {
		return config.additionalProperties.value ?? 'unknown';
	}

	return config.additionalProperties;
}

export function object<
	PropertySchema extends Properties,
	Config extends ObjectSchemaConfig
>(properties: PropertySchema, config?: Config): Schema<
	{} extends PropertySchema ? InferAdditionalProperties<Config> :
	Simplify<PropertyMap<PropertySchema> & InferAdditionalProperties<Config>>
> {
	return registerSchemaName(config?.name ?? 'Object', (input, reports): input is any => {
		if (!isRecord(input)) {
			reports?.push({
				valid: false,
				issue: `Input isn't object`,
				received: formatValue(input),
			});

			return false;
		}

		const schemaKeys = new Set(Object.keys(properties));
		const inputKeys = new Set(Object.keys(input));
		const additionalKeys = new Set([...inputKeys].filter((key) => !schemaKeys.has(key)));

		const additionalSchema = getAdditionalPropertiesSchema(config);

		if (!additionalSchema && additionalKeys.size > 0) {
			reports?.push({
				valid: false,
				issue: `Input has additional properties`,
				received: Object.fromEntries([...additionalKeys].map((key) => {
					return [key, formatValue(input[key])];
				})),
			});

			return false;
		}

		if (additionalSchema && additionalSchema !== 'unknown') {
			for (const key of additionalKeys) {
				const value = input[key];
				const valueReport = parse.safe(additionalSchema, value);

				if (!valueReport.valid) {
					reports?.push({
						valid: false,
						issue: `Additional property mismatch`,
						key,
						expected: formatSchema(additionalSchema),
						received: formatValue(value),
					});

					return false;
				}
			}
		}

		for (const key of schemaKeys) {
			const propertySchema = properties[key]!;

			if (!(key in input) && typeof propertySchema === 'object' && propertySchema.optional) {
				continue;
			}

			const value = input[key];

			const schema = typeof propertySchema === 'object' ? propertySchema.value : propertySchema;
			const valueReport = parse.safe(schema, value);

				if (!valueReport.valid) {
					reports?.push({
						valid: false,
						issue: `Property mismatch`,
						key,
						expected: formatSchema(schema),
						received: formatValue(value),
					});

					return false;
				}
		}

		return true;
	});
}

export type RecordSchemaConfig = {
	readonly inferReadonly?: boolean;
}

export function record<
	RecordSchema extends Schema,
	Config extends RecordSchemaConfig
>(schema: RecordSchema, config?: Config): Schema<
	InferAdditionalProperties<{ additionalProperties: Config & { value: RecordSchema }}>
> {
	return object({}, {
		name: `Record<${formatSchema(schema)}>`,
		additionalProperties: schema,
	}) as any;
}
