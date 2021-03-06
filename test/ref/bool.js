'use strict';
const assert = require('assert');
const { ref } = require('../..');

describe('bool', function() {
  const buf = ref.alloc('bool');

  it('should return JS "false" for a value of 0', function() {
    buf[0] = 0;
    assert.strictEqual(false, ref.get(buf));
  });

  it('should return JS "true" for a value of 1', function() {
    buf[0] = 1;
    assert.strictEqual(true, ref.get(buf));
  });

  it('should write a JS "false" value as 0', function() {
    ref.set(buf, false, 0);
    assert.strictEqual(0, buf[0]);
  });

  it('should write a JS "true" value as 1', function() {
    ref.set(buf, true, 0);
    assert.strictEqual(1, buf[0]);
  });

  it('should allow uint8 number values to be written to it', function() {
    const val = 255;
    ref.set(buf, val, 0);
    assert.strictEqual(true, ref.get(buf));
    assert.strictEqual(val, buf[0]);
  });
});
