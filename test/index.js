import { assert, expect } from "chai";
import check from "../src";

describe("Development", () => {
  it("simple json should work", () => {
    assert(check({}, "{}") === true, "Didn't work");
    assert(check([], "[]") === true, "Didn't work");
    assert(check([{}], "[{}]") === true, "Didn't work");
    assert(check([{}], "[{}]") === true, "Didn't work");
    expect(() => check({ a: [] }, "{a,b}") === true).to.throw(
      "json.b: is required"
    );
  });

  it("custom validators should work", () => {
    assert(
      check({ a: "hello" }, "{a: custom }", {
        custom: function (v) {
          return v === "hello";
        },
      }) === true,
      "Didn't work"
    );
  });

  it("works with arrays", () => {
    assert(check([{ a: 1 }], "[{a:i}]") === true, "Didn't work");
  });

  it("should work", () => {
    assert(
      check(
        {
          a: 1,
          b: "A",
          c: { def: { e: [{ a: 1, b: ["A"], c: "B" }] }, e: [1, 2, 3], p: 2 },
          e: 1,
          p: 1,
        },
        "{a:number,b:string,c:{ def:{ e: [ { a,b:[s],c:string } ] },e:[i],p:number,f:!string }, e:!, p:!}"
      ) === true,
      "Didn't work :("
    );
  });
});
