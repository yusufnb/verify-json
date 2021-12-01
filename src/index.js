/* eslint-disable nonblock-statement-body-position */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-cond-assign */
import _ from "lodash";

const validators = {};

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

const flatten = (sch) => {
  let lookups = [];

  // strip all white spaces
  sch = sch.replace(/\s/g, "");

  function reduce(sch) {
    let m;
    let found = false;
    while ((m = sch.match(/(\[[^\[\]\{\}]*\])/)) || (m = sch.match(/(\{[^\{\}\[\]]*\})/))) {
      sch = sch.substr(0, m.index) + lookups.length + sch.substr(m.index + m[0].length);
      // support [:i,:s] instead of [i,s]
      if (m[0].match(/^\[/)) m[0] = m[0].replace(/\:/g, "");
      lookups.push(m[0]);
      found = true;
    }

    if (found) reduce(sch);
    if (!found && sch.match(/[\[\]\{\}]/) ) {
      throw "Malformed schema";
    }
    return sch;
  }

  sch = reduce(sch);
  return [sch, lookups];
};

const shape = (json, sch) => {

  let lookups;
  [sch, lookups] = flatten(sch);

};

const verify = (json, sch) => {
  let errors = [];

  let lookups;
  [sch, lookups] = flatten(sch);

  //console.log("lookups", lookups);

  // flat validator
  function validate({ path, obj, sch, parent = null }) {
    //console.log("validate", obj, sch);
    let m;
    let type = null;
    let optional = false;
    if (sch.match(/^[\?]/)) {
      sch = sch.substr(1);
      optional = true;
    }

    if (optional && (obj === undefined || obj === null)) return true;

    // if lookup, validate further
    if ((m = sch.match(/^[0-9]+$/))) return validate({ path: `${path}`, obj, sch: lookups[sch * 1], parent: parent });

    // if validator verify it now
    if (sch.match(/^[a-zA-Z0-9_]*$/)) {
      if (obj === undefined || obj === null) {
        errors.push(`${path}: is required`);
        return false;
      }

      if (sch === "") return true; // no validation needed

      if (!validators[sch]) throw `${sch} : Validator specified in JSON schema not found`;
      else if (validators[sch](obj, { path, json, parent })) return true;
      else {
        errors.push(`${path}: validation failed`);
        return false;
      }
    }

    if ((m = sch.match(/^\[(.*)\]$/))) {
      if (!_.isArray(obj)) {
        errors.push(`${path}: should be array`);
        return false;
      }
      type = "array";
      sch = m[1];
    } else if ((m = sch.match(/^\{(.*)\}$/))) {
      if (!_.isObject(obj) || _.isArray(obj)) {
        errors.push(`${path}: should be object`);
        return false;
      }
      type = "object";
      sch = m[1];
    }

    // This should never happen as well
    if (!type) throw `${path}: Invalid type in Lookup`;

    // if array, validate for all
    if (type === "array") {
      let sch_parts = sch.split(",");
      for (let i in obj)
        validate({ path: `${path}.${i}`, obj: obj[i], sch: sch_parts[i % sch_parts.length], parent: obj });
    }

    if (type === "object" && sch !== "") {
      let keys = sch.split(",").reduce((acc, value) => {
        let [k, v] = value.split(":");
        if (!v) v = "";
        acc[k] = v;
        return acc;
      }, {});

      // if object, validate for all k-v
      for (let k in keys) validate({ path: `${path}.${k}`, obj: obj[k], sch: keys[k], parent: obj });
    }
  }

  validate({ path: "json", obj: json, sch });
  if (errors.length > 0) throw errors.join(", ");

  return true;
};

_.mixin({ verify: verify }, { chain: false });

export { verify };
