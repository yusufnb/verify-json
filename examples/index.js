const { verify } = require("../lib/index");

let json = {
  markers: [
    {
      name: "Rixos The Palm Dubai",
      location: [25.1212, 55.1535],
      favorite: true,
      color: "red",
    },
    {
      name: "Shangri-La Hotel",
      location: [25.2084, 55.2719],
      color: "blue",
    },
  ],
};

// <key>:<validator>
// <key>:?<validator> - uses ? for optional
// <key> - required non null attribute of any type
// Skip all the quotations
const schema = `{markers: [{
      name:string,
      location:[:lat,:long],
      favorite:?b,
      color
  }]
}`;

// customValidators are optional. See built-in validators.
const customValidators = {
  lat: (val) => val >= -90 && val <= 90,
  long: (val) => val >= -180 && val <= 180,
};

let result = verify(json, schema, customValidators);

console.log(result); // true

json.markers[0].location[0] = 1000;

try {
  verify(json, schema, customValidators);
} catch (error) {
  console.log("error", error); // json.markers.0.location.0: validation failed
}
