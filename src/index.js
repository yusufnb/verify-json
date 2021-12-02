/* eslint-disable nonblock-statement-body-position */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-cond-assign */
import {isArray, isObject, isString, isNumber, isBoolean, isInteger} from "lodash";

const types = {};

const RX_FLAT_ARRAY = /(\[([^\[\]\{\}]*)\])/;
const RX_FLAT_OBJECT = /(\{([^\{\}\[\]]*)\})/;
const RX_MALFORMED = /[\[\]\{\}]/;
const RX_FLAT_SCALAR = /^[^\[\]\{\}]*$/;
const RX_OPTIONAL = /^[\?]/;
const RX_LOOKUP = /^[0-9]+$/;

function addType(k, fn) {
  if (!isArray(k)) k = [k];
  k.forEach(n => {
    types[n] = fn;
  });
}

addType(["string","s"], (v) => v !== undefined ? isString(v) : "String value!");
addType(["number","n"], (v) => v !== undefined ? isNumber(v) : 2);
addType(["boolean","b"], (v) => v !== undefined ? isBoolean(v) : true);
addType(["integer","i"], (v) => v !== undefined ? isInteger(v) : 2);

const flatten = (schema) => {
  let lookups = [];

  let default_strings = [];
  let m;
  // convert "hello world" to $0. remote " (quotes)
  while(m = schema.match(/("[^"]+")/)) {
    schema = schema.substr(0, m.index) + `$${default_strings.length}` + schema.substr(m.index + m[0].length);
    default_strings.push(m[0]);
  }
  if (schema.match(/"/)) throw "Missing closing quote";

  // strip all white spaces
  schema = schema.replace(/\s/g, "");

  function reduce(schema) {
    let m;
    let found = false;
    while ((m = schema.match(RX_FLAT_ARRAY)) || (m = schema.match(RX_FLAT_OBJECT))) {
      schema = schema.substr(0, m.index) + lookups.length + schema.substr(m.index + m[0].length);
      lookups.push(m[0]);
      found = true;
    }

    if (found) reduce(schema);
    if (!found && schema.match(RX_MALFORMED) ) {
      throw "Malformed schema";
    }
    return schema;
  }

  schema = reduce(schema);
  return [schema, lookups, default_strings];
};

const shape = (json, schema, options = {}) => {
  options = Object.assign({excludeOptional: false}, options);
  let excludeOptional = options.excludeOptional;
  let lookups, default_strings;
  [schema, lookups, default_strings] = flatten(schema);

  const getValue = (type, value, def) => {
    let m;
    if (def && (m = def.match(/^\$([0-9]+)$/))) def = default_strings[m[1] * 1];

    if (types[type]) return (value && types[type](value)) ? value : (def !== undefined) ? def : types[type]();

    return value || def || "Not defined!";
  };
  
    // flat validator value = {k:t:d,..} [t:d,..] t:d
  function traverse({ value, schema }) {
    if (!schema) schema = "";
    let m;
    let optional = false;
    if (schema.match(RX_OPTIONAL)) {
      schema = schema.substr(1);
      optional = true;
    }

    // if lookup, validate further
    if ((m = schema.match(RX_LOOKUP))) return traverse({ value, schema: lookups[schema * 1] });

    if (schema.match(RX_FLAT_SCALAR)) {
      // if scalar
      if (!value && optional && excludeOptional) return null;
      let type, def;
      [type, def] = schema.split(":");
      return getValue(type, value, def);

    } else if ((m = schema.match(RX_FLAT_ARRAY))) {
      // if array
      schema = m[2];
      let schema_parts = schema.split(",");
      if (!isArray(value)) value = schema_parts.map(s => null);
      if (value.length < schema_parts.length) {
        value = value.concat(schema_parts.slice(value.length).map(s => null));
      }
      
      return value.map((v,i) => traverse({ value: v, schema: schema_parts[i % schema_parts.length] }));

    } else if ((m = schema.match(RX_FLAT_OBJECT))) {
      // if object
      if (!isObject(value) || isArray(value)) {
        value = {};
      }
      schema = m[2];
      if (schema === "") return value;

      return schema.split(",").reduce((acc, name) => {
        let [k, t, d] = name.split(":");
        if (!t) t = "";
        if (d) t += ":" + d;
        acc[k] = traverse({ value: value[k], schema: t });
        return acc;
      }, {});
      
    }

  }

  let result = traverse({ value: json, schema });
  return result;
};

const verify = (json, schema, options) => {
  options = Object.assign({name: 'json'}, options);
  let errors = [];

  let lookups;
  [schema, lookups] = flatten(schema);

  //console.log("lookups", lookups);

  // flat validator value = {k:t:d,..} [t:d,..] t:d
  function validate({ path, value, schema, parent = null }) {
    //console.log("validate", value, schema);
    let m;
    let type = null;

    if (schema.match(RX_OPTIONAL)) {
      schema = schema.substr(1);
      if (value === undefined || value === null) return true;
    }

    // if lookup, validate further
    if ((m = schema.match(RX_LOOKUP))) return validate({ path: `${path}`, value, schema: lookups[schema * 1], parent: parent });

    if (schema.match(RX_FLAT_SCALAR)) {
      // if scalar
      let def;
      [schema, def] = schema.split(":");
      if (value === undefined || value === null) {
        errors.push(`${path}: is required`);
        return false;
      }

      if (schema === "") return true; // no validation needed

      if (!types[schema]) throw `${schema} : Validator specified in JSON schema not found`;
      else if (types[schema](value, { path, json, parent })) return true;
      else {
        errors.push(`${path}: validation failed`);
        return false;
      }
    } else if ((m = schema.match(RX_FLAT_ARRAY))) {
      // if array
      if (!isArray(value)) {
        errors.push(`${path}: should be array`);
        return false;
      }
      schema = m[2];
      let schema_parts = schema.split(",");
      for (let i in value) {
        validate({ path: `${path}.${i}`, value: value[i], schema: schema_parts[i % schema_parts.length], parent: value });
      }
    } else if ((m = schema.match(RX_FLAT_OBJECT))) {
      // if object
      if (!isObject(value) || isArray(value)) {
        errors.push(`${path}: should be object`);
        return false;
      }
      schema = m[2];
      if (schema !== "") {
        let keys = schema.split(",").reduce((acc, name) => {
          let [k, t] = name.split(":");
          if (!t) t = "";
          acc[k] = t;
          return acc;
        }, {});
  
        // if object, validate for all k-v
        for (let k in keys) validate({ path: `${path}.${k}`, value: value[k], schema: keys[k], parent: value });
      }
    }

  }

  validate({ path: options.name, value: json, schema });
  if (errors.length > 0) throw errors.join(", ");

  return true;
};

// same as verify. returns boolean. won't throw.
const check = (json, schema) => {
  flatten(schema);
  try {
    verify(json, schema);
    return true;
  } catch (error) {
    return false;
  }
};

export { verify, check, shape, addType };
