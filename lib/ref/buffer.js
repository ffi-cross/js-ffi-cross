// CUSTOM ERRORS
// =============

// Simplified versions from Node, changed for Buffer-only usage
const errors = {};
function E(sym, getMessage, Base) {
  errors[sym] = class NodeError extends Base {
    constructor() {
      super();

      Object.defineProperty(this, "message", {
        value: getMessage.apply(this, arguments),
        writable: true,
        configurable: true,
      });

      // Add the error code to the name to include it in the stack trace.
      this.name = `${this.name} [${sym}]`;
      // Access the stack to generate the error message including the error code
      // from the name.
      this.stack; // eslint-disable-line no-unused-expressions
      // Reset the name to the actual name.
      delete this.name;
    }

    get code() {
      return sym;
    }

    set code(value) {
      Object.defineProperty(this, "code", {
        configurable: true,
        enumerable: true,
        value,
        writable: true,
      });
    }

    toString() {
      return `${this.name} [${sym}]: ${this.message}`;
    }
  };
}

E(
  "ERR_BUFFER_OUT_OF_BOUNDS",
  function (name) {
    if (name) {
      return `${name} is outside of buffer bounds`;
    }

    return "Attempt to access memory outside buffer bounds";
  },
  RangeError
);
E(
  "ERR_INVALID_ARG_TYPE",
  function (name, type, actual) {
    return `The "${name}" argument must be of type ${type}. Received type ${typeof actual}`;
  },
  TypeError
);
E(
  "ERR_OUT_OF_RANGE",
  function (str, range, input) {
    let msg = `The value of "${str}" is out of range.`;
    let received = input;
    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
      received = addNumericalSeparator(String(input));
    } else if (typeof input === "bigint") {
      received = String(input);
      if (
        input > BigInt(2) ** BigInt(32) ||
        input < -(BigInt(2) ** BigInt(32))
      ) {
        received = addNumericalSeparator(received);
      }
      received += "n";
    }
    msg += ` It must be ${range}. Received ${received}`;
    return msg;
  },
  RangeError
);

function addNumericalSeparator(val) {
  let res = "";
  let i = val.length;
  const start = val[0] === "-" ? 1 : 0;
  for (; i >= start + 4; i -= 3) {
    res = `_${val.slice(i - 3, i)}${res}`;
  }
  return `${val.slice(0, i)}${res}`;
}

// CHECK FUNCTIONS
// ===============

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset(offset, ext, length) {
  if (offset % 1 !== 0 || offset < 0)
    throw new RangeError("offset is not uint");
  if (offset + ext > length)
    throw new RangeError("Trying to access beyond buffer length");
}

function checkInt(buf, value, offset, ext, max, min) {
  if (!(buf instanceof Uint8Array)) {
    throw new TypeError('"buffer" argument must be a Uint8Array instance');
  }
  if (value > max || value < min)
    throw new RangeError('"value" argument is out of bounds');
  if (offset + ext > buf.length) throw new RangeError("Index out of range");
}

function checkBounds(buf, offset, byteLength) {
  if (!(buf instanceof Uint8Array)) {
    throw new TypeError('"buffer" argument must be a Uint8Array instance');
  }
  validateNumber(offset, "offset");
  if (buf[offset] === undefined || buf[offset + byteLength] === undefined) {
    boundsError(offset, buf.length - (byteLength + 1));
  }
}

function checkIntBI(value, min, max, buf, offset, byteLength) {
  if (typeof value !== 'bigint') {
    throw new errors.ERR_INVALID_ARG_TYPE('value', "bigint", value);
  }
  if (value > max || value < min) {
    let range;
    if (byteLength > 3) {
      if (min === 0 || min === BigInt(0)) {
        range = `>= 0n and < 2n ** ${(byteLength + 1) * 8}n`;
      } else {
        range =
          `>= -(2n ** ${(byteLength + 1) * 8 - 1}n) and < 2 ** ` +
          `${(byteLength + 1) * 8 - 1}n`;
      }
    } else {
      range = `>= ${min}n and <= ${max}n`;
    }
    throw new errors.ERR_OUT_OF_RANGE("value", range, value);
  }
  checkBounds(buf, offset, byteLength);
}

function validateNumber(value, name) {
  if (typeof value !== "number") {
    throw new errors.ERR_INVALID_ARG_TYPE(name, "number", value);
  }
}

function boundsError(value, length, type) {
  if (Math.floor(value) !== value) {
    validateNumber(value, type);
    throw new errors.ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
  }

  if (length < 0) {
    throw new errors.ERR_BUFFER_OUT_OF_BOUNDS();
  }

  throw new errors.ERR_OUT_OF_RANGE(
    type || "offset",
    `>= ${type ? 1 : 0} and <= ${length}`,
    value
  );
}

