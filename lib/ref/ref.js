'use strict';
const assert = require('assert');
const inspect = require('util').inspect;
const debug = require('debug')('ref');
const buffer = require('./buffer')
const bindings = require('../bindings');

const nativeRef = bindings.ref;

exports = module.exports = nativeRef;

/**
 * A `Buffer` that references the C NULL pointer. That is, its memory address
 * points to 0. Its `length` is 0 because accessing any data from this buffer
 * would cause a _segmentation fault_.
 *
 * ```
 * console.log(ref.NULL);
 * <SlowBuffer@0x0 >
 * ```
 *
 * @name NULL
 * @type Buffer
 */

/**
 * A string that represents the native endianness of the machine's processor.
 * The possible values are either `"LE"` or `"BE"`.
 *
 * ```
 * console.log(ref.endianness);
 * 'LE'
 * ```
 *
 * @name endianness
 * @type String
 */

exports.endianness = buffer.endianness;

/**
 * Accepts a `Buffer` instance and returns the memory address of the buffer
 * instance. Returns a JavaScript BigInt
 * ```
 * console.log(ref.address(new Buffer(1)));
 * 4320233616n
 *
 * console.log(ref.address(ref.NULL)));
 * 0n
 * ```
 *
 * @param {Buffer} buffer The buffer to get the memory address of.
 * @return {BigInt} The memory address the buffer instance.
 * @name address
 * @type method
 */

/**
 * Accepts a `Buffer` instance and returns _true_ if the buffer represents the
 * NULL pointer, _false_ otherwise.
 *
 * ```
 * console.log(ref.isNull(new Buffer(1)));
 * false
 *
 * console.log(ref.isNull(ref.NULL));
 * true
 * ```
 *
 * @param {Buffer} buffer The buffer to check for NULL.
 * @return {Boolean} true or false.
 * @name isNull
 * @type method
 */

/**
 * Reads a JavaScript Object that has previously been written to the given
 * _buffer_ at the given _offset_.
 *
 * ```
 * var obj = { foo: 'bar' };
 * var buf = ref.alloc('Object', obj);
 *
 * var obj2 = ref.readObject(buf, 0);
 * console.log(obj === obj2);
 * true
 * ```
 *
 * @param {Buffer} buffer The buffer to read an Object from.
 * @param {Number} offset The offset to begin reading from.
 * @return {Object} The Object that was read from _buffer_.
 * @name readObject
 * @type method
 */

/**
 * Reads a Buffer instance from the given _buffer_ at the given _offset_.
 * The _size_ parameter specifies the `length` of the returned Buffer instance,
 * which defaults to __0__.
 *
 * ```
 * var buf = new Buffer('hello world');
 * var pointer = ref.alloc('pointer', buf);
 *
 * var buf2 = ref.readPointer(pointer, 0, buf.length);
 * console.log(buf2.toString());
 * 'hello world'
 * ```
 *
 * @param {Buffer} buffer The buffer to read a Buffer from.
 * @param {Number} offset The offset to begin reading from.
 * @param {Number} length (optional) The length of the returned Buffer. Defaults to 0.
 * @return {Buffer} The Buffer instance that was read from _buffer_.
 * @name readPointer
 * @type method
 */

/**
 * Returns a JavaScript String read from _buffer_ at the given _offset_. The
 * C String is read until the first NULL byte, which indicates the end of the
 * String.
 *
 * This function can read beyond the `length` of a Buffer.
 *
 * ```
 * var buf = new Buffer('hello\0world\0');
 *
 * var str = ref.readCString(buf, 0);
 * console.log(str);
 * 'hello'
 * ```
 *
 * @param {Buffer} buffer The buffer to read a Buffer from.
 * @param {Number} offset The offset to begin reading from.
 * @param {String} encoding (optional) The encoding to read the C string as. Defaults to __'utf8'__.
 * @return {String} The String that was read from _buffer_.
 * @name readCString
 * @type method
 */

