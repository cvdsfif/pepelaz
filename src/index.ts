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
export type FieldType<T> = T extends DataField<infer R> ? R : T;
export type DbRecord<T> = T extends FieldObject<infer S> ? DbRecord<S> : {
    [P in keyof T]?: FieldType<T[P]> | null;
}

export class FunctionField<Arg extends DataField<any>, Ret extends DataField<any>>{
    readonly argument: Arg;
    readonly retval: Ret;

    constructor(argument: Arg, retval: Ret) {
        this.argument = argument;
        this.retval = retval;
    }
}
export const functionField =
    <Arg extends DataField<any>, Ret extends DataField<any>>(arg: Arg, ret: Ret) =>
        new FunctionField<Arg, Ret>(arg, ret);

export type DataInterfaceDefinition = {
    [P in any]: FunctionField<DataField<any>, DataField<any>>;
}
export type FunctionFieldType<T> = T extends FunctionField<infer Arg, infer Ret> ? (arg: FieldType<Arg>) => FieldType<Ret> : T;
export type AsyncFunctionFieldType<T> = T extends FunctionField<infer Arg, infer Ret> ? (arg: FieldType<Arg>) => Promise<FieldType<Ret>> : T;
export type FunctionReturnType<T> = T extends FunctionField<infer Arg, infer Ret> ? FieldType<Ret> : T;
export type FunctionArgumentType<T> = T extends FunctionField<infer Arg, infer Ret> ? FieldType<Arg> : T;
export type DataInterface<T> = {
    [P in keyof T]: FunctionFieldType<T[P]>;
}

class IntegerField extends DataField<number>{ convert = (field: any): number => parseInt(field); };
export const integerField = (defaultIfNull: number | null | NotNull | (() => number) = null) => new IntegerField(defaultIfNull);
class FloatField extends DataField<number>{ convert = (field: any): number => parseFloat(field); };
export const floatField = (defaultIfNull: number | null | NotNull | (() => number) = null) => new FloatField(defaultIfNull);
export class BigIntField extends DataField<bigint>{ convert = (field: any): bigint => BigInt(`${field}`.replace(/(^-?\d+)(.*)/, "$1")); };
export const bigIntField = (defaultIfNull: bigint | null | NotNull | (() => bigint) = null) => new BigIntField(defaultIfNull);
class StringField extends DataField<string>{ convert = (field: any): string => `${field}`; };
export const stringField = (defaultIfNull: string | null | NotNull | (() => string) = null) => new StringField(defaultIfNull);
export class DateField extends DataField<Date>{ convert = (field: any): Date => new Date(field); };
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
    (BigInt.prototype as any).toJSON = function () { return this.toString(); }
    return JSON.stringify(value);
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

export type ApiProps<T extends DataInterfaceDefinition> = {
    name: string;
    definition: T;
}

export type ApiList = {
    [P: string]: ApiProps<any>;
}

