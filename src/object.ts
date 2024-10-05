import type { Simplify } from "type-fest";

import { formatSchema, formatValue, parse, registerSchemaName, type Infer, type Schema } from "./core.js";

export type ObjectSchemaProperty = {
	readonly value: Schema;
	readonly optional?: boolean;
	readonly inferReadonly?: boolean;
};

export type AdditionalPropertiesConfig = Simplify<Partial<Omit<ObjectSchemaProperty, "optional">>>;

export type ObjectPropertiesSchema = Readonly<Record<string, Schema | ObjectSchemaProperty>>;

export type ObjectSchemaConfig = {
	readonly name?: string;
	readonly additionalProperties?: boolean | Schema | AdditionalPropertiesConfig;
};

export type InferObject<S extends ObjectPropertiesSchema, C extends ObjectSchemaConfig> =
	{} extends S ? InferAdditionalProperties<C> :
	Simplify<PropertyMap<S> & InferAdditionalProperties<C>>;

type TypePick<T, S> = Pick<T, { [P in keyof T]: T[P] extends S ? P : never }[keyof T]>;

type InferMap<T extends ObjectPropertiesSchema> = {
	[P in keyof T]:
		T[P] extends Schema ? Infer<T[P]> :
		T[P] extends ObjectSchemaProperty ? Infer<T[P]["value"]> :
		never;
};

type PropertyMap<T extends ObjectPropertiesSchema> =
	Readonly<InferMap<TypePick<T, { inferReadonly: true; optional?: false; }>>> &
	Partial<Readonly<InferMap<TypePick<T, { optional: true; inferReadonly: true; }>>>> &
	InferMap<TypePick<T, Schema | { value: Schema; optional?: false; inferReadonly?: false; }>> &
	Partial<InferMap<TypePick<T, { optional: true; inferReadonly?: false; }>>>;

type InferAdditionalProperties<Config extends ObjectSchemaConfig> =
	Config["additionalProperties"] extends { value: Schema; inferReadonly: true; } ? Readonly<Record<string, Infer<Config["additionalProperties"]["value"]>>> :
	Config["additionalProperties"] extends { inferReadonly: true; } ? Readonly<Record<string, unknown>> :
	Config["additionalProperties"] extends { value: Schema; } ? Record<string, Infer<Config["additionalProperties"]["value"]>> :
	Config["additionalProperties"] extends Schema ? Record<string, Infer<Config["additionalProperties"]>> :
	Config["additionalProperties"] extends true | { inferReadonly: false; } ? Record<string, unknown> :
	{};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function getAdditionalPropertiesSchema(config?: ObjectSchemaConfig) {
	if (!config?.additionalProperties) {
		return;
	}

	if (config.additionalProperties === true) {
		return "unknown";
	}

	if (typeof config.additionalProperties === "object") {
		return config.additionalProperties.value ?? "unknown";
	}

	return config.additionalProperties;
}

function format(properties: ObjectPropertiesSchema, config?: ObjectSchemaConfig) {
	const tokens: string[] = [];

	if (config?.additionalProperties) {
		const x = config.additionalProperties;
		const schema = typeof x === "object" ? x.value ?? "unknown" : x === true ? "unknown" : x;
		tokens.push(`[string]: ${formatSchema(schema)}`);
	}

	for (const [ key, schema, ] of Object.entries(properties)) {
		if (typeof schema === "object") {
			tokens.push(`${schema.optional ? `${key}?` : key}: ${formatSchema(schema.value)}`);
		} else {
			tokens.push(`${key}: ${formatSchema(schema)}`);
		}
	}

	return `{ ${tokens.join(", ")} }`;
}

export function object<
	PropertySchema extends ObjectPropertiesSchema,
	Config extends ObjectSchemaConfig
>(properties: PropertySchema, config?: Config): Schema<InferObject<PropertySchema, Config>> {
	const name = config?.name ?? format(properties, config);

	return registerSchemaName(name, (input) => {
		if (!isRecord(input)) {
			return {
				valid: false,
				description: `Input isn't object`,
				expected: name,
				received: formatValue(input),
			};
		}

		const schemaKeys = new Set(Object.keys(properties));
		const inputKeys = new Set(Object.keys(input));
		const additionalKeys = new Set([ ...inputKeys, ].filter((key) => !schemaKeys.has(key)));

		const additionalSchema = getAdditionalPropertiesSchema(config);

		if (!additionalSchema && additionalKeys.size > 0) {
			return {
				valid: false,
				description: `Input has unexpected additional properties`,
				expected: name,
				received: Object.fromEntries([ ...additionalKeys, ].map((key) => {
					return [
						key,
						{
							valid: false,
							description: `Unexpected property`,
							received: formatValue(input[key]),
						},
					];
				})),
			};
		}

		if (additionalSchema && additionalSchema !== "unknown") {
			for (const key of additionalKeys) {
				const value = input[key];
				const valueReport = parse.safe(additionalSchema, value);

				if (!valueReport.valid) {
					return {
						valid: false,
						description: `Additional property check failed`,
						expected: name,
						received: {
							[key]: valueReport,
						},
					};
				}
			}
		}

		for (const key of schemaKeys) {
			const propertySchema = properties[key]!;

			if (!(key in input) && typeof propertySchema === "object" && propertySchema.optional) {
				continue;
			}

			const value = input[key];

			const schema = typeof propertySchema === "object" ? propertySchema.value : propertySchema;
			const valueReport = parse.safe(schema, value);

				if (!valueReport.valid) {
					return {
						valid: false,
						description: `Property check failed`,
						expected: name,
						received: {
							[key]: valueReport,
						},
					};
				}
		}

		return {
			valid: true,
			data: input as InferObject<PropertySchema, Config>,
		};
	});
}

export type RecordSchemaConfig = {
	readonly inferReadonly?: boolean;
};

export type InferRecord<S extends Schema, C extends RecordSchemaConfig> = InferAdditionalProperties<{ additionalProperties: C & { value: S; }; }>;

export function record<
	RecordSchema extends Schema,
	Config extends RecordSchemaConfig
>(schema: RecordSchema, config?: Config): Schema<InferRecord<RecordSchema, Config>> {
	return object({}, {
		name: `Record<${formatSchema(schema)}>`,
		additionalProperties: schema as {},
	});
}
