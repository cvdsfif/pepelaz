import {
    DbRecord, FieldObjectDefinition, bigIntField, booleanField, dateField, fieldArray, fieldObject,
    floatField, functionField, integerField, jsonField, notNull, stringField, stringifyWithBigints, unmarshal
} from "../src"

describe("Testing Pepelaz marshalling", () => {
    test("Field should be nullable by default", () => {
        expect(integerField().defaultIfNull()).toBeNull();
    });

    test("Nullable input values should produce nullable fields in the target interface", () => {
        class TestInput {
            id = integerField();
            str = stringField(notNull);
        };
        type TestClass = DbRecord<TestInput>;
        const val: TestClass = { str: "15" };
        expect(val.id).toBeUndefined();
    });

    const dataInput: FieldObjectDefinition = {
        creationOrder: integerField(5),
        intNotNull: integerField(notNull),
        nullableInt: integerField(),
        somethingFloat: floatField(),
        somethingBig: bigIntField(notNull),
        nullableBig: bigIntField(),
        ecriture: stringField(),
        unJour: dateField(),
        veritas: booleanField(),
        calculated: integerField(() => 2 * 2),
        explicitlyNullableInt: integerField(null),
        stringWithDefault: stringField(""),
        calculatedNullableDefault: stringField(() => null),
        calculatedNotNullableDefault: stringField(() => notNull),
        falsishBool: booleanField(),
        nullishBool: booleanField(),
    }

    const inputArray = fieldArray(fieldObject(dataInput));
    const notNullableInputArray = fieldArray(fieldObject(dataInput, notNull));
    const defaultNullableInputArray = fieldArray(fieldObject(dataInput, null));

    test("Types should be converted correctly", () => {
        const record = unmarshal(dataInput, {
            intNotNull: "0",
            creationorder: "1",
            somethingfloat: "3.456",
            something_big: "12345678901234567890",
            ecriture: "451",
            un_jour: "1990-03-11",
            veritas: true,
            calculatedNotNullableDefault: "str"
        });
        expect(record.creationOrder).toEqual(1);
        expect(record.somethingFloat).toEqual(3.456);
        expect(record.somethingBig).toEqual(BigInt("12345678901234567890"));
        expect(record.ecriture).toEqual("451");
        expect(record.unJour).toEqual(new Date("1990-03-11"));
        expect(record.veritas).toBeTruthy();
    });

    test("Should correctly serialize bigint literals", () => {
        expect(unmarshal(bigIntField(), 1n)).toEqual(1n);
    })

    test("Fields should take default values if omitted", () => {
        const record = unmarshal(dataInput, {
            intNotNull: "0",
            somethingfloat: "3.456",
            something_big: "12345678901234567890",
            ecriture: "451",
            un_jour: "1990-03-11",
            calculatedNotNullableDefault: "str"
        });
        expect(record.creationOrder).toEqual(5);
    });

    test("Dummy values fields should be ignored", () => {
        const record = unmarshal(dataInput, {
            intNotNull: "0",
            somethingfloat: "3.456",
            something_big: "12345678901234567890",
            ecriture: "451",
            un_jour: "1990-03-11",
            incorrect: 42,
            moreIncorrect: 51,
            calculatedNotNullableDefault: "str"
        });
        expect(record.incorrect).toBe(undefined);
        expect(record.moreIncorrect).toBe(undefined);
    });

    test("Should throw exception if a mandatory field is omitted", () => {
        expect(() => unmarshal(dataInput, {
            intNotNull: "0",
            somethingfloat: "3.456",
            ecriture: "451",
            un_jour: "1990-03-11",
            calculatedNotNullableDefault: "str"
        })).toThrow();
    });

    test("Boolean field should make difference between false and null", async () => {
        const record = unmarshal(dataInput, {
            intNotNull: 0,
            somethingfloat: "3.456",
            something_big: "12345678901234567890",
            ecriture: "451",
            un_jour: "1990-03-11",
            moreIncorrect: 51,
            falsishBool: false,
            nullishBool: null,
            calculatedNotNullableDefault: "str"
        });
        expect(record.nullishBool).toBeNull();
        expect(record.falsishBool).toBe(false);
    });

    test("Should accept functions as default initializers", async () => {
        const record = unmarshal(dataInput, {
            intNotNull: "0",
            somethingfloat: "3.456",
            something_big: "12345678901234567890",
            ecriture: "451",
            un_jour: "1990-03-11",
            moreIncorrect: 51,
            calculatedNotNullableDefault: "str"
        });
        expect(record.calculated).toEqual(4);
    });

    test("Array should be converted correctly", () => {
        const record = unmarshal(inputArray, [{
            intNotNull: "0",
            creationorder: "1",
            somethingfloat: "3.456",
            something_big: "12345678901234567890",
            ecriture: "451",
            un_jour: "1990-03-11",
            veritas: true,
            calculatedNotNullableDefault: "str"
        }])[0];
        expect(record.creationOrder).toEqual(1);
        expect(record.somethingFloat).toEqual(3.456);
        expect(record.somethingBig).toEqual(BigInt("12345678901234567890"));
        expect(record.ecriture).toEqual("451");
        expect(record.unJour).toEqual(new Date("1990-03-11"));
        expect(record.veritas).toBeTruthy();
    });

    test("Array should be converted correctly with nullable values", () => {
        const record = unmarshal(inputArray, [{
            intNotNull: "0",
            creationorder: "1",
            somethingfloat: "3.456",
            something_big: "12345678901234567890",
            ecriture: "451",
            un_jour: "1990-03-11",
            veritas: true,
            calculatedNotNullableDefault: "str"
        }, null])[0];
        expect(record.creationOrder).toEqual(1);
        expect(record.somethingFloat).toEqual(3.456);
        expect(record.somethingBig).toEqual(BigInt("12345678901234567890"));
        expect(record.ecriture).toEqual("451");
        expect(record.unJour).toEqual(new Date("1990-03-11"));
        expect(record.veritas).toBeTruthy();
    });

    test("Should convert the integer field alone", () => {
        expect(unmarshal(integerField(), "5")).toEqual(5);
    });

    test("Array should throw exception if no nulls are accepted", () => {
        expect(() => unmarshal(notNullableInputArray, [{
            intNotNull: "0",
            creationorder: "1",
            somethingfloat: "3.456",
            something_big: "12345678901234567890",
            ecriture: "451",
            un_jour: "1990-03-11",
            veritas: true,
            calculatedNotNullableDefault: "str"
        }, null])).toThrow();
    });

    test("Array should attribute null default values", () => {
        const record = unmarshal(inputArray, [{
            intNotNull: "0",
            creationorder: "1",
            somethingfloat: "3.456",
            something_big: "12345678901234567890",
            ecriture: "451",
            un_jour: "1990-03-11",
            veritas: true,
            calculatedNotNullableDefault: "str"
        }, null])[1];
        expect(record).toBeNull();
    });

    test("Array should full nulls with defaults if present", () => {
        const intArray = fieldArray(integerField(), [14, 42]);
        expect(unmarshal(intArray, null)).toEqual([14, 42]);
    });

    test("Object definition should throw exception if unauthorised null passed", () => {
        const objectDefinition = fieldObject({ intushka: integerField() }, notNull);
        expect(() => unmarshal(objectDefinition, null)).toThrow();
    });

    test("Object definition should accept legal null passed", () => {
        const objectDefinition = fieldObject({ intushka: integerField() });
        expect(unmarshal(objectDefinition, null)).toBeNull();
    });

    test("Object definition should replace null by default value", () => {
        const objectDefinition = fieldObject({ intushka: integerField() }, { intushka: 42 });
        expect(unmarshal(objectDefinition, null)).toEqual({ intushka: 42 });
    });

    test("Function definition should keep type information", () => {
        const stringDef = stringField();
        const intDef = integerField();
        const functionDef = functionField(stringDef, intDef);
        expect(functionDef.argument).toBe(stringDef);
        expect(functionDef.retval).toBe(intDef);
    });

    test("Should correctly stringify bigints", () => {
        expect(stringifyWithBigints({ biga: 1n })).toBe(`{\"biga\":\"1\"}`);
    });

    test("Should correctly convert a JSON field", () => {
        expect(jsonField().convert(`{"id":42}`)).toEqual({ id: 42 });
        expect(jsonField().convert({ id: 42 })).toEqual({ id: 42 });
    });

    test("Object should not unmarshal undefined nullable fields", () => {
        const objectDefinition = fieldObject({ notNullable: stringField(notNull), intushka: integerField() });
        expect(unmarshal(objectDefinition, { notNullable: "boo" })).toEqual({ notNullable: "boo" });
    });

    test("Object should unmarshal null nullable fields", () => {
        const objectDefinition = fieldObject({ notNullable: stringField(notNull), intushka: integerField() });
        expect(unmarshal(objectDefinition, { notNullable: "boo", intushka: null })).toEqual({ notNullable: "boo", intushka: null });
    });

    test("Object should verify not null condition for absent fields", () => {
        const objectDefinition = fieldObject({ notNullable: stringField(notNull), intushka: integerField() });
        expect(() => unmarshal(objectDefinition, { intushka: null })).toThrow();
    });
})