exports.readCString = function readCString (buf, offset, encoding) {
  encoding = typeof encoding !== 'string' ? 'utf8' : encoding;
  return exports._reinterpretUntilZeros8(buf, offset >>> 0).toString(encoding)
}

/**
 * Returns a new clone of the given "type" object, with its
 * `indirection` level incremented by **1**.
 *
 * Say you wanted to create a type representing a `void *`:
 *
 * ```
 * var voidPtrType = ref.refType(ref.types.void);
 * ```
 *
 * @param {Object|String} type The "type" object to create a reference type from. Strings get coerced first.
 * @return {Object} The new "type" object with its `indirection` incremented by 1.
 */

exports.refType = function refType (type) {
  const _type = exports.coerceType(type);
  const rtn = Object.create(_type);
  rtn.indirection++;
  if (_type.name) {
    Object.defineProperty(rtn, 'name', {
      value: _type.name + '*',
      configurable: true,
      enumerable: true,
      writable: true
    });
  }
  return rtn;
}

/**
 * Returns a new clone of the given "type" object, with its
 * `indirection` level decremented by 1.
 *
 * @param {Object|String} type The "type" object to create a dereference type from. Strings get coerced first.
 * @return {Object} The new "type" object with its `indirection` decremented by 1.
 */

exports.derefType = function derefType (type) {
  const _type = exports.coerceType(type);
  if (_type.indirection === 1) {
    throw new Error('Cannot create deref\'d type for type with indirection 1');
  }
  let rtn = Object.getPrototypeOf(_type);
  if (rtn.indirection !== _type.indirection - 1) {
    // slow case
    rtn = Object.create(_type);
    rtn.indirection--;
  }
  return rtn;
}

/**
 * Coerces a "type" object from a String or an actual "type" object. String values
 * are looked up from the `ref.types` Object. So:
 *
 *   * `"int"` gets coerced into `ref.types.int`.
 *   * `"int *"` gets translated into `ref.refType(ref.types.int)`
 *   * `ref.types.int` gets translated into `ref.types.int` (returns itself)
 *
 * Throws an Error if no valid "type" object could be determined. Most `ref`
 * functions use this function under the hood, so anywhere a "type" object is
 * expected, a String may be passed as well, including simply setting the
 * `buffer.type` property.
 *
 * ```
 * var type = ref.coerceType('int **');
 *
 * console.log(type.indirection);
 * 3
 * ```
 *
 * @param {Object|String} type The "type" Object or String to coerce.
 * @return {Object} A "type" object
 */

exports.coerceType = function coerceType (type) {
  let rtn = type;
  if (typeof rtn === 'string') {
    rtn = exports.types[type];
    if (rtn) return rtn;

    // strip whitespace
    rtn = type.replace(/\s+/g, '').toLowerCase();
    if (rtn === 'pointer') {
      // legacy "pointer" being used :(
      rtn = exports.refType(exports.types.void); // void *
    } else if (rtn === 'string') {
      rtn = exports.types.CString; // special char * type
    } else {
      var refCount = 0;
      rtn = rtn.replace(/\*/g, function() {
        refCount++;
        return '';
      });
      // allow string names to be passed in
      rtn = exports.types[rtn];
      if (refCount > 0) {
        if (!(rtn && 'size' in rtn && 'indirection' in rtn)) {
          throw new TypeError('could not determine a proper "type" from: ' + inspect(type));
        }
        for (let i = 0; i < refCount; i++) {
          rtn = exports.refType(rtn);
        }
      }
    }
  }
  if (!(rtn && 'size' in rtn && 'indirection' in rtn)) {
    throw new TypeError('could not determine a proper "type" from: ' + inspect(type));
  }
  return rtn;
}

/**
 * Returns the "type" property of the given Buffer.
 * Creates a default type for the buffer when none exists.
 *
 * @param {Buffer} buffer The Buffer instance to get the "type" object from.
 * @return {Object} The "type" object from the given Buffer.
 */

