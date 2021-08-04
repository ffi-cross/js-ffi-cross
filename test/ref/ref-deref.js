'use strict';
const assert = require('assert');
const { ref } = require('../..');

describe('ref(), deref()', function() {
  beforeEach(gc);

  it('should work 1 layer deep', function() {
    const test = Buffer.from('one layer deep');
    const one = ref.ref(test);
    const _test = ref.deref(one);
    assert.strictEqual(test.length, _test.length);
    assert.strictEqual(test.toString(), _test.toString());
  });

  it('should work 2 layers deep', function() {
    const test = Buffer.from('two layers deep');
    const one = ref.ref(test);
    const two = ref.ref(one);
    const _one = ref.deref(two);
    const _test = ref.deref(_one);
    assert.strictEqual(ref.address(one), ref.address(_one));
    assert.strictEqual(ref.address(test), ref.address(_test));
    assert.strictEqual(one.length, _one.length);
    assert.strictEqual(test.length, _test.length);
    assert.strictEqual(test.toString(), _test.toString());
  });

  it('should throw when derefing a Buffer with no "type"', function() {
    const test = Buffer.from('???');
    assert.throws(() => {
      ref.deref(test);
    }, /unknown "type"/);
  });

  it('should throw when derefing a Buffer with no "type" 2', function() {
    const test = Buffer.from('???');
    const r = ref.ref(test);
    const _test = ref.deref(r);
    assert.strictEqual(ref.address(test), ref.address(_test));
    assert.throws(() => {
      ref.deref(_test)
    }, /unknown "type"/);
  })

  it('should deref() a "char" type properly', function() {
    const types = [ref.types.char, ref.types.uchar]
    for (let t of types) {
      const test = Buffer.alloc(t.size);
      test.type = t;
      test[0] = 50;
      assert.strictEqual('2', ref.deref(test));
      test[0] = 127;
      assert.strictEqual('\x7F', ref.deref(test));
      test[0] = 128;
      assert.strictEqual('\x80', ref.deref(test));
      test[0] = 129;
      assert.strictEqual('\x81', ref.deref(test));
      test[0] = 161;
      assert.strictEqual('¡', ref.deref(test));
      test[0] = 255;
      assert.strictEqual('ÿ', ref.deref(test));
    }
  });

  it('should not throw when calling ref()/deref() on a `void` type', function() {
    const test = ref.alloc(ref.types.void);
    assert.strictEqual(undefined, ref.deref(test));
  });
});
