# Verify JSON

Library to verify JSON structure easily using a lightweight JSON schema syntax

# About

This project results from my need to verify JSON schema in a lightweight manner, without the need for an extensive definition and development code.

The schema syntax is minimalist and extremely easy to write.

# Installation

```JavaScript
npm install -s verify-json

const verify = require('verify-json')

import verify from 'verify-json';
```

# Example

```JavaScript
const { verify } = require("verify-json");

let json = {
  markers: [
    {
      stars: 5,
      name: 'Rixos The Palm Dubai',
      location: [25.1212, 55.1535],
      favorite: true,
      color: 'red',
    },
    {
      stars: 4,
      name: 'Shangri-La Hotel',
      location: [25.2084, 55.2719],
      color: 'blue',
    },
  ],
};

// <key>:<validator>
// <key>:?<validator> - uses ? for optional
// <key> - required non null attribute of any type
// Skip all the quotations
const schema = `{markers: [{
      stars:i,
      name:string,
      location:[:lat,:long],
      favorite:?b,
      color:color
  }]
}`;

// customValidators are optional. See built-in validators.
const customValidators = {
  lat: (val) => val >= -90 && val <= 90,
  long: (val) => val >= -180 && val <= 180,
  color: (val, args) => {
    // demonstrating conditional validations. args = { json, path, parent }
    return (args.parent.stars === 5 && val === 'red') || (args.parent.stars === 4 && val === 'blue');
  },
};

let result = verify(json, schema, customValidators);

console.log(result); // true

json.markers[0].location[0] = 1000;
json.markers[0].color = 'blue';
try {
  verify(json, schema, customValidators);
} catch (error) {
  console.log('error', error); // json.markers.0.location.0: validation failed, json.markers.0.color: validation failed
}


```

# Built-in Validators

Following validators are built in and can be used directly -

```JavaScript
{
    string    : _.isString,
    s         : _.isString,      // alias for string
    number    : _.isNumber,
    n         : _.isNumber,      // alias for number
    boolean   : _.isBoolean,
    b         : _.isBoolean,     // alias for boolean
    integer   : _.isInteger,
    i         : _.isInteger,     // alias for integer
}

```

# Use as a mixin

Since `lodash` is a dependency, this method is also exposed as a lodash mixin. Once imported anywhere, you can simply use `_.verify` to access it.

```JavaScript
_.verify(json, schema, customValidators)
```

# License

MIT © Yusuf Bhabhrawala