exports.getType = function getType (buffer) {
  if (!buffer.type) {
    debug('WARN: no "type" found on buffer, setting default "type"', buffer);
    buffer.type = {};
    buffer.type.size = buffer.length;
    buffer.type.indirection = 1;
    buffer.type.get = function get () {
      throw new Error('unknown "type"; cannot get()');
    };
    buffer.type.set = function set () {
      throw new Error('unknown "type"; cannot set()');
    };
  }
  return exports.coerceType(buffer.type);
}

/**
 * Calls the `get()` function of the Buffer's current "type" (or the
 * passed in _type_ if present) at the given _offset_.
 *
 * This function handles checking the "indirection" level and returning a
 * proper "dereferenced" Bufffer instance when necessary.
 *
 * @param {Buffer} buffer The Buffer instance to read from.
 * @param {Number} offset (optional) The offset on the Buffer to start reading from. Defaults to 0.
 * @param {Object|String} type (optional) The "type" object to use when reading. Defaults to calling `getType()` on the buffer.
 * @return {?} Whatever value the "type" used when reading returns.
 */

exports.get = function get (buffer, offset, type) {
  if (!offset) {
    offset = 0;
  }
  if (type) {
    type = exports.coerceType(type);
  } else {
    type = exports.getType(buffer);
  }
  debug('get(): (offset: %d)', offset, buffer);
  assert(type.indirection > 0, `"indirection" level must be at least 1, saw ${type.indirection}`);
  if (type.indirection === 1) {
    // need to check "type"
    return type.get(buffer, offset);
  } else {
    // need to create a deref'd Buffer
    const size = type.indirection === 2 ? type.size : exports.sizeof.pointer;
    const reference = exports.readPointer(buffer, offset, size);
    reference.type = exports.derefType(type);
    return reference;
  }
}

/**
 * Calls the `set()` function of the Buffer's current "type" (or the
 * passed in _type_ if present) at the given _offset_.
 *
 * This function handles checking the "indirection" level writing a pointer rather
 * than calling the `set()` function if the indirection is greater than 1.
 *
 * @param {Buffer} buffer The Buffer instance to write to.
 * @param {?} value The value to write to the Buffer instance.
 * @param {Number} offset The offset on the Buffer to start writing to.
 * @param {Object|String} type (optional) The "type" object to use when reading. Defaults to calling `getType()` on the buffer.
 */

exports.set = function set (buffer, value, offset, type) {
  if (!offset) {
    offset = 0;
  }
  if (type) {
    type = exports.coerceType(type);
  } else {
    type = exports.getType(buffer);
  }
  debug('set(): (offset: %d)', offset, buffer, value);
  assert(type.indirection >= 1, '"indirection" level must be at least 1');
  if (type.indirection === 1) {
    type.set(buffer, value, offset);
  } else {
    exports.writePointer(buffer, value, offset);
  }
}


/**
 * Returns a new Buffer instance big enough to hold `type`,
 * with the given `value` written to it.
 *
 * ``` js
 * var intBuf = ref.alloc(ref.types.int)
 * var int_with_4 = ref.alloc(ref.types.int, 4)
 * ```
 *
 * @param {Object|String} type The "type" object to allocate. Strings get coerced first.
 * @param {?} value (optional) The initial value set on the returned Buffer, using _type_'s `set()` function.
 * @return {Buffer} A new Buffer instance with it's `type` set to "type", and (optionally) "value" written to it.
 */

exports.alloc = function alloc (_type, value) {
  var type = exports.coerceType(_type);
  debug('allocating Buffer for type with "size"', type.size);
  let size;
  if (type.indirection === 1) {
    size = type.size;
  } else {
    size = exports.sizeof.pointer;
  }
  const buffer = Buffer.alloc(size);
  buffer.type = type;
  if (arguments.length >= 2) {
    debug('setting value on allocated buffer', value);
    exports.set(buffer, value, 0, type);
  }
  return buffer;
}

/**
 * Returns a new `Buffer` instance with the given String written to it with the
 * given encoding (defaults to __'utf8'__). The buffer is 1 byte longer than the
 * string itself, and is NUL terminated.
 *
 * ```
 * var buf = ref.allocCString('hello world');
 *
 * console.log(buf.toString());
 * 'hello world\u0000'
 * ```
 *
 * @param {String} string The JavaScript string to be converted to a C string.
 * @param {String} encoding (optional) The encoding to use for the C string. Defaults to __'utf8'__.
 * @return {Buffer} The new `Buffer` instance with the specified String wrtten to it, and a trailing NUL byte.
 */

exports.allocCString = function allocCString (string, encoding) {
  if (null == string || (Buffer.isBuffer(string) && exports.isNull(string))) {
    return exports.NULL;
  }
  const size = Buffer.byteLength(string, encoding) + 1;
  const buffer = Buffer.allocUnsafe(size);
  exports.writeCString(buffer, string, 0, encoding);
  buffer.type = charPtrType;
  return buffer;
}

/**
 * Writes the given string as a C String (NULL terminated) to the given buffer
 * at the given offset. "encoding" is optional and defaults to __'utf8'__.
 *
 * Unlike `readCString()`, this function requires the buffer to actually have the
 * proper length.
 *
 * @param {Buffer} buffer The Buffer instance to write to.
 * @param {String} string The JavaScript String to write that will be written to the buffer.
 * @param {Number} offset The offset of the buffer to begin writing at.
 * @param {String} encoding (optional) The encoding to read the C string as. Defaults to __'utf8'__.
 */

exports.writeCString = function writeCString (buffer, string, offset, encoding) {
  assert(Buffer.isBuffer(buffer), 'expected a Buffer as the first argument');
  assert.strictEqual('string', typeof string, 'expected a "string" as the third argument');
  if (!offset) {
    offset = 0;
  }
  if (!encoding) {
    encoding = 'utf8';
  }
  const size = buffer.length - offset - 1;
  const len = buffer.write(string, offset, size, encoding);
  buffer.writeUInt8(0, offset + len);  // NUL terminate
}

/**
 * `ref()` accepts a Buffer instance and returns a new Buffer
 * instance that is "pointer" sized and has its data pointing to the given
 * Buffer instance. Essentially the created Buffer is a "reference" to the
 * original pointer, equivalent to the following C code:
 *
 * ``` c
 * char *buf = buffer;
 * char **ref = &buf;
 * ```
 *
 * @param {Buffer | ArrayTypeValue | StructTypeValue | UnionTypeValue} buffer A Buffer instance to create a reference to.
 * @return {Buffer} A new Buffer instance pointing to _buffer_.
 */

exports.ref = function ref (buffer) {
  if (buffer instanceof Uint8Array) {
    debug('creating a reference to buffer', buffer);
    var type = exports.refType(exports.getType(buffer));
    return exports.alloc(type, buffer);
  } else {
    return buffer.refOverride()
  }
}

/**
 * Accepts a Buffer instance and attempts to "dereference" it.
 * That is, first it checks the `indirection` count of _buffer_'s "type", and if
 * it's greater than __1__ then it merely returns another Buffer, but with one
 * level less `indirection`.
 *
 * When _buffer_'s indirection is at __1__, then it checks for `buffer.type`
 * which should be an Object with its own `get()` function.
 *
 * ```
 * var buf = ref.alloc('int', 6);
 *
 * var val = ref.deref(buf);
 * console.log(val);
 * 6
 * ```
 *
 *
 * @param {Buffer} buffer A Buffer instance to dereference.
 * @return {?} The returned value after dereferencing _buffer_.
 */

exports.deref = function deref (buffer) {
  debug('dereferencing buffer', buffer);
  return exports.get(buffer);
}

const kAttachedRefs = Symbol('attached');

/**
 * Attaches _object_ to _buffer_ such that it prevents _object_ from being garbage
 * collected until _buffer_ does.
 *
 * @param {Buffer} buffer A Buffer instance to attach _object_ to.
 * @param {Object|Buffer} object An Object or Buffer to prevent from being garbage collected until _buffer_ does.
 * @api private
 */

