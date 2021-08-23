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
 * Accepts a `Buffer` instance and returns the memory address of the buffer
 * instance. Returns a JavaScript String
 * ```
 * console.log(ref.hexAddress(new Buffer(1)));
 * 4320233616n
 *
 * console.log(ref.hexAddress(ref.NULL)));
 * 0n
 * ```
 *
 * @param {Buffer} buffer The buffer to get the memory address of.
 * @return {string} The hex memory address the buffer instance.
 * @name hexAddress
 * @type method
 */
exports.hexAddress = function (buf) {
  const pointerSize = nativeRef.sizeof.pointer
  const hexStr = exports.address(buf).toString(16)
  return ('0000000000000000' + hexStr).slice(pointerSize * 2)
}

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

exports.isNull = function(buf) {
  return exports.address(buf) === 0n
}

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
  rtn.NULL = nativeRef.NULL
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
    rtn = types[type];
    if (rtn) return rtn;

    // strip whitespace
    rtn = type.replace(/\s+/g, '').toLowerCase();
    if (rtn === 'pointer') {
      // legacy "pointer" being used :(
      rtn = exports.refType(types.void); // void *
    } else if (rtn === 'string') {
      rtn = types.CString; // special char * type
    } else {
      var refCount = 0;
      rtn = rtn.replace(/\*/g, function() {
        refCount++;
        return '';
      });
      // allow string names to be passed in
      rtn = types[rtn];
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
  buffer.type = types.charPtr;
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

function getAlignmentAndSize(nativeRef, name) {
  if (name === 'ssize_t' || name === 'intptr_t' || name === 'uintptr_t') {
    name = 'size_t'
  }
  return {
    size: nativeRef.sizeof[name],
    alignment: nativeRef.alignof[name],
  }
}

function getFunctionsGenerate(max_size_is_8, unsigned, size)
{
  const readFunctionNumber = unsigned ? buffer[`readUInt${size * 8}`] : buffer[`readInt${size * 8}`]
  const readFunctionBigInt = unsigned ? buffer[`readBigUInt${size * 8}`] : buffer[`readBigInt${size * 8}`]

  /* Always get as number */
  let getFunctionNumber = readFunctionNumber
  if (!getFunctionNumber) {
    getFunctionNumber = function (buf, offset) {
      return Number(readFunctionBigInt(buf, offset))
    }
  }

  /* Always get as bigint */
  let getFunctionBigInt = readFunctionBigInt
  if (!getFunctionBigInt) {
    getFunctionBigInt = function (buf, offset) {
      return BigInt(readFunctionNumber(buf, offset))
    }
  }

  /**
   * getFunction
   * should always return `bigint` for max_size_is_8 type,
   * such as size_t, intptr_t, long
   * should always return `number` for types that the type size are within 4 byte
   * such as bool char uchar byte short int uint32_t
   */
  let getFunction
  if (max_size_is_8) {
    getFunction = getFunctionBigInt
  } else {
    getFunction = getFunctionNumber
  }
  return {
    get: getFunction,
    getNumber: getFunctionNumber,
    getBigInt: getFunctionBigInt,
  }
}

function setFunctionsGenerate(max_size_is_8, unsigned, size)
{
  const writeFunctionNumber = unsigned ? buffer[`writeUInt${size * 8}`] : buffer[`writeInt${size * 8}`]
  const writeFunctionBigInt = unsigned ? buffer[`writeBigUInt${size * 8}`] : buffer[`writeBigInt${size * 8}`]

  /* Always set as number */
  let setFunctionNumber = writeFunctionNumber
  if (!setFunctionNumber) {
    /* Means the sizeof type is 8 byte */
    setFunctionNumber = function (buf, val, offset) {
      return writeFunctionBigInt(buf, BigInt(val), offset)
    }
  }

  /* Always set as bigint */
  let setFunctionBigInt = writeFunctionBigInt
  if (!setFunctionBigInt) {
    /* Means the sizeof type is 4byte or less */
    if (unsigned) {
      setFunctionBigInt = function (buf, val, offset) {
        return writeFunctionNumber(buf, BigInt.asUintN(val, 32), offset)
      }
    } else {
      setFunctionBigInt = function (buf, val, offset) {
        return writeFunctionNumber(buf, BigInt.asIntN(val, 32), offset)
      }
    }
  }

  /**
   * setFunction
   * should accept `bigint` only for max_size_is_8 type,
   * such as size_t, intptr_t, long, uint64_t
   * should accept `number` only for types that the type size are within 4 byte
   * such as bool char uchar byte short int uint32_t
   */
  let setFunction
  if (max_size_is_8) {
    setFunction = setFunctionBigInt
  } else {
    setFunction = setFunctionNumber
  }
  return {
    set: setFunction,
    setNumeric: function (buf, val, offset) {
      if (typeof val === 'bigint') {
        return setFunctionBigInt(buf, val, offset)
      } else {
        return setFunctionNumber(buf, val, offset)
      }
    },
    setNumber: setFunctionNumber,
    setBigInt: setFunctionBigInt,
  }
}

function overrideGetSetFunctions(name, unsigned, getFunctions, setFunctions) {
  switch (name) {
    case 'bool': {
      let getFunctionOld = getFunctions.get
      getFunctions.get = function (buf, offset) {
        return getFunctionOld(buf, offset) !== 0;
      }
      let setFunctionOld = setFunctions.set
      setFunctions.set = function (buf, val, offset) {
        /* Turn boolean to number from https://stackoverflow.com/a/22239859 */
        return setFunctionOld(buf, val | 0, offset);
      }
      break;
    }
    case 'uchar':
    case 'char': {
      const readFunction = buffer.readUInt8
      const writeFunction = unsigned ? buffer.writeUInt8 : buffer.writeInt8
      getFunctions.get = function (buf, offset) {
        /* Always read in UInt8 type so that the charCode be valid */
        const charCode = readFunction(buf, offset)
        return String.fromCodePoint(charCode)
      }
      setFunctions.set = function (buf, val, offset) {
        return writeFunction(buf, val.charCodeAt(0), offset);
      }
      break;
    }
    case 'float': {
      getFunctions.get = buffer.readFloat
      setFunctions.set = buffer.writeFloat
      break;
    }
    case 'double': {
      getFunctions.get = buffer.readDouble
      setFunctions.set = buffer.writeDouble
      break;
    }
    case 'Object': {
      getFunctions.get = function (buf, offset) {
        return nativeRef.readObject(buf, offset >>> 0);
      }
      getFunctions.set = function (buf, val, offset) {
        nativeRef.writeObject(buf, val, offset >>> 0);
        return offset + size;
      }
      break;
    }
  }
}

/**
 * @param {String} name The c type name
 */

function createCType(name) {
  const unsigned = name === 'bool'
                || name === 'byte'
                || name === 'size_t'
                || name[0] === 'u';
  const {size, alignment} = getAlignmentAndSize(nativeRef, name)
  assert(alignment > 0);

  const max_size_is_8 = name === 'long'
                        || name === 'ulong'
                        || name === 'longlong'
                        || name === 'ulonglong'
                        || name === 'size_t'
                        || name === 'ssize_t'
                        || name === 'intptr_t'
                        || name === 'uintptr_t'
                        || size === 8
  let zero_value = 0
  let negative_one_value = -1
  if (name === 'bool') {
    zero_value = false
    negative_one_value = true
  } else if (max_size_is_8) {
    zero_value = 0n
    if (unsigned) {
      negative_one_value = 1n << (BigInt(size) * 8n)
    } else {
      negative_one_value = -1n
    }
  }
  let getFunctions = getFunctionsGenerate(max_size_is_8, unsigned, size)
  let setFunctions = setFunctionsGenerate(max_size_is_8, unsigned, size)
  overrideGetSetFunctions(name, unsigned, getFunctions, setFunctions)
  // "typedef"s for the variable-sized types
  const typedefTypes = [
    'bool',
    'byte',
    'char',
    'uchar',
    'short',
    'ushort',
    'int',
    'uint',
    'long',
    'ulong',
    'longlong',
    'ulonglong',
    'size_t',
    'ssize_t',
    'intptr_t',
    'uintptr_t',
  ];
  let newType
  if (typedefTypes.indexOf(name) >= 0) {
    let typeName = 'int' + (size * 8);
    if (unsigned) {
      typeName = 'u' + typeName;
    }
    newType = Object.create(types[typeName]);
  } else {
      /**
       * Attributes that may shared between types when do typedef,
       * such as typedef uint8_t uchar
       */
    newType = {
      name: name,
      size: size,
      alignment: alignment,
      indirection: 1,
    };
  }
  Object.assign(newType, {
    /* Different for each type */
    realName: name, /* typedef name realName */
    zero: zero_value,
    negative_one: negative_one_value,
    max_size_is_8: max_size_is_8,
  }, getFunctions, setFunctions)
  return newType
}

// the built-in "types"
const types = exports.types = {};

/**
 * The `void` type.
 *
 * @section types
 */

types.void = {
  name: 'void',
  size: 0,
  indirection: 1,
  get: function get (buf, offset) {
    debug('getting `void` type (returns `undefined`)');
    return undefined;
  },
  set: function set (buf, val, offset) {
    debug('setting `void` type (no-op)');
  }
};

/**
 * The `int8` type.
 */

types.int8 = createCType('int8')

/**
 * The `uint8` type.
 */

types.uint8 = createCType('uint8')

/**
 * The `int16` type.
 */

types.int16 = createCType('int16')

/**
 * The `uint16` type.
 */

types.uint16 = createCType('uint16')

/**
 * The `int32` type.
 */

types.int32 = createCType('int32')

/**
 * The `uint32` type.
 */

types.uint32 = createCType('uint32')

/**
 * The `int64` type.
 */

types.int64 = createCType('int64')

/**
 * The `uint64` type.
 */

types.uint64 = createCType('uint64')

/**
 * The `float` type.
 */

types.float = createCType('float')

/**
 * The `double` type.
 */

types.double = createCType('double')

/**
 * The `Object` type. This can be used to read/write regular JS Objects
 * into raw memory.
 */

types.Object = createCType('Object')

/**
 * The `CString` (a.k.a `"string"`) type.
 *
 * CStrings are a kind of weird thing. We say it's `sizeof(char *)`, and
 * `indirection` level of 1, which means that we have to return a Buffer that
 * is pointer sized, and points to a some utf8 string data, so we have to create
 * a 2nd "in-between" buffer.
 */

types.CString = {
  name: 'CString',
  size: nativeRef.sizeof.pointer,
  alignment: nativeRef.alignof.pointer,
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

types.bool = createCType('bool')

/**
 * The `byte` type.
 *
 * @name byte
 */

types.byte = createCType('byte')

/**
 * The `char` type.
 *
 * @name char
 */

types.char = createCType('char')

/**
 * The `uchar` type.
 *
 * @name uchar
 */

types.uchar = createCType('uchar')

/**
 * The `short` type.
 *
 * @name short
 */

types.short = createCType('short')

/**
 * The `ushort` type.
 *
 * @name ushort
 */

types.ushort = createCType('ushort')

/**
 * The `int` type.
 *
 * @name int
 */

types.int = createCType('int')

/**
 * The `uint` type.
 *
 * @name uint
 */

types.uint = createCType('uint')

/**
 * The `long` type.
 *
 * @name long
 */

types.long = createCType('long')

/**
 * The `ulong` type.
 *
 * @name ulong
 */

types.ulong = createCType('ulong')

/**
 * The `longlong` type.
 *
 * @name longlong
 */

types.longlong = createCType('longlong')

/**
 * The `ulonglong` type.
 *
 * @name ulonglong
 */

types.ulonglong = createCType('ulonglong')

/**
 * The `ssize_t` type.
 *
 * @name ssize_t
 */

types.ssize_t = createCType('ssize_t')

/**
 * The `size_t` type.
 *
 * @name size_t
 */

types.size_t = createCType('size_t')

/**
 * The `intptr_t` type.
 *
 * @name intptr_t
 */
types.intptr_t = createCType('intptr_t')

/**
 * The `uintptr_t` type.
 *
 * @name uintptr_t
 */
types.uintptr_t = createCType('uintptr_t')

/**
 * The `char *` type is used by "allocCString()"
 * @name charPtr
 */

types.charPtr = exports.refType(types.char);

/**
 * The `void *` type
 * @name voidPtr
 */

types.voidPtr = exports.refType(types.void);

/*!
 * Set the `type` property of the `NULL` pointer Buffer object.
 */

exports.NULL.type = types.void;

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
