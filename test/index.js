import { assert, expect } from "chai";
import verify from "../src";
import _ from "lodash";

describe("Development", () => {
  it("should validate schema definition", () => {
    expect(() => verify({}, "{a:test}")).to.throw("Invalid validator: test");
    expect(() => verify({}, "{a:test}", { test: true })).to.throw(
      "validators.test: validation failed"
    );
    expect(verify({ a: [1, "2"] }, "{a:?[:i,s]}")).to.be.true;
    expect(() => verify({}, "{a:[i,s]}}")).to.throw("Malformed schema");
    expect(() => verify({}, "{a:[z]}")).to.throw("Invalid validator: z");
    expect(
      verify({}, "{a:?[z]}", {
        z: function () {
          return true;
        },
      })
    ).to.be.true;
  });

  it("should verify simple plain objects", () => {
    expect(verify(null, "?{}")).to.be.true;
    expect(verify(null, "?[]")).to.be.true;
    expect(verify({}, "{}")).to.be.true;

    expect(verify({ a: 1, b: 2 }, "{a,b}")).to.be.true;
    expect(() => verify({ a: 1, b: 2 }, "{a,b,c}")).to.throw(
      "json.c: is required"
    );

    expect(verify({ a: 1, b: [] }, "{a,b:[]}")).to.be.true;

    expect(() => verify({ a: [] }, "{a,b}") === true).to.throw(
      "json.b: is required"
    );
    expect(verify({ a: 1 }, "{a,b:?}")).to.be.true;
    expect(verify({ a: 1, b: false }, "{a,b}")).to.be.true;
    expect(() => verify({ a: 1, b: null }, "{a,b}")).to.throw(
      "json.b: is required"
    );
    expect(() => verify({ a: { c: 1 }, b: 0 }, "{a,b:0}")).to.throw(
      "Invalid validator: 0"
    );
  });

  it("should verify simple arrays", () => {
    expect(verify([], "[]")).to.be.true;
    expect(verify([{}], "[{}]")).to.be.true;
    expect(verify([1, 2, 3], "[]")).to.be.true;
    expect(() => verify([1, 2, 3], "{}")).to.throw("json: should be object");
    expect(verify([1, 2, 3], "[i]")).to.be.true;
    expect(() => verify([1, "2", 3], "[i]")).to.throw(
      "json.1: validation failed"
    );
  });

  it("should work with custom validators", () => {
    assert(
      verify({ a: "hello" }, "{a: custom }", {
        custom: function (v) {
          return v === "hello";
        },
      }) === true,
      "Failed"
    );
  });

  it("should work with complex objects", () => {
    expect(() =>
      verify(
        { a: 1, b: { c: "a", d: [1, "2", { e: true }] } },
        "{a:i,b:{c,d:[i,s,{e:i}]}}"
      )
    ).to.throw("json.b.d.2.e: validation failed");

    expect(
      verify(
        {
          markers: [
            {
              name: "Rixos The Palm Dubai",
              location: [25.1212, 55.1535],
            },
            {
              name: "Shangri-La Hotel",
              location: [25.2084, 55.2719],
            },
          ],
        },
        "{markers:[{name,location:[:lat,:long]}]}",
        {
          lat: (val) => val >= -90 && val <= 90,
          long: (val) => val >= -180 && val <= 180,
        }
      )
    ).to.be.true;

    expect(
      verify(
        {
          a: 1,
          b: "A",
          c: { def: { e: [{ a: 1, b: ["A"], c: "B" }] }, e: [1, 2, 3], p: 2 },
          e: 1,
          p: 1,
        },
        "{a:number,b:string,c:{ def:{ e: [ { a,b:[s],c:string } ] },e:[i],p:number,f:?string }, e:?, p, q:?, r:!}"
      )
    ).to.be.true;
  });

  it("should work as a mixin", () => {
    expect(_.verify({ a: 1 }, "{a}")).to.be.true;
    expect(() => _.verify({ a: 1 }, "{b}")).to.throw("json.b: is required");
  });
});