function checkIEEE754(buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError("Index out of range");
  if (offset < 0) throw new RangeError("Index out of range");
}

// EXPORTS FUNCTIONS
// =================

const endiannessValue = (function endianness() {
  var b = new ArrayBuffer(4);
  var a = new Uint32Array(b);
  var c = new Uint8Array(b);
  a[0] = 0xdeadbeef;
  if (c[0] == 0xef) return "LE";
  if (c[0] == 0xde) return "BE";
  throw new Error("unknown endianness");
})();


/**
 * A string that represents the native endianness of the machine's processor.
 * The possible values are either `"LE"` or `"BE"`.
 *
 * ```
 * console.log(buffer.endianness);
 * 'LE'
 * ```
 *
 * @name endianness
 * @type String
 */
exports.endianness = endiannessValue;

// EXPORTS READ FUNCTIONS
// ======================

/**
 * @param {Uint8Array} buf A Uint8Array
 */
exports.readUInt8 = function readUInt8(buf, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 1, buf.length);
  return buf[offset];
};

exports.readUInt16LE = function readUInt16LE(buf, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 2, buf.length);
  return buf[offset] | (buf[offset + 1] << 8);
};

exports.readUInt16BE = function readUInt16BE(buf, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 2, buf.length);
  return (buf[offset] << 8) | buf[offset + 1];
};

exports.readUInt16 =
  endiannessValue === "BE" ? exports.readUInt16BE : exports.readUInt16LE;

exports.readUInt32LE = function readUInt32LE(buf, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, buf.length);

  return (
    (buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16)) +
    buf[offset + 3] * 0x1000000
  );
};

exports.readUInt32BE = function readUInt32BE(buf, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, buf.length);

  return (
    buf[offset] * 0x1000000 +
    ((buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3])
  );
};

exports.readUInt32 =
  endiannessValue === "BE" ? exports.readUInt32BE : exports.readUInt32LE;

exports.readBigUInt64LE = function readBigUInt64LE(buf, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) {
    validateNumber(offset, "offset");
    const first = buf[offset];
    const last = buf[offset + 7];
    if (first === undefined || last === undefined) {
      boundsError(offset, buf.length - 8);
    }
  }
  const view = new DataView(buf.buffer);
  return view.getBigUint64(buf.byteOffset + offset, true);
};

exports.readBigUInt64BE = function readBigUInt64BE(buf, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) {
    validateNumber(offset, "offset");
    const first = buf[offset];
    const last = buf[offset + 7];
    if (first === undefined || last === undefined) {
      boundsError(offset, buf.length - 8);
    }
  }
  const view = new DataView(buf.buffer);
  return view.getBigUint64(buf.byteOffset + offset, false);
};

exports.readBigUInt64 =
  endiannessValue === "BE" ? exports.readBigUInt64BE : exports.readBigUInt64LE;

exports.readInt8 = function readInt8(buf, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 1, buf.length);
  if (!(buf[offset] & 0x80)) return buf[offset];
  return (0xff - buf[offset] + 1) * -1;
};

exports.readInt16LE = function readInt16LE(buf, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 2, buf.length);
  const val = buf[offset] | (buf[offset + 1] << 8);
  return val & 0x8000 ? val | 0xffff0000 : val;
};

exports.readInt16BE = function readInt16BE(buf, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 2, buf.length);
  const val = buf[offset + 1] | (buf[offset] << 8);
  return val & 0x8000 ? val | 0xffff0000 : val;
};

exports.readInt16 =
  endiannessValue === "BE" ? exports.readInt16BE : exports.readInt16LE;

exports.readInt32LE = function readInt32LE(buf, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, buf.length);

  return (
    buf[offset] |
    (buf[offset + 1] << 8) |
    (buf[offset + 2] << 16) |
    (buf[offset + 3] << 24)
  );
};

exports.readInt32BE = function readInt32BE(buf, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, buf.length);

  return (
    (buf[offset] << 24) |
    (buf[offset + 1] << 16) |
    (buf[offset + 2] << 8) |
    buf[offset + 3]
  );
};

exports.readInt32 =
  endiannessValue === "BE" ? exports.readInt32BE : exports.readInt32LE;

exports.readBigInt64LE = function readBigInt64LE(buf, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) {
    validateNumber(offset, "offset");
    const first = buf[offset];
    const last = buf[offset + 7];
    if (first === undefined || last === undefined) {
      boundsError(offset, buf.length - 8);
    }
  }
  const view = new DataView(buf.buffer);
  return view.getBigInt64(buf.byteOffset + offset, true);
};

