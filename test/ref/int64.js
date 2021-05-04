'use strict';
const assert = require('assert');
const { ref } = require('../..');
const buffer = require('../../lib/ref/buffer');

describe('int64', function() {
  const JS_MAX_INT = BigInt(+Number.MAX_SAFE_INTEGER);
  const JS_MIN_INT = BigInt(-Number.MIN_SAFE_INTEGER);

  it('should allow simple ints to be written and read', function() {
    const buf = Buffer.alloc(ref.sizeof.int64);
    const val = 123456789n;
    buffer.writeBigInt64(buf, val, 0);
    const rtn = buffer.readBigInt64(buf, 0);
    assert.strictEqual(val, rtn);
  });

  it('should allow INT64_MAX to be written and read', function() {
    const buf = Buffer.alloc(ref.sizeof.int64);
    const val = 9223372036854775807n;
    buffer.writeBigInt64(buf, val, 0);
    const rtn = buffer.readBigInt64(buf, 0);
    assert.strictEqual(val, rtn);
  });

  it('should allow a hex String to be input (signed)', function() {
    const buf = Buffer.alloc(ref.sizeof.int64);
    const val = '-0x1234567890';
    buffer.writeBigInt64(buf, BigInt(parseInt(val, 16)), 0);
    const rtn = buffer.readBigInt64(buf, 0);
    assert.strictEqual(BigInt(parseInt(val, 16)), rtn);
  });

  it('should allow an octal String to be input (signed)', function() {
    const buf = Buffer.alloc(ref.sizeof.int64);
    const val = '-0777';
    buffer.writeBigInt64(buf, BigInt(parseInt(val, 8)), 0);
    const rtn = buffer.readBigInt64(buf, 0);
    assert.strictEqual(BigInt(parseInt(val, 8)), rtn);
  });

  it('should allow a hex String to be input (unsigned)', function() {
    const buf = Buffer.alloc(ref.sizeof.uint64);
    const val = '0x1234567890';
    buffer.writeBigInt64(buf, BigInt(parseInt(val, 16)), 0);
    const rtn = buffer.readBigInt64(buf, 0);
    assert.strictEqual(BigInt(parseInt(val, 16)), rtn);
  });

  it('should allow an octal String to be input (unsigned)', function() {
    const buf = Buffer.alloc(ref.sizeof.uint64);
    const val = '0777';
    buffer.writeBigInt64(buf, BigInt(parseInt(val, 8)), 0);
    const rtn = buffer.readBigInt64(buf, 0);
    assert.strictEqual(BigInt(parseInt(val, 8)), rtn);
  });

  it('should return a Number when reading JS_MIN_INT', function() {
    const buf = Buffer.alloc(ref.sizeof.int64);
    buffer.writeBigInt64(buf, JS_MIN_INT, 0);
    const rtn = buffer.readBigInt64(buf, 0);
    assert.strictEqual('bigint', typeof rtn);
    assert.strictEqual(JS_MIN_INT, rtn);
  });

  it('should return a Number when reading JS_MAX_INT', function() {
    const buf = Buffer.alloc(ref.sizeof.int64);
    buffer.writeBigInt64(buf, JS_MAX_INT, 0);
    const rtn = buffer.readBigInt64(buf, 0);
    assert.strictEqual('bigint', typeof rtn);
    assert.strictEqual(JS_MAX_INT, rtn);
  });

  it('should return a String when reading JS_MAX_INT+1', function() {
    const buf = Buffer.alloc(ref.sizeof.int64);
    const plus_one = 9007199254740993n;
    buffer.writeBigInt64(buf, plus_one, 0);
    const rtn = buffer.readBigInt64(buf, 0);
    assert.strictEqual('bigint', typeof rtn);
    assert.strictEqual(plus_one, rtn);
  });

  it('should return a String when reading JS_MIN_INT-1', function() {
    const buf = Buffer.alloc(ref.sizeof.int64);
    const minus_one = -9007199254740993n;
    buffer.writeBigInt64(buf, minus_one, 0);
    const rtn = buffer.readBigInt64(buf, 0);
    assert.strictEqual('bigint', typeof rtn);
    assert.strictEqual(minus_one, rtn);
  });

  it('should return a Number when reading 0, even when written as a String', function() {
    const buf = Buffer.alloc(ref.sizeof.int64);
    const zero = 0n;
    buffer.writeBigInt64(buf, zero, 0);
    const rtn = buffer.readBigInt64(buf, 0);
    assert.strictEqual('bigint', typeof rtn);
    assert.strictEqual(0n, rtn);
  });

  it('should throw a "no digits" Error when writing an invalid String (signed)', function() {
    assert.throws(() => {
      const buf = Buffer.alloc(ref.sizeof.int64);
      buffer.writeBigInt64(buf, 'foo', 0);
    }, /The "value" argument must be of type bigint. Received type string/);
  });

  it('should throw a "no digits" Error when writing an invalid String (unsigned)', function() {
    assert.throws(() => {
      const buf = Buffer.alloc(ref.sizeof.uint64);
      buffer.writeBigInt64(buf, 'foo', 0);
    }, /The "value" argument must be of type bigint. Received type string/);
  });

  it('should throw an "out of range" Error when writing an invalid bigint (signed)', function() {
    let e;
    try {
      const buf = Buffer.alloc(ref.sizeof.int64)
      buffer.writeBigInt64(buf, -10000000000000000000000000n, 0)
    } catch (_e) {
      e = _e;
    }
    assert(/The value of \"value\" is out of range. It must be >= -\(2n \*\* 63n\) and < 2 \*\* 63n/.test(e.message));
  });

  it('should throw an "out of range" Error when writing an invalid bigint (unsigned)', function() {
    let e;
    try {
      const buf = Buffer.alloc(ref.sizeof.uint64);
      buffer.writeBigInt64(buf, 10000000000000000000000000n, 0);
    } catch (_e) {
      e = _e;
    }
    assert(/The value of \"value\" is out of range. It must be >= -\(2n \*\* 63n\) and < 2 \*\* 63n/.test(e.message));
  });

  it('should throw an Error when reading an int64_t from the NULL pointer', function() {
    assert.throws(() => {
      buffer.readBigInt64(ref.NULL);
    });
  });

  it('should throw an Error when reading an uint64_t from the NULL pointer', function() {
    assert.throws(() => {
      buffer.readBigInt64(ref.NULL);
    });
  });

  ['LE', 'BE'].forEach((endianness) => {
    describe(endianness, function() {
      it('should read and write a signed ' + endianness + ' 64-bit integer', function() {
        const val = -123456789n;
        const buf = Buffer.alloc(ref.sizeof.int64);
        buffer['writeBigInt64' + endianness](buf, val, 0);
        assert.strictEqual(val, buffer['readBigInt64' + endianness](buf, 0));
      });

      it('should read and write an unsigned ' + endianness + ' 64-bit integer', function() {
        const val = 123456789n;
        const buf = Buffer.alloc(ref.sizeof.uint64);
        buffer['writeBigInt64' + endianness](buf, val, 0);
        assert.strictEqual(val, buffer['readBigInt64' + endianness](buf, 0));
      });
    });
  });
});
