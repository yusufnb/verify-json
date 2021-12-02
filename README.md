# Verify JSON

Library to verify and shape JSON easily using a Flat JSON schema syntax

# About

This project results from my need to verify JSON schema in a lightweight manner, without the need for an extensive definition and development code.

It uses the flat-json schema documented [here](https://github.com/sleeksky-dev/json-flat-schema)

# Flat JSON Schema
Scalars represented as: `type:example`

Key value pairs representaed as: `key_name:type:example`

Example: Array of integers - `"[i]"` or `"[integer]"` or `"[i:2]"`

Example: Object - `"{a:i,b:s}"` or `"{a:integer,b:string}"`

Example: Object with Array or integers - `"{a:[i]}"`

# Installation

```JavaScript
npm install -s verify-json

const {verify, check, shape, addType } = require('verify-json')

import {verify, check, shape, addType } from 'verify-json';
```

# verify

```JavaScript
const { verify } = require("verify-json");

let schema = "{a:i,b:[i],c:?b}";
let object = {"a":1, "b":[1,2,3], "c": false}
verify(object, schema); 
// true
```

# check
Same as verify except return boolean instead of throwing error
```JavaScript
const {check} = require("verify-json");

let schema = "{a:i,b:[i],c:?b}";
let object = {"a":1, "b":[1,2,3], "c": 10}
verify(object, schema); 
// false
```

# shape
Return an object in the shape of the schema, making best effort of using values from the data object.
```JavaScript
const {shape} = require("verify-json");

let schema = "{a:i,b:[i],c:b}";
let object = {"a":1, "b":[1], "d": 1}
shape(object, schema); 
// {"a": 1, "b":[1], "c":true}
```

# addType
Add custom type validators and optional provide default values when shaping objects
```JavaScript
const {shape, addType} = require("verify-json");

addType('url', (value) => {
  if (value === undefined) return 'https://example.com'; // shape sample
  return value.match(/^http/) ? true : false;
});

shape(null, "{img:url}");
// {"img": "https://example.com"}
```

# License

MIT © Yusuf Bhabhrawala
