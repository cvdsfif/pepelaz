// src/index.ts
var NotNull = class {
};
var notNull = new NotNull();
var DataField = class {
  constructor(defaultValueOrFunction = null) {
    if (typeof defaultValueOrFunction === "function")
      this.defaultIfNull = defaultValueOrFunction;
    else
      this.defaultIfNull = () => defaultValueOrFunction;
  }
  unmarshal(field, level = "") {
    if (!field && field !== false && field !== 0) {
      const din = this.defaultIfNull();
      if (din instanceof NotNull)
        throw new Error(`Null value is not allowed for the field ${level}`);
      return din;
    }
    return this.convert(field, level);
  }
};
var FunctionField = class {
  constructor(argument, retval) {
    this.argument = argument;
    this.retval = retval;
  }
};
var functionField = (arg, ret) => new FunctionField(arg, ret);
var IntegerField = class extends DataField {
  constructor() {
    super(...arguments);
    this.convert = (field) => parseInt(field);
  }
};
var integerField = (defaultIfNull = null) => new IntegerField(defaultIfNull);
var FloatField = class extends DataField {
  constructor() {
    super(...arguments);
    this.convert = (field) => parseFloat(field);
  }
};
var floatField = (defaultIfNull = null) => new FloatField(defaultIfNull);
var BigIntField = class extends DataField {
  constructor() {
    super(...arguments);
    this.convert = (field) => BigInt(`${field}`.replace(/(^-?\d+)(.*)/, "$1"));
  }
};
var bigIntField = (defaultIfNull = null) => new BigIntField(defaultIfNull);
var StringField = class extends DataField {
  constructor() {
    super(...arguments);
    this.convert = (field) => `${field}`;
  }
};
var stringField = (defaultIfNull = null) => new StringField(defaultIfNull);
var DateField = class extends DataField {
  constructor() {
    super(...arguments);
    this.convert = (field) => new Date(field);
  }
};
var dateField = (defaultIfNull = null) => new DateField(defaultIfNull);
var BooleanField = class extends DataField {
  constructor() {
    super(...arguments);
    this.convert = (field) => Boolean(field).valueOf();
  }
};
var booleanField = (defaultIfNull = null) => new BooleanField(defaultIfNull);
var VoidField = class extends DataField {
  constructor() {
    super(...arguments);
    this.convert = (field) => {
    };
  }
};
var voidField = () => new VoidField();
var FieldArray = class extends DataField {
  constructor(members, defaultValueOrFunction = null) {
    super(defaultValueOrFunction);
    this.members = members;
  }
  convert(field, level = "") {
    return new Array(...field).map((element, index) => this.members.unmarshal(element, `::${level}::${index}`));
  }
};
var fieldArray = (member, defaultIfNull = null) => new FieldArray(member, defaultIfNull);
var stringifyWithBigints = (value) => {
  BigInt.prototype.toJSON = function() {
    return this.toString();
  };
  return JSON.stringify(value);
};
var FieldObject = class extends DataField {
  constructor(definition, defaultValueOrFunction = null) {
    super(defaultValueOrFunction);
    this.definition = definition;
  }
  convert(record, level = "") {
    return Object.keys(this.definition).reduce((accumulator, key) => {
      const matchingField = record[key] ?? record[key.toLowerCase()] ?? record[convertUppercaseIntoUnderscored(key)];
      const unmarshalledValue = this.definition[key].unmarshal(matchingField, `::${level}::${key}`);
      accumulator[key] = unmarshalledValue;
      return accumulator;
    }, new Object());
  }
};
var fieldObject = (definition, defaultValueOrFunction = null) => new FieldObject(definition, defaultValueOrFunction);
var convertUppercaseIntoUnderscored = (s) => s.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
var unmarshal = (template, field) => {
  if (template instanceof DataField) {
    return template.unmarshal(field);
  }
  return fieldObject(template).unmarshal(field);
};
export {
  BigIntField,
  DataField,
  DateField,
  FieldObject,
  FunctionField,
  NotNull,
  VoidField,
  bigIntField,
  booleanField,
  dateField,
  fieldArray,
  fieldObject,
  floatField,
  functionField,
  integerField,
  notNull,
  stringField,
  stringifyWithBigints,
  unmarshal,
  voidField
};
//# sourceMappingURL=index.mjs.map