exports.readBigInt64BE = function readBigInt64BE(buf, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) {
    validateNumber(offset, "offset");
    const first = buf[offset];
    const last = buf[offset + 7];
    if (first === undefined || last === undefined) {
      boundsError(offset, buf.length - 8);
    }
  }
  const view = new DataView(buf.buffer);
  return view.getBigInt64(buf.byteOffset + offset, false);
};

exports.readBigInt64 =
  endiannessValue === "BE" ? exports.readBigInt64BE : exports.readBigInt64LE;

exports.readFloatLE = function readFloatLE(buf, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, buf.length);
  const view = new DataView(buf.buffer);
  return view.getFloat32(buf.byteOffset + offset, true);
};

exports.readFloatBE = function readFloatBE(buf, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, buf.length);
  const view = new DataView(buf.buffer);
  return view.getFloat32(buf.byteOffset + offset, false);
};

exports.readFloat =
  endiannessValue === "BE" ? exports.readFloatBE : exports.readFloatLE;

exports.readDoubleLE = function readDoubleLE(buf, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 8, buf.length);
  const view = new DataView(buf.buffer);
  return view.getFloat64(buf.byteOffset + offset, true);
};

exports.readDoubleBE = function readDoubleBE(buf, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 8, buf.length);
  const view = new DataView(buf.buffer);
  return view.getFloat64(buf.byteOffset + offset, false);
};

exports.readDouble =
  endiannessValue === "BE" ? exports.readDoubleBE : exports.readDoubleLE;

// EXPORTS WRITE FUNCTIONS
// ======================

/**
 * @param {Uint8Array} buf A Uint8Array
 */
exports.writeUInt8 = function writeUInt8(buf, value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(buf, value, offset, 1, 0xff, 0);
  buf[offset] = value & 0xff;
  return offset + 1;
};

exports.writeUInt16LE = function writeUInt16LE(buf, value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(buf, value, offset, 2, 0xffff, 0);
  buf[offset] = value & 0xff;
  buf[offset + 1] = value >>> 8;
  return offset + 2;
};

exports.writeUInt16BE = function writeUInt16BE(buf, value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(buf, value, offset, 2, 0xffff, 0);
  buf[offset] = value >>> 8;
  buf[offset + 1] = value & 0xff;
  return offset + 2;
};

exports.writeUInt16 =
  endiannessValue === "BE" ? exports.writeUInt16BE : exports.writeUInt16LE;

exports.writeUInt32LE = function writeUInt32LE(buf, value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(buf, value, offset, 4, 0xffffffff, 0);
  buf[offset + 3] = value >>> 24;
  buf[offset + 2] = value >>> 16;
  buf[offset + 1] = value >>> 8;
  buf[offset] = value & 0xff;
  return offset + 4;
};

exports.writeUInt32BE = function writeUInt32BE(buf, value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(buf, value, offset, 4, 0xffffffff, 0);
  buf[offset] = value >>> 24;
  buf[offset + 1] = value >>> 16;
  buf[offset + 2] = value >>> 8;
  buf[offset + 3] = value & 0xff;
  return offset + 4;
};

exports.writeUInt32 =
  endiannessValue === "BE" ? exports.writeUInt32BE : exports.writeUInt32LE;

/**
 * Write BigInt into buf with offset
 * @param {Uint8Array} buf A Buffer instance to base the returned Buffer off of.
 */
exports.writeBigUInt64LE = function writeBigUInt64LE(
  buf,
  value,
  offset,
  noAssert
) {
  offset = offset >>> 0;
  if (!noAssert)
    checkIntBI(value, BigInt(0), BigInt("0xffffffffffffffff"), buf, offset, 7);
  const view = new DataView(buf.buffer);
  view.setBigUint64(buf.byteOffset + offset, value, true);
  return offset + 8;
};

/**
 * Write BigInt into buf with offset
 * @param {Uint8Array} buf A Buffer instance to base the returned Buffer off of.
 */
exports.writeBigUInt64BE = function writeBigUInt64BE(
  buf,
  value,
  offset,
  noAssert
) {
  offset = offset >>> 0;
  if (!noAssert)
    checkIntBI(value, BigInt(0), BigInt("0xffffffffffffffff"), buf, offset, 7);
  const view = new DataView(buf.buffer);
  view.setBigUint64(buf.byteOffset + offset, value, false);
  return offset + 8;
};

exports.writeBigUInt64 =
  endiannessValue === "BE"
    ? exports.writeBigUInt64BE
    : exports.writeBigUInt64LE;

exports.writeInt8 = function writeInt8(buf, value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(buf, value, offset, 1, 0x7f, -0x80);
  if (value < 0) value = 0xff + value + 1;
  buf[offset] = value & 0xff;
  return offset + 1;
};

exports.writeInt16LE = function writeInt16LE(buf, value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(buf, value, offset, 2, 0x7fff, -0x8000);
  buf[offset] = value & 0xff;
  buf[offset + 1] = value >>> 8;
  return offset + 2;
};

exports.writeInt16BE = function writeInt16BE(buf, value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(buf, value, offset, 2, 0x7fff, -0x8000);
  buf[offset] = value >>> 8;
  buf[offset + 1] = value & 0xff;
  return offset + 2;
};

exports.writeInt16 =
  endiannessValue === "BE" ? exports.writeInt16BE : exports.writeInt16LE;

exports.writeInt32LE = function writeInt32LE(buf, value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(buf, value, offset, 4, 0x7fffffff, -0x80000000);
  buf[offset] = value & 0xff;
  buf[offset + 1] = value >>> 8;
  buf[offset + 2] = value >>> 16;
  buf[offset + 3] = value >>> 24;
  return offset + 4;
};

exports.writeInt32BE = function writeInt32BE(buf, value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(buf, value, offset, 4, 0x7fffffff, -0x80000000);
  if (value < 0) value = 0xffffffff + value + 1;
  buf[offset] = value >>> 24;
  buf[offset + 1] = value >>> 16;
  buf[offset + 2] = value >>> 8;
  buf[offset + 3] = value & 0xff;
  return offset + 4;
};

exports.writeInt32 =
  endiannessValue === "BE" ? exports.writeInt32BE : exports.writeInt32LE;

/**
 * Write BigInt into buf with offset
 * @param {Uint8Array} buf A Buffer instance to base the returned Buffer off of.
 */
exports.writeBigInt64LE = function writeBigInt64LE(
  buf,
  value,
  offset,
  noAssert
) {
  offset = offset >>> 0;
  if (!noAssert)
    checkIntBI(
      value,
      -BigInt("0x8000000000000000"),
      BigInt("0x7fffffffffffffff"),
      buf,
      offset,
      7
    );
  const view = new DataView(buf.buffer);
  view.setBigInt64(buf.byteOffset + offset, value, true);
  return offset + 8;
};

/**
 * Write BigInt into buf with offset
 * @param {Uint8Array} buf A Buffer instance to base the returned Buffer off of.
 */
exports.writeBigInt64BE = function writeBigInt64BE(
  buf,
  value,
  offset,
  noAssert
) {
  offset = offset >>> 0;
  if (!noAssert)
    checkIntBI(
      value,
      -BigInt("0x8000000000000000"),
      BigInt("0x7fffffffffffffff"),
      buf,
      offset,
      7
    );
  const view = new DataView(buf.buffer);
  view.setBigInt64(buf.byteOffset + offset, value, false);
  return offset + 8;
};

exports.writeBigInt64 =
  endiannessValue === "BE" ? exports.writeBigInt64BE : exports.writeBigInt64LE;

/**
 * Write BigInt into buf with offset
 * @param {Uint8Array} buf A Buffer instance to base the returned Buffer off of.
 */
exports.writeFloatLE = function writeFloatLE(buf, value, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) {
    checkIEEE754(
      buf,
      value,
      offset,
      4,
      3.4028234663852886e38,
      -3.4028234663852886e38
    );
  }
  const view = new DataView(buf.buffer);
  view.setFloat32(buf.byteOffset + offset, value, true);
  return offset + 4;
};

exports.writeFloatBE = function writeFloatBE(buf, value, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) {
    checkIEEE754(
      buf,
      value,
      offset,
      4,
      3.4028234663852886e38,
      -3.4028234663852886e38
    );
  }
  const view = new DataView(buf.buffer);
  view.setFloat32(buf.byteOffset + offset, value, false);
  return offset + 4;
};

exports.writeFloat =
  endiannessValue === "BE" ? exports.writeFloatBE : exports.writeFloatLE;

exports.writeDoubleLE = function writeDoubleLE(buf, value, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) {
    checkIEEE754(
      buf,
      value,
      offset,
      8,
      1.7976931348623157e308,
      -1.7976931348623157e308
    );
  }
  const view = new DataView(buf.buffer);
  view.setFloat64(buf.byteOffset + offset, value, true);
  return offset + 8;
};

exports.writeDoubleBE = function writeDoubleBE(buf, value, offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) {
    checkIEEE754(
      buf,
      value,
      offset,
      8,
      1.7976931348623157e308,
      -1.7976931348623157e308
    );
  }
  const view = new DataView(buf.buffer);
  view.setFloat64(buf.byteOffset + offset, value, false);
  return offset + 8;
};

exports.writeDouble =
  endiannessValue === "BE" ? exports.writeDoubleBE : exports.writeDoubleLE;