exports._attach = function _attach (buf, obj) {
  if (!buf[kAttachedRefs]) {
    buf[kAttachedRefs] = [];
  }
  buf[kAttachedRefs].push(obj);
}

/**
 * @param {Buffer} buffer
 * @param {Number} offset
 * @param {Object} object
 * @name _writeObject
 * @api private
 */

/**
 * Writes a pointer to _object_ into _buffer_ at the specified _offset.
 *
 * This function "attaches" _object_ to _buffer_ to prevent it from being garbage
 * collected.
 *
 * ```
 * var buf = ref.alloc('Object');
 * ref.writeObject(buf, { foo: 'bar' }, 0);
 *
 * ```
 *
 * @param {Buffer} buffer A Buffer instance to write _object_ to.
 * @param {Object} object The Object to be written into _buffer_.
 * @param {Number} offset The offset on the Buffer to start writing at.
 */

exports.writeObject = function writeObject (buf, obj, offset) {
  debug('writing Object to buffer', buf, obj, offset);
  exports._writeObject(buf, obj, offset);
  exports._attach(buf, obj);
}


/**
 * Same as `ref.writePointer()`, except that this version does not attach
 * _pointer_ to _buffer_, which is potentially unsafe if the garbage collector
 * runs.
 *
 * @param {Buffer} buffer A Buffer instance to write _pointer to.
 * @param {Buffer} pointer The Buffer instance whose memory address will be written to _buffer_.
 * @param {Number} offset The offset on the Buffer to start writing at.
 * @param {Boolean} reference if create a node-api reference and finalizer to ensure that
 *  the buffer whoes pointer is written can only be collected after the finalizers for the buffer
 *  to which the pointer was written have already run
 * @name _writePointer
 * @api private
 */

/**
 * Writes the memory address of _pointer_ to _buffer_ at the specified _offset_.
 *
 * This function "attaches" _object_ to _buffer_ to prevent it from being garbage
 * collected.
 *
 * ```
 * var someBuffer = new Buffer('whatever');
 * var buf = ref.alloc('pointer');
 * ref.writePointer(buf, someBuffer, 0);
 * ```
 *
 * @param {Buffer} buffer A Buffer instance to write _pointer to.
 * @param {Buffer} pointer The Buffer instance whose memory address will be written to _buffer_.
 * @param {Number} offset The offset on the Buffer to start writing at.
 */

exports.writePointer = function writePointer (buf, ptr, offset) {
  debug('writing pointer to buffer', buf, ptr, offset);
  // Passing true as a fourth parameter does an a stronger
  // version of attach which ensures ptr is only collected after
  // the finalizer for buf has run. See
  // for why this is necessary
  exports._writePointer(buf, ptr, offset >>> 0, true);
};

/**
 * Same as `ref.reinterpret()`, except that this version does not attach
 * _buffer_ to the returned Buffer, which is potentially unsafe if the
 * garbage collector runs.
 *
 * @param {Buffer} buffer A Buffer instance to base the returned Buffer off of.
 * @param {Number} size The `length` property of the returned Buffer.
 * @param {Number} offset The offset of the Buffer to begin from.
 * @return {Buffer} A new Buffer instance with the same memory address as _buffer_, and the requested _size_.
 * @name _reinterpret
 * @api private
 */

/**
 * Returns a new Buffer instance with the specified _size_, with the same memory
 * address as _buffer_.
 *
 * This function "attaches" _buffer_ to the returned Buffer to prevent it from
 * being garbage collected.
 *
 * @param {Buffer} buffer A Buffer instance to base the returned Buffer off of.
 * @param {Number} size The `length` property of the returned Buffer.
 * @param {Number} offset The offset of the Buffer to begin from.
 * @return {Buffer} A new Buffer instance with the same memory address as _buffer_, and the requested _size_.
 */

