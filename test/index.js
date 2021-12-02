/* eslint-disable func-names */
/* eslint-disable object-shorthand */
/* eslint-disable quotes */
/* eslint-disable no-unused-expressions */
import chai, { assert, expect } from 'chai';
import _ from 'lodash';
import {verify, shape, check, addType} from '../src';

describe('Shape', () => {
  it('should return value', () => {
    //let val = shape({e: 12}, "{a,b,c:i:10,\nd:[i,s:\"hello world\"],e:?s}", {excludeOptional: true});
    let val = shape({a: {foo: 'bar'}}, "{a}");
    assert.deepEqual(val, {a: {foo: 'bar'}});

    val = shape({a: [1,2,3]}, "{a:?}");
    assert.deepEqual(val, {a: [1,2,3]});
  });

  addType('url', (val) => {
    if (val === undefined) return 'http://example.com';
    return (typeof val === 'string' || val instanceof String) ? true : false;
  });

  it.only('should use custom type default', () => {
    let val = shape({a: 1}, "{a:url,b:?url}", {excludeOptional: false});
    assert.deepEqual(val, {a: 'http://example.com', b: 'http://example.com'});
  })

  it('should extend values', () => {
    let val = shape({a:{},b:[]}, "{a:{a1:i,a2:s},b:[i,s]}");
    console.log(val);
  });
});

describe('Check', () => {
  it('should throw on invalid schema', () => {
    expect(() => check({a: [1,2]}, '{a:[s]}}')).to.throw('Malformed schema');
  });
  it('should return false on invalid json', () => {
    expect(check({a: [1,2]}, '{a:[s]}')).to.be.false;
  });
  it('should return true on valid json', () => {
    expect(check({a: [1,2]}, '{a:[i]}')).to.be.true;
  });
});

describe('Verify', () => {
  it('should validate schema definition', () => {
    expect(verify({ a: [1, '2'] }, '{a:?[:i,s]}')).to.be.true;
    expect(() => verify({}, '{a:[i,s]}}')).to.throw('Malformed schema');
  });

  it('should verify simple plain objects', () => {
    expect(verify(null, '?{}')).to.be.true;
    expect(verify(null, '?[]')).to.be.true;
    expect(verify({}, '{}')).to.be.true;

    expect(verify({ a: 1, b: 2 }, '{a,b}')).to.be.true;
    expect(() => verify({ a: 1, b: 2 }, '{a,b,c}')).to.throw('json.c: is required');

    expect(verify({ a: 1, b: [] }, '{a,b:[]}')).to.be.true;

    expect(() => verify({ a: [] }, '{a,b}') === true).to.throw('json.b: is required');
    expect(verify({ a: 1 }, '{a,b:?}')).to.be.true;
    expect(verify({ a: 1, b: false }, '{a,b}')).to.be.true;
    expect(() => verify({ a: 1, b: null }, '{a,b}')).to.throw('json.b: is required');
  });

  it('should verify simple arrays', () => {
    expect(verify([], '[]')).to.be.true;
    expect(verify([{}], '[{}]')).to.be.true;
    expect(verify([1, 2, 3], '[]')).to.be.true;
    expect(() => verify([1, 2, 3], '{}')).to.throw('json: should be object');
    expect(verify([1, 2, 3], '[i]')).to.be.true;
    expect(() => verify([1, '2', 3], '[i]')).to.throw('json.1: validation failed');
  });
  
  it('should support sample defaults in schema', () => {
    expect(verify({ a: 1, b: 2 }, '{a:i:0,b:i:0,c:?:1}')).to.be.true;
    expect(() => verify({ a: 1, b: 2 }, '{a:i:0,b:s:0,c:s:1}')).to.throw('json.b: validation failed, json.c: is required');

    expect(verify([1,"hello",2,"world"], '[i:0,s:"hello world"]')).to.be.true;
    expect(() => verify([1,"hello",2,3], '[i:0,s:"hello world"]')).to.throw('json.3: validation failed');

    expect(verify(1, 'i:0')).to.be.true;
    expect(() => verify(1, 's:0')).to.throw('json: validation failed');
  });

  it('should work with custom validators', () => {
    addType('custom', function (v, args) {
      return v === 'hello';
    });
    
    assert(verify({ a: 'hello' }, '{a: custom }') === true, 'Failed');

    addType('my_val', function (v, args) {
      return v === 'hello';
    });
    assert(verify({ a: 'hello' }, '{a:my_val }') === true, 'Failed' );

    expect(() =>
      verify({ a: 'world' }, '{a:my_val }')
    ).to.throw('json.a: validation failed');

    addType('custom', function (v, args) {
      return (args.parent.type === 'foo' && v === 'bar') || (args.parent.type === 'hello' && v === 'world');
    });

    let json = [
      { type: 'hello', value: 'world' },
      { type: 'foo', value: 'bar' },
    ];

    expect(verify(json, '[{type:s, value: custom }]')).to.be.true;
    json[0].value = 'world1';
    expect(() => verify(json, '[{type:s, value: custom }]')).to.throw('json.0.value: validation failed');
  });

  it('should work with complex objects', () => {
    expect(() => verify({ a: 1, b: { c: 'a', d: [1, '2', { e: true }] } }, '{a:i,b:{c,d:[i,s,{e:i}]}}')).to.throw(
      'json.b.d.2.e: validation failed'
    );

    expect(
      verify(
        [
          { a: 1, b: 2 },
          { a: 2, b: 4 },
        ],
        '[{a:i,b:i}]'
      )
    ).to.be.true;

    expect(() =>
      verify(
        [
          { a: 1, b: 2 },
          { a: 2, b: '4' },
        ],
        '[{a:i,b:i}]'
      )
    ).to.throw('json.1.b: validation failed');
    addType('lat', (val) => val >= -90 && val <= 90);
    addType('long', (val) => val >= -180 && val <= 180);
    expect(
      verify(
        {
          markers: [
            {
              name: 'Rixos The Palm Dubai',
              location: [25.1212, 55.1535],
            },
            {
              name: 'Shangri-La Hotel',
              location: [25.2084, 55.2719],
            },
          ],
        },
        '{markers:[{name,location:[lat,long]}]}')
    ).to.be.true;

    expect(
      verify(
        {
          a: 1,
          b: 'A',
          c: { def: { e: [{ a: 1, b: ['A'], c: 'B' }] }, e: [1, 2, 3], p: 2 },
          e: 1,
          p: 1,
        },
        '{a:number,b:string,c:{ def:{ e: [ { a,b:[s],c:string } ] },e:[i],p:number,f:?string }, e:?, p, q:?, r:?}'
      )
    ).to.be.true;
  });
});
