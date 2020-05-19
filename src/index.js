/* eslint-disable nonblock-statement-body-position */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-cond-assign */
import _ from "lodash";
const verify = (json, sch, validators = {}) => {
  let errors = [];

  // verify the format of validators
  if (!_.isEmpty(validators)) {
    for (let k in validators) {
      if (!k.match(/^[a-zA-Z0-9_]+$/)) errors.push(`Invalid validator key: ${k}`);
      else if (!_.isFunction(validators[k])) errors.push(`Invalid validator: ${k}`);
    }
    if (errors.length > 0) throw errors.join(", ");
  }

  // extend validators with inbuilts
  validators = Object.assign(
    {
      string: _.isString,
      s: _.isString,
      number: _.isNumber,
      n: _.isNumber,
      boolean: _.isBoolean,
      b: _.isBoolean,
      integer: _.isInteger,
      i: _.isInteger,
    },
    validators
  );

  // strip all white spaces
  sch = sch.replace(/\s/g, "");

  let lookups = [];

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
    if (!found && (sch.match(/[\[\]]/) || sch.match(/[\{\}]/))) {
      throw "Malformed schema";
    }
    return sch;
  }

  sch = reduce(sch);

  function validateValidators() {
    function verifyValidator(str, max) {
      if (!str || str === "") return;
      if (str.match(/^[0-9]+$/)) {
        if (str * 1 >= max) throw `Invalid validator: ${str}`;
      } else if (!validators[str]) throw `Invalid validator: ${str}`;
    }

    // validate validators. lookups provide the validator tokens.
    lookups.forEach((s, i) => {
      let m;
      if ((m = s.match(/^\[(.+)\]$/))) {
        m[1].split(",").forEach((v) => verifyValidator(v, i));
      } else if ((m = s.match(/^\{(.+)\}$/))) {
        m[1]
          .replace(/[\!\?]/g, "")
          .split(",")
          .forEach((part) => {
            let [k, v] = part.split(":");
            verifyValidator(v, i);
          });
      }
    });
  }

  validateValidators();

  //console.log("lookups", lookups);

  // flat validator
  function validate({ path, obj, sch, parent = null }) {
    //console.log("validate", obj, sch);
    let m;
    let type = null;
    let optional = false;
    if (sch.match(/^[\!\?]/)) {
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

      // given a validator. we verify above so should never throw this
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

export default verify;

export { verify };