exports.reinterpret = function reinterpret (buffer, size, offset) {
  debug('reinterpreting buffer to "%d" bytes', size);
  const rtn = exports._reinterpret(buffer, size, offset >>> 0);
  exports._attach(rtn, buffer);
  return rtn;
}

/**
 * Same as `ref.reinterpretUntilZeros()`, except that this version does not
 * attach _buffer_ to the returned Buffer, which is potentially unsafe if the
 * garbage collector runs.
 *
 * @param {Buffer} buffer A Buffer instance to base the returned Buffer off of.
 * @param {Number} size The number of sequential, aligned `NULL` bytes that are required to terminate the buffer.
 * @param {Number} offset The offset of the Buffer to begin from.
 * @return {Buffer} A new Buffer instance with the same memory address as _buffer_, and a variable `length` that is terminated by _size_ NUL bytes.
 * @name _reinterpretUntilZeros
 * @api private
 */

/**
 * Accepts a `Buffer` instance and a number of `NULL` bytes to read from the
 * pointer. This function will scan past the boundary of the Buffer's `length`
 * until it finds `size` number of aligned `NULL` bytes.
 *
 * This is useful for finding the end of NUL-termintated array or C string.
 *
 * This function "attaches" _buffer_ to the returned Buffer to prevent it from
 * being garbage collected.
 *
 * @param {Buffer} buffer A Buffer instance to base the returned Buffer off of.
 * @param {Number} size The number of sequential, aligned `NULL` bytes are required to terminate the buffer.
 * @param {Number} offset The offset of the Buffer to begin from.
 * @return {Buffer} A new Buffer instance with the same memory address as _buffer_, and a variable `length` that is terminated by _size_ NUL bytes.
 */

exports.reinterpretUntilZeros = function reinterpretUntilZeros (buffer, size, offset) {
  debug('reinterpreting buffer to until "%d" NULL (0) bytes are found', size);
  const bitCount = size * 8;
  const _reinterpretUntilZeros = exports[`_reinterpretUntilZeros${bitCount}`]
  if (_reinterpretUntilZeros === undefined) {
    throw new Error(`reinterpretUntilZeros only support size 1,2,4,8 bytes, not size:${size}`)
  }
  var rtn = _reinterpretUntilZeros(buffer, offset >>> 0);
  exports._attach(rtn, buffer);
  return rtn;
};


// the built-in "types"
const types = exports.types = {};

/**
 * The `void` type.
 *
 * @section types
 */

types.void = {
  size: 0,
  indirection: 1,
  get: function get (buf, offset) {
    debug('getting `void` type (returns `null`)');
    return null;
  },
  set: function set (buf, val, offset) {
    debug('setting `void` type (no-op)');
  }
};

/**
 * The `int8` type.
 */

types.int8 = {
  size: exports.sizeof.int8,
  indirection: 1,
  get: function get (buf, offset) {
    return buf.readInt8(offset >>> 0);
  },
  set: function set (buf, val, offset) {
    if (typeof val === 'string') {
      val = val.charCodeAt(0);
    }
    return buf.writeInt8(val, offset >>> 0);
  }
};

/**
 * The `uint8` type.
 */

types.uint8 = {
  size: exports.sizeof.uint8,
  indirection: 1,
  get: function get (buf, offset) {
    return buf.readUInt8(offset >>> 0);
  },
  set: function set (buf, val, offset) {
    if (typeof val === 'string') {
      val = val.charCodeAt(0);
    }
    return buf.writeUInt8(val, offset >>> 0);
  }
};

/**
 * The `int16` type.
 */

types.int16 = {
  size: exports.sizeof.int16,
  indirection: 1,
  get: function get (buf, offset) {
    return buf['readInt16' + exports.endianness](offset >>> 0);
  },
  set: function set (buf, val, offset) {
    return buf['writeInt16' + exports.endianness](val, offset >>> 0);
  }
}

/**
 * The `uint16` type.
 */

