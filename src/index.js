/* eslint-disable nonblock-statement-body-position */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-cond-assign */
import _ from "lodash";

const validators = {};

const RX_FLAT_ARRAY = /(\[([^\[\]\{\}]*)\])/;
const RX_FLAT_OBJECT = /(\{([^\{\}\[\]]*)\})/;
const RX_MALFORMED = /[\[\]\{\}]/;
const RX_FLAT_SCALAR = /^[^\[\]\{\}]*$/;
const RX_OPTIONAL = /^[\?]/;

function addValidator(k, fn) {
  if (!_.isArray(k)) k = [k];
  k.forEach(n => {
    validators[n] = fn;
  });
}

addValidator(["string","s"], _.isString);
addValidator(["number","n"], _.isNumber);
addValidator(["boolean","b"], _.isBoolean);
addValidator(["integer","i"], _.isInteger);
addValidator("array", _.isArray);
addValidator("object", _.isObject);

const flatten = (schema) => {
  let lookups = [];

  // strip all white spaces
  schema = schema.replace(/\s/g, "");
  let default_strings = [];
  let m;
  // convert "hello world" to $0. remote " (quotes)
  while(m = schema.match(/("[^"]+")/)) {
    schema = schema.substr(0, m.index) + `$${default_strings.length}` + schema.substr(m.index + m[0].length);
    default_strings.push(m[0]);
  }
  if (schema.match(/"/)) throw "Missing closing quote";

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

const shape = (json, schema) => {

  let lookups, default_strings;
  [schema, lookups, default_strings] = flatten(schema);
  let result = null;

  function traverse({value, result, schema}) {
    if (schema.match(/^\[/)) {
      if (!result) result = [];
      let m = schema.match(/^\[(.*)\]$/);
      let schema_parts = m[1].split(",");
    }

  }

  traverse({value: json, result, schema});
};

const verify = (json, schema) => {
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
    if ((m = schema.match(/^[0-9]+$/))) return validate({ path: `${path}`, value, schema: lookups[schema * 1], parent: parent });

    if (schema.match(RX_FLAT_SCALAR)) {
      // if scalar
      let def;
      [schema, def] = schema.split(":");
      if (value === undefined || value === null) {
        errors.push(`${path}: is required`);
        return false;
      }

      if (schema === "") return true; // no validation needed

      if (!validators[schema]) throw `${schema} : Validator specified in JSON schema not found`;
      else if (validators[schema](value, { path, json, parent })) return true;
      else {
        errors.push(`${path}: validation failed`);
        return false;
      }
    } else if ((m = schema.match(RX_FLAT_ARRAY))) {
      // if array
      if (!_.isArray(value)) {
        errors.push(`${path}: should be array`);
        return false;
      }
      type = "array";
      schema = m[2];
      let schema_parts = schema.split(",");
      for (let i in value) {
        validate({ path: `${path}.${i}`, value: value[i], schema: schema_parts[i % schema_parts.length], parent: value });
      }
    } else if ((m = schema.match(RX_FLAT_OBJECT))) {
      // if object
      if (!_.isObject(value) || _.isArray(value)) {
        errors.push(`${path}: should be object`);
        return false;
      }
      type = "object";
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

  validate({ path: "json", value: json, schema });
  if (errors.length > 0) throw errors.join(", ");

  return true;
};

export { verify, addValidator };
