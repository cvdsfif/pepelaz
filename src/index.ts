export class NotNull { }
export const notNull = new NotNull();

export abstract class DataField<T> {
    readonly defaultIfNull: () => T | null | NotNull;

    constructor(
        defaultValueOrFunction: T | null | NotNull | (() => T | null | NotNull) = null
    ) {
        if (typeof defaultValueOrFunction === "function") this.defaultIfNull = (defaultValueOrFunction as () => T | null | NotNull);
        else this.defaultIfNull = () => defaultValueOrFunction;
    };

    abstract convert(field: any, level: string): T;

    unmarshal(field: any, level = ""): T | null {
        if (!field && field !== false && field !== 0) {
            const din = this.defaultIfNull();
            if (din instanceof NotNull) throw new Error(`Null value is not allowed for the field ${level}`);
            return (din as (T | null));
        }
        return this.convert(field, level);
    }
};
class IntegerField extends DataField<number>{ convert = (field: any): number => parseInt(field); };
export const integerField = (defaultIfNull: number | null | NotNull | (() => number) = null) => new IntegerField(defaultIfNull);
class FloatField extends DataField<number>{ convert = (field: any): number => parseFloat(field); };
export const floatField = (defaultIfNull: number | null | NotNull | (() => number) = null) => new FloatField(defaultIfNull);
export class BigIntField extends DataField<bigint>{ convert = (field: any): bigint => BigInt(`${field}`.replace(/(^-?\d+)(.*)/, "$1")); };
export const bigIntField = (defaultIfNull: bigint | null | NotNull | (() => bigint) = null) => new BigIntField(defaultIfNull);
class StringField extends DataField<string>{ convert = (field: any): string => `${field}`; };
export const stringField = (defaultIfNull: string | null | NotNull | (() => string) = null) => new StringField(defaultIfNull);

export const DATE_EXPECTING_NOW = new Date(0);
export class DateField extends DataField<Date>{ convert = (field: any): Date => field === "now" ? DATE_EXPECTING_NOW : new Date(field); };
export const dateField = (defaultIfNull: Date | null | NotNull | (() => Date) = null) => new DateField(defaultIfNull);

class BooleanField extends DataField<boolean>{ convert = (field: any): boolean => Boolean(field).valueOf(); };
export const booleanField = (defaultIfNull: boolean | null | NotNull | (() => boolean) = null) => new BooleanField(defaultIfNull);
export class VoidField extends DataField<void>{ convert = (field: void) => { } }
export const voidField = () => new VoidField();
class JsonField extends DataField<Object>{
    convert = (field: string | Object): Object =>
        typeof field === "string" ?
            JSON.parse(field as string) :
            field;
};
export const jsonField = (defaultIfNull: boolean | null | NotNull | (() => Object) = null) => new JsonField(defaultIfNull);

class FieldArray<T> extends DataField<(T | null)[]>{
    readonly members: DataField<T>;

    constructor(members: DataField<T>, defaultValueOrFunction: ((T | null)[] | null | NotNull) = null) {
        super(defaultValueOrFunction);
        this.members = members;
    }

    convert(field: any[], level = ""): (T | null)[] {
        return new Array(...field).map((element, index) => this.members.unmarshal(element, `::${level}::${index}`));
    }
};
export const fieldArray = <T>(member: DataField<T>, defaultIfNull: ((T | null)[] | null | NotNull | (() => (T | null))) = null) =>
    new FieldArray(member, defaultIfNull);

export const stringifyWithBigints = (value: any) => {
    (BigInt.prototype as any).toJSON = function () { return this?.toString(); }
    return JSON.stringify(value);
}

export type FieldType<T> = T extends DataField<infer R> ? R : T;
export type DbRecord<T> = T extends FieldObject<infer S> ? DbRecord<S> : {
    [P in keyof T]?: FieldType<T[P]> | null;
}
export type InputWithStringsAllowed<T> =
    T extends FieldArray<infer Z> ? InputWithStringsAllowed<Z>[] :
    T extends DateField ? Date | string | null :
    T extends FieldObject<infer S> ?
    InputWithStringsAllowed<S> :
    T extends DataField<infer R> ? R : {
        [P in keyof T]?: InputWithStringsAllowed<T[P]> | null;
    }

export type FieldObjectDefinition = {
    [P in any]: DataField<any>;
}
export class FieldObject<T extends FieldObjectDefinition> extends DataField<DbRecord<T>>{
    readonly definition: T;

    constructor(definition: T, defaultValueOrFunction: null | NotNull | T = null) {
        super(defaultValueOrFunction);
        this.definition = definition;
    }

    convert(record: any, level = ""): DbRecord<T> {
        return Object.keys(this.definition).reduce((accumulator, key) => {
            const matchingField =
                record[key] !== undefined ? record[key] :
                    record[key.toLowerCase()] !== undefined ? record[key.toLowerCase()] :
                        record[convertUppercaseIntoUnderscored(key)];
            if (matchingField !== undefined || this.definition[key].defaultIfNull() !== null) {
                const unmarshalledValue = this.definition[key].unmarshal(matchingField, `::${level}::${key}`);
                (accumulator as any)[key] = unmarshalledValue;
            }
            return accumulator;
        }, new Object() as DbRecord<T>);
    }
}
export const fieldObject = <T extends FieldObjectDefinition>(definition: T, defaultValueOrFunction: null | NotNull | T = null) =>
    new FieldObject(definition, defaultValueOrFunction);

const convertUppercaseIntoUnderscored = (s: String) => s.replace(/[A-Z]/g, match => `_${match.toLowerCase()}`);

export const unmarshal = (template: DataField<any> | FieldObjectDefinition, field: any) => {
    if (template instanceof DataField)
        return (template as DataField<any>).unmarshal(field);
    return fieldObject(template).unmarshal(field);
}

export type ApiDefinition = {
    [P: string]: { arg: DataField<any>, ret: DataField<any> }
}
export type ApiInterface<T extends ApiDefinition> = {
    [P in keyof T]: T[P]["arg"] extends DataField<infer S> ? T[P]["ret"] extends DataField<infer R> ? (arg: S) => R : never : never;
}
export type ApiAsyncInterface<T extends ApiDefinition> = {
    [P in keyof T]: T[P]["arg"] extends DataField<infer S> ? T[P]["ret"] extends DataField<infer R> ? (arg: S) => Promise<R> : never : never;
}
export type ApiAsyncInterfaceWithStringInputsAllowed<T extends ApiDefinition> = {
    [P in keyof T]: T[P]["arg"] extends DataField<infer S> ? T[P]["ret"] extends DataField<infer R> ?
    (arg: InputWithStringsAllowed<S>) => Promise<R> : never : never;
}
export type ApiFunctionArgument<T extends ApiDefinition, K extends keyof T> = T[K]["arg"] extends DataField<infer S> ? S : never;
export type ApiFunctionReturnType<T extends ApiDefinition, K extends keyof T> = T[K]["ret"] extends DataField<infer S> ? S : never;