types.uint16 = {
  size: exports.sizeof.uint16,
  indirection: 1,
  get: function get (buf, offset) {
    return buf['readUInt16' + exports.endianness](offset >>> 0);
  },
  set: function set (buf, val, offset) {
    return buf['writeUInt16' + exports.endianness](val, offset >>> 0);
  }
}

/**
 * The `int32` type.
 */

types.int32 = {
  size: exports.sizeof.int32,
  indirection: 1,
  get: function get (buf, offset) {
    return buf['readInt32' + exports.endianness](offset >>> 0);
  },
  set: function set (buf, val, offset) {
    return buf['writeInt32' + exports.endianness](val, offset >>> 0);
  }
}

/**
 * The `uint32` type.
 */

types.uint32 = {
  size: exports.sizeof.uint32,
  indirection: 1,
  get: function get (buf, offset) {
    return buf['readUInt32' + exports.endianness](offset >>> 0);
  },
  set: function set (buf, val, offset) {
    return buf['writeUInt32' + exports.endianness](val, offset >>> 0);
  }
}

/**
 * The `int64` type.
 */

types.int64 = {
  size: exports.sizeof.int64,
  indirection: 1,
  get: function get (buf, offset) {
    return buffer.readBigInt64(buf, offset >>> 0)
  },
  set: function set (buf, val, offset) {
    return buffer.writeBigInt64(buf, val, offset >>> 0)
  }
}

/**
 * The `uint64` type.
 */

types.uint64 = {
  size: exports.sizeof.uint64,
  indirection: 1,
  get: function get (buf, offset) {
    return buffer.readBigUInt64(buf, offset >>> 0)
  },
  set: function set (buf, val, offset) {
    return buffer.writeBigUInt64(buf, val, offset >>> 0)
  }
}

/**
 * The `float` type.
 */

types.float = {
  size: exports.sizeof.float,
  indirection: 1,
  get: function get (buf, offset) {
    return buf['readFloat' + exports.endianness](offset >>> 0);
  },
  set: function set (buf, val, offset) {
    return buf['writeFloat' + exports.endianness](val, offset >>> 0);
  }
}

/**
 * The `double` type.
 */

types.double = {
  size: exports.sizeof.double,
  indirection: 1,
  get: function get (buf, offset) {
    return buf['readDouble' + exports.endianness](offset >>> 0)
  },
  set: function set (buf, val, offset) {
    return buf['writeDouble' + exports.endianness](val, offset >>> 0)
  }
}

/**
 * The `Object` type. This can be used to read/write regular JS Objects
 * into raw memory.
 */

types.Object = {
  size: exports.sizeof.Object,
  indirection: 1,
  get: function get (buf, offset) {
    return ref.readObject(buf, offset >>> 0);
  },
  set: function set (buf, val, offset) {
    return ref.writeObject(buf, val, offset >>> 0);
  }
}

/**
 * The `CString` (a.k.a `"string"`) type.
 *
 * CStrings are a kind of weird thing. We say it's `sizeof(char *)`, and
 * `indirection` level of 1, which means that we have to return a Buffer that
 * is pointer sized, and points to a some utf8 string data, so we have to create
 * a 2nd "in-between" buffer.
 */

types.CString = {
  size: exports.sizeof.pointer,
  alignment: exports.alignof.pointer,
  indirection: 1,
  get: function get (buf, offset) {
    const _buf = exports.readPointer(buf, offset)
    if (exports.isNull(_buf)) {
      return null;
    }
    return exports.readCString(_buf, 0);
  },
  set: function set (buf, val, offset) {
    let _buf
    if (Buffer.isBuffer(val)) {
      _buf = val;
    } else {
      // assume string
      _buf = exports.allocCString(val);
    }
    return exports.writePointer(buf, _buf, offset);
  }
}

/**
 * The `bool` type.
 *
 * Wrapper type around `types.uint8` that accepts/returns `true` or
 * `false` Boolean JavaScript values.
 *
 * @name bool
 *
 */

/**
 * The `byte` type.
 *
 * @name byte
 */

/**
 * The `char` type.
 *
 * @name char
 */

