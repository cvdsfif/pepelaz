declare class NotNull {
}
declare const notNull: NotNull;
declare abstract class DataField<T> {
    readonly defaultIfNull: () => T | null | NotNull;
    constructor(defaultValueOrFunction?: T | null | NotNull | (() => T | null | NotNull));
    abstract convert(field: any, level: string): T;
    unmarshal(field: any, level?: string): T | null;
}
type FieldType<T> = T extends DataField<infer R> ? R : T;
type DbRecord<T> = T extends FieldObject<infer S> ? DbRecord<S> : {
    [P in keyof T]?: FieldType<T[P]> | null;
};
declare class FunctionField<Arg extends DataField<any>, Ret extends DataField<any>> {
    readonly argument: Arg;
    readonly retval: Ret;
    constructor(argument: Arg, retval: Ret);
}
declare const functionField: <Arg extends DataField<any>, Ret extends DataField<any>>(arg: Arg, ret: Ret) => FunctionField<Arg, Ret>;
type DataInterfaceDefinition = {
    [P in any]: FunctionField<DataField<any>, DataField<any>>;
};
type FunctionFieldType<T> = T extends FunctionField<infer Arg, infer Ret> ? (arg: FieldType<Arg>) => FieldType<Ret> : T;
type AsyncFunctionFieldType<T> = T extends FunctionField<infer Arg, infer Ret> ? (arg: FieldType<Arg>) => Promise<FieldType<Ret>> : T;
type FunctionReturnType<T> = T extends FunctionField<infer Arg, infer Ret> ? FieldType<Ret> : T;
type FunctionArgumentType<T> = T extends FunctionField<infer Arg, infer Ret> ? FieldType<Arg> : T;
type DataInterface<T> = {
    [P in keyof T]: FunctionFieldType<T[P]>;
};
declare class IntegerField extends DataField<number> {
    convert: (field: any) => number;
}
declare const integerField: (defaultIfNull?: number | null | NotNull | (() => number)) => IntegerField;
declare class FloatField extends DataField<number> {
    convert: (field: any) => number;
}
declare const floatField: (defaultIfNull?: number | null | NotNull | (() => number)) => FloatField;
declare class BigIntField extends DataField<bigint> {
    convert: (field: any) => bigint;
}
declare const bigIntField: (defaultIfNull?: bigint | null | NotNull | (() => bigint)) => BigIntField;
declare class StringField extends DataField<string> {
    convert: (field: any) => string;
}
declare const stringField: (defaultIfNull?: string | null | NotNull | (() => string)) => StringField;
declare class DateField extends DataField<Date> {
    convert: (field: any) => Date;
}
declare const dateField: (defaultIfNull?: Date | null | NotNull | (() => Date)) => DateField;
declare class BooleanField extends DataField<boolean> {
    convert: (field: any) => boolean;
}
declare const booleanField: (defaultIfNull?: boolean | null | NotNull | (() => boolean)) => BooleanField;
declare class VoidField extends DataField<void> {
    convert: (field: void) => void;
}
declare const voidField: () => VoidField;
declare class FieldArray<T> extends DataField<(T | null)[]> {
    readonly members: DataField<T>;
    constructor(members: DataField<T>, defaultValueOrFunction?: ((T | null)[] | null | NotNull));
    convert(field: any[], level?: string): (T | null)[];
}
declare const fieldArray: <T>(member: DataField<T>, defaultIfNull?: NotNull | (T | null)[] | (() => T | null) | null) => FieldArray<T>;
declare const stringifyWithBigints: (value: any) => string;
type FieldObjectDefinition = {
    [P in any]: DataField<any>;
};
declare class FieldObject<T extends FieldObjectDefinition> extends DataField<DbRecord<T>> {
    readonly definition: T;
    constructor(definition: T, defaultValueOrFunction?: null | NotNull | T);
    convert(record: any, level?: string): DbRecord<T>;
}
declare const fieldObject: <T extends FieldObjectDefinition>(definition: T, defaultValueOrFunction?: NotNull | T | null) => FieldObject<T>;
declare const unmarshal: (template: DataField<any> | FieldObjectDefinition, field: any) => any;
interface IApiProps {
    name: string;
    description: string;
    definition: DataInterfaceDefinition;
}

export { AsyncFunctionFieldType, BigIntField, DataField, DataInterface, DataInterfaceDefinition, DateField, DbRecord, FieldObject, FieldObjectDefinition, FieldType, FunctionArgumentType, FunctionField, FunctionFieldType, FunctionReturnType, IApiProps, NotNull, VoidField, bigIntField, booleanField, dateField, fieldArray, fieldObject, floatField, functionField, integerField, notNull, stringField, stringifyWithBigints, unmarshal, voidField };