/**
 * The `uchar` type.
 *
 * @name uchar
 */

/**
 * The `short` type.
 *
 * @name short
 */

/**
 * The `ushort` type.
 *
 * @name ushort
 */

/**
 * The `int` type.
 *
 * @name int
 */

/**
 * The `uint` type.
 *
 * @name uint
 */

/**
 * The `long` type.
 *
 * @name long
 */

/**
 * The `ulong` type.
 *
 * @name ulong
 */

/**
 * The `longlong` type.
 *
 * @name longlong
 */

/**
 * The `ulonglong` type.
 *
 * @name ulonglong
 */

/**
 * The `size_t` type.
 *
 * @name size_t
 */

// "typedef"s for the variable-sized types
;[ 'bool', 'byte', 'char', 'uchar', 'short', 'ushort', 'int', 'uint', 'long',
  'ulong', 'longlong', 'ulonglong', 'size_t' ].forEach(name => {
  const unsigned = name === 'bool'
                || name === 'byte'
                || name === 'size_t'
                || name[0] === 'u';
  const size = exports.sizeof[name];
  assert(size >= 1 && size <= 8);
  let typeName = 'int' + (size * 8);
  if (unsigned) {
    typeName = 'u' + typeName;
  }
  const type = exports.types[typeName];
  assert(type);
  exports.types[name] = Object.create(type);
});

// set the "alignment" property on the built-in types
Object.keys(exports.alignof).forEach((name) => {
  if (name === 'pointer')
    return;
  exports.types[name].alignment = exports.alignof[name];
  assert(exports.types[name].alignment > 0);
});

// make the `bool` type work with JS true/false values
exports.types.bool.get = (function (_get) {
  return function get (buf, offset) {
    return _get(buf, offset) ? true : false;
  }
})(exports.types.bool.get);
exports.types.bool.set = (function (_set) {
  return function set (buf, val, offset) {
    if (typeof val !== 'number') {
      val = val ? 1 : 0;
    }
    return _set(buf, val, offset);
  }
})(exports.types.bool.set);

/*!
 * Set the `name` property of the types. Used for debugging...
 */

Object.keys(exports.types).forEach((name) => {
  exports.types[name].name = name;
});

/*!
 * This `char *` type is used by "allocCString()" above.
 */

const charPtrType = exports.refType(exports.types.char);

/*!
 * Set the `type` property of the `NULL` pointer Buffer object.
 */

exports.NULL.type = exports.types.void;

/**
 * `NULL_POINTER` is a pointer-sized `Buffer` instance pointing to `NULL`.
 * Conceptually, it's equivalent to the following C code:
 *
 * ``` c
 * char *null_pointer;
 * null_pointer = NULL;
 * ```
 *
 * @type Buffer
 */

exports.NULL_POINTER = exports.ref(exports.NULL);

/**
 * `ref` overwrites the default `Buffer#inspect()` function to include the
 * hex-encoded memory address of the Buffer instance when invoked.
 *
 * This is simply a nice-to-have.
 *
 * **Before**:
 *
 * ``` js
 * console.log(new Buffer('ref'));
 * <Buffer 72 65 66>
 * ```
 *
 * **After**:
 *
 * ``` js
 * console.log(new Buffer('ref'));
 * <Buffer@0x103015490 72 65 66>
 * ```
 */

var inspectSym = inspect.custom || 'inspect';
/**
 * in node 6.91, inspect.custom does not give a correct value; so in this case, don't torch the whole process.
 * fixed in >6.9.2
 */
if (Buffer.prototype[inspectSym]) {
  Buffer.prototype[inspectSym] = overwriteInspect(Buffer.prototype[inspectSym]);
}

function overwriteInspect (inspect) {
  if (inspect.name === 'refinspect') {
    return inspect;
  } else {
    return function refinspect () {
      var v = inspect.apply(this, arguments);
      return v.replace('Buffer', 'Buffer@0x' + exports.hexAddress(this));
    }
  }
}
