<div class="container">

<div class="columns three logo"><a href="">

# ref <span class="pointer">*</span><span class="version">v0.3.3</span>

</a></div>

<div class="columns thirteen subtitle">

### Turn Buffer instances into "pointers"

</div>

<div class="columns sixteen intro">

#### What is `ref`?

`ref` is a native addon for [Node.js](http://nodejs.org) that aids in doing C programming in JavaScript, by extending the built-in [`Buffer` class](http://nodejs.org/api/buffer.html) with some fancy additions like:

*   Getting the memory address of a Buffer
*   Checking the endianness of the processor
*   Checking if a Buffer represents the NULL pointer
*   Reading and writing "pointers" with Buffers
*   Reading and writing C Strings (NULL-terminated)
*   Reading and writing JavaScript Object references
*   Reading and writing **int64_t** and **uint64_t** values
*   A "type" convention to define the contents of a Buffer

There is indeed a lot of _meat_ to `ref`, but it all fits together in one way or another in the end.  
For simplicity, `ref`'s API can be broken down into 3 sections:

</div>

[

#### ref `exports`

All the static versions of `ref`'s functions and default "types" available on the exports returned from `require('ref')`.

](#exports)[

#### _"type"_ system

The _"type"_ system allows you to define a "type" on any Buffer instance, and then use generic `ref()` and `deref()` functions to reference and dereference values.

](#types)[

#### `Buffer` extensions

`Buffer.prototype` gets extended with some convenience functions. These all just mirror their static counterpart, using the Buffer's `this` variable as the `buffer` variable.

](#extensions)

* * *

<div class="columns eight section exports"><a name="exports"></a>[

## ref exports

](#exports)</div>

<div class="columns sixteen intro">

This section documents all the functions exported from `require('ref')`.

</div>

<div class="columns sixteen section"><a name="exports-NULL"></a>[

### ref.NULL <span class="rtn">⇒ Buffer</span>

](#exports-NULL)

A `Buffer` that references the C NULL pointer. That is, its memory address points to 0\. Its `length` is 0 because accessing any data from this buffer would cause a _segmentation fault_.

    console.log(ref.NULL);
    <SlowBuffer@0x0 >

</div>

<div class="columns sixteen section"><a name="exports-NULL_POINTER"></a>[

### ref.NULL_POINTER <span class="rtn">⇒ Buffer</span>

](#exports-NULL_POINTER)

`NULL_POINTER` is a pointer-sized `Buffer` instance pointing to `NULL`. Conceptually, it's equivalent to the following C code:

    char *null_pointer;
    null_pointer = NULL;

</div>

<div class="columns sixteen section"><a name="exports-address"></a>[

### ref.address(<span class="param">Buffer buffer</span>) <span class="rtn">→ Number</span>

](#exports-address)

*   buffer - The buffer to get the memory address of.
*   **Return:** The memory address the buffer instance.

Accepts a `Buffer` instance and returns the memory address of the buffer instance.

    console.log(ref.address(new Buffer(1)));
    4320233616

    console.log(ref.address(ref.NULL)));
    0

</div>

<div class="columns sixteen section"><a name="exports-alloc"></a>[

### ref.alloc(<span class="param">Object|String type</span>, <span class="param">? value</span>) <span class="rtn">→ Buffer</span>

](#exports-alloc)

*   type - The "type" object to allocate. Strings get coerced first.
*   value - (optional) The initial value set on the returned Buffer, using _type_'s `set()` function.
*   **Return:** A new Buffer instance with it's `type` set to "type", and (optionally) "value" written to it.

Returns a new Buffer instance big enough to hold `type`, with the given `value` written to it.

    var intBuf = ref.alloc(ref.types.int)
    var int_with_4 = ref.alloc(ref.types.int, 4)

</div>

<div class="columns sixteen section"><a name="exports-allocCString"></a>[

### ref.allocCString(<span class="param">String string</span>, <span class="param">String encoding</span>) <span class="rtn">→ Buffer</span>

](#exports-allocCString)

*   string - The JavaScript string to be converted to a C string.
*   encoding - (optional) The encoding to use for the C string. Defaults to **'utf8'**.
*   **Return:** The new `Buffer` instance with the specified String wrtten to it, and a trailing NUL byte.

Returns a new `Buffer` instance with the given String written to it with the given encoding (defaults to **'utf8'**). The buffer is 1 byte longer than the string itself, and is NUL terminated.

    var buf = ref.allocCString('hello world');

    console.log(buf.toString());
    'hello world\u0000'

</div>

<div class="columns sixteen section"><a name="exports-coerceType"></a>[

### ref.coerceType(<span class="param">Object|String type</span>) <span class="rtn">→ Object</span>

](#exports-coerceType)

*   type - The "type" Object or String to coerce.
*   **Return:** A "type" object

Coerces a "type" object from a String or an actual "type" object. String values are looked up from the `ref.types` Object. So:

*   `"int"` gets coerced into `ref.types.int`.
*   `"int *"` gets translated into `ref.refType(ref.types.int)`
*   `ref.types.int` gets translated into `ref.types.int` (returns itself)

Throws an Error if no valid "type" object could be determined. Most `ref` functions use this function under the hood, so anywhere a "type" object is expected, a String may be passed as well, including simply setting the `buffer.type` property.

    var type = ref.coerceType('int **');

    console.log(type.indirection);
    3

</div>

<div class="columns sixteen section"><a name="exports-deref"></a>[

### ref.deref(<span class="param">Buffer buffer</span>) <span class="rtn">→ ?</span>

](#exports-deref)

*   buffer - A Buffer instance to dereference.
*   **Return:** The returned value after dereferencing _buffer_.

Accepts a Buffer instance and attempts to "dereference" it. That is, first it checks the `indirection` count of _buffer_'s "type", and if it's greater than **1** then it merely returns another Buffer, but with one level less `indirection`.

When _buffer_'s indirection is at **1**, then it checks for `buffer.type` which should be an Object with its own `get()` function.

    var buf = ref.alloc('int', 6);

    var val = ref.deref(buf);
    console.log(val);
    6

</div>

<div class="columns sixteen section"><a name="exports-derefType"></a>[

### ref.derefType(<span class="param">Object|String type</span>) <span class="rtn">→ Object</span>

](#exports-derefType)

*   type - The "type" object to create a dereference type from. Strings get coerced first.
*   **Return:** The new "type" object with its `indirection` decremented by 1.

Returns a new clone of the given "type" object, with its `indirection` level decremented by 1.

</div>

<div class="columns sixteen section"><a name="exports-endianness"></a>[

### ref.endianness <span class="rtn">⇒ String</span>

](#exports-endianness)

A string that represents the native endianness of the machine's processor. The possible values are either `"LE"` or `"BE"`.

    console.log(ref.endianness);
    'LE'

</div>

<div class="columns sixteen section"><a name="exports-get"></a>[

### ref.get(<span class="param">Buffer buffer</span>, <span class="param">Number offset</span>, <span class="param">Object|String type</span>) <span class="rtn">→ ?</span>

](#exports-get)

*   buffer - The Buffer instance to read from.
*   offset - (optional) The offset on the Buffer to start reading from. Defaults to 0.
*   type - (optional) The "type" object to use when reading. Defaults to calling `getType()` on the buffer.
*   **Return:** Whatever value the "type" used when reading returns.

Calls the `get()` function of the Buffer's current "type" (or the passed in _type_ if present) at the given _offset_.

This function handles checking the "indirection" level and returning a proper "dereferenced" Bufffer instance when necessary.

</div>

<div class="columns sixteen section"><a name="exports-getType"></a>[

### ref.getType(<span class="param">Buffer buffer</span>) <span class="rtn">→ Object</span>

](#exports-getType)

*   buffer - The Buffer instance to get the "type" object from.
*   **Return:** The "type" object from the given Buffer.

Returns the "type" property of the given Buffer. Creates a default type for the buffer when none exists.

</div>

<div class="columns sixteen section"><a name="exports-isNull"></a>[

### ref.isNull(<span class="param">Buffer buffer</span>) <span class="rtn">→ Boolean</span>

](#exports-isNull)

*   buffer - The buffer to check for NULL.
*   **Return:** true or false.

Accepts a `Buffer` instance and returns _true_ if the buffer represents the NULL pointer, _false_ otherwise.

    console.log(ref.isNull(new Buffer(1)));
    false

    console.log(ref.isNull(ref.NULL));
    true

</div>

<div class="columns sixteen section"><a name="exports-readCString"></a>[

### ref.readCString(<span class="param">Buffer buffer</span>, <span class="param">Number offset</span>) <span class="rtn">→ String</span>

](#exports-readCString)

*   buffer - The buffer to read a Buffer from.
*   offset - The offset to begin reading from.
*   **Return:** The String that was read from _buffer_.

Returns a JavaScript String read from _buffer_ at the given _offset_. The C String is read until the first NULL byte, which indicates the end of the String.

This function can read beyond the `length` of a Buffer.

    var buf = new Buffer('hello\0world\0');

    var str = ref.readCString(buf, 0);
    console.log(str);
    'hello'

</div>

<div class="columns sixteen section"><a name="exports-readInt64BE"></a>[

### ref.readInt64BE(<span class="param">Buffer buffer</span>, <span class="param">Number offset</span>) <span class="rtn">→ Number|String</span>

](#exports-readInt64BE)

*   buffer - The buffer to read a Buffer from.
*   offset - The offset to begin reading from.
*   **Return:** The Number or String that was read from _buffer_.

Returns a big-endian signed 64-bit int read from _buffer_ at the given _offset_.

If the returned value will fit inside a JavaScript Number without losing precision, then a Number is returned, otherwise a String is returned.

    var buf = ref.alloc('int64');
    ref.writeInt64BE(buf, 0, '9223372036854775807');

    var val = ref.readInt64BE(buf, 0)
    console.log(val)
    '9223372036854775807'

</div>

<div class="columns sixteen section"><a name="exports-readInt64LE"></a>[

### ref.readInt64LE(<span class="param">Buffer buffer</span>, <span class="param">Number offset</span>) <span class="rtn">→ Number|String</span>

](#exports-readInt64LE)

*   buffer - The buffer to read a Buffer from.
*   offset - The offset to begin reading from.
*   **Return:** The Number or String that was read from _buffer_.

Returns a little-endian signed 64-bit int read from _buffer_ at the given _offset_.

If the returned value will fit inside a JavaScript Number without losing precision, then a Number is returned, otherwise a String is returned.

    var buf = ref.alloc('int64');
    ref.writeInt64LE(buf, 0, '9223372036854775807');

    var val = ref.readInt64LE(buf, 0)
    console.log(val)
    '9223372036854775807'

</div>

<div class="columns sixteen section"><a name="exports-readObject"></a>[

### ref.readObject(<span class="param">Buffer buffer</span>, <span class="param">Number offset</span>) <span class="rtn">→ Object</span>

](#exports-readObject)

*   buffer - The buffer to read an Object from.
*   offset - The offset to begin reading from.
*   **Return:** The Object that was read from _buffer_.

Reads a JavaScript Object that has previously been written to the given _buffer_ at the given _offset_.

    var obj = { foo: 'bar' };
    var buf = ref.alloc('Object', obj);

    var obj2 = ref.readObject(buf, 0);
    console.log(obj === obj2);
    true

</div>

<div class="columns sixteen section"><a name="exports-readPointer"></a>[

### ref.readPointer(<span class="param">Buffer buffer</span>, <span class="param">Number offset</span>, <span class="param">Number length</span>) <span class="rtn">→ Buffer</span>

](#exports-readPointer)

*   buffer - The buffer to read a Buffer from.
*   offset - The offset to begin reading from.
*   length - (optional) The length of the returned Buffer. Defaults to 0.
*   **Return:** The Buffer instance that was read from _buffer_.

Reads a Buffer instance from the given _buffer_ at the given _offset_. The _size_ parameter specifies the `length` of the returned Buffer instance, which defaults to **0**.

    var buf = new Buffer('hello world');
    var pointer = ref.alloc('pointer');

    var buf2 = ref.readPointer(pointer, 0, buf.length);
    console.log(buf.toString());
    'hello world'

</div>

<div class="columns sixteen section"><a name="exports-readUInt64BE"></a>[

### ref.readUInt64BE(<span class="param">Buffer buffer</span>, <span class="param">Number offset</span>) <span class="rtn">→ Number|String</span>

](#exports-readUInt64BE)

*   buffer - The buffer to read a Buffer from.
*   offset - The offset to begin reading from.
*   **Return:** The Number or String that was read from _buffer_.

Returns a big-endian unsigned 64-bit int read from _buffer_ at the given _offset_.

If the returned value will fit inside a JavaScript Number without losing precision, then a Number is returned, otherwise a String is returned.

    var buf = ref.alloc('uint64');
    ref.writeUInt64BE(buf, 0, '18446744073709551615');

    var val = ref.readUInt64BE(buf, 0)
    console.log(val)
    '18446744073709551615'

</div>

<div class="columns sixteen section"><a name="exports-readUInt64LE"></a>[

### ref.readUInt64LE(<span class="param">Buffer buffer</span>, <span class="param">Number offset</span>) <span class="rtn">→ Number|String</span>

](#exports-readUInt64LE)

*   buffer - The buffer to read a Buffer from.
*   offset - The offset to begin reading from.
*   **Return:** The Number or String that was read from _buffer_.

Returns a little-endian unsigned 64-bit int read from _buffer_ at the given _offset_.

If the returned value will fit inside a JavaScript Number without losing precision, then a Number is returned, otherwise a String is returned.

    var buf = ref.alloc('uint64');
    ref.writeUInt64LE(buf, 0, '18446744073709551615');

    var val = ref.readUInt64LE(buf, 0)
    console.log(val)
    '18446744073709551615'

</div>

<div class="columns sixteen section"><a name="exports-ref"></a>[

### ref.ref(<span class="param">Buffer buffer</span>) <span class="rtn">→ Buffer</span>

](#exports-ref)

*   buffer - A Buffer instance to create a reference to.
*   **Return:** A new Buffer instance pointing to _buffer_.

`ref()` accepts a Buffer instance and returns a new Buffer instance that is "pointer" sized and has its data pointing to the given Buffer instance. Essentially the created Buffer is a "reference" to the original pointer, equivalent to the following C code:

    char *buf = buffer;
    char **ref = &buf;

</div>

<div class="columns sixteen section"><a name="exports-refType"></a>[

### ref.refType(<span class="param">Object|String type</span>) <span class="rtn">→ Object</span>

](#exports-refType)

*   type - The "type" object to create a reference type from. Strings get coerced first.
*   **Return:** The new "type" object with its `indirection` incremented by 1.

Returns a new clone of the given "type" object, with its `indirection` level incremented by **1**.

Say you wanted to create a type representing a `void *`:

    var voidPtrType = ref.refType(ref.types.void);

</div>

<div class="columns sixteen section"><a name="exports-reinterpret"></a>[

### ref.reinterpret(<span class="param">Buffer buffer</span>, <span class="param">Number size</span>, <span class="param">Number offset</span>) <span class="rtn">→ Buffer</span>

](#exports-reinterpret)

*   buffer - A Buffer instance to base the returned Buffer off of.
*   size - The `length` property of the returned Buffer.
*   offset - The offset of the Buffer to begin from.
*   **Return:** A new Buffer instance with the same memory address as _buffer_, and the requested _size_.

Returns a new Buffer instance with the specified _size_, with the same memory address as _buffer_.

This function "attaches" _buffer_ to the returned Buffer to prevent it from being garbage collected.

</div>

<div class="columns sixteen section"><a name="exports-reinterpretUntilZeros"></a>[

### ref.reinterpretUntilZeros(<span class="param">Buffer buffer</span>, <span class="param">Number size</span>, <span class="param">Number offset</span>) <span class="rtn">→ Buffer</span>

](#exports-reinterpretUntilZeros)

*   buffer - A Buffer instance to base the returned Buffer off of.
*   size - The number of sequential, aligned `NULL` bytes are required to terminate the buffer.
*   offset - The offset of the Buffer to begin from.
*   **Return:** A new Buffer instance with the same memory address as _buffer_, and a variable `length` that is terminated by _size_ NUL bytes.

Accepts a `Buffer` instance and a number of `NULL` bytes to read from the pointer. This function will scan past the boundary of the Buffer's `length` until it finds `size` number of aligned `NULL` bytes.

This is useful for finding the end of NUL-termintated array or C string. For example, the `readCString()` function _could_ be implemented like:

    function readCString (buf) {
      return ref.reinterpretUntilZeros(buf, 1).toString('utf8')
    }

This function "attaches" _buffer_ to the returned Buffer to prevent it from being garbage collected.

</div>

<div class="columns sixteen section"><a name="exports-set"></a>[

### ref.set(<span class="param">Buffer buffer</span>, <span class="param">Number offset</span>, <span class="param">? value</span>, <span class="param">Object|String type</span>)

](#exports-set)

*   buffer - The Buffer instance to write to.
*   offset - The offset on the Buffer to start writing to.
*   value - The value to write to the Buffer instance.
*   type - (optional) The "type" object to use when reading. Defaults to calling `getType()` on the buffer.

Calls the `set()` function of the Buffer's current "type" (or the passed in _type_ if present) at the given _offset_.

This function handles checking the "indirection" level writing a pointer rather than calling the `set()` function if the indirection is greater than 1.

</div>

<div class="columns sixteen section"><a name="exports-writeCString"></a>[

### ref.writeCString(<span class="param">Buffer buffer</span>, <span class="param">Number offset</span>, <span class="param">String string</span>, <span class="param">String encoding</span>)

](#exports-writeCString)

*   buffer - The Buffer instance to write to.
*   offset - The offset of the buffer to begin writing at.
*   string - The JavaScript String to write that will be written to the buffer.
*   encoding - (optional) The encoding to read the C string as. Defaults to **'utf8'**.

Writes the given string as a C String (NULL terminated) to the given buffer at the given offset. "encoding" is optional and defaults to **'utf8'**.

Unlike `readCString()`, this function requires the buffer to actually have the proper length.

</div>

<div class="columns sixteen section"><a name="exports-writeInt64BE"></a>[

### ref.writeInt64BE(<span class="param">Buffer buffer</span>, <span class="param">Number offset</span>, <span class="param">Number|String input</span>)

](#exports-writeInt64BE)

*   buffer - The buffer to write to.
*   offset - The offset to begin writing from.
*   input - This String or Number which gets written.

Writes the _input_ Number or String as a big-endian signed 64-bit int into _buffer_ at the given _offset_.

    var buf = ref.alloc('int64');
    ref.writeInt64BE(buf, 0, '9223372036854775807');

</div>

<div class="columns sixteen section"><a name="exports-writeInt64LE"></a>[

### ref.writeInt64LE(<span class="param">Buffer buffer</span>, <span class="param">Number offset</span>, <span class="param">Number|String input</span>)

](#exports-writeInt64LE)

*   buffer - The buffer to write to.
*   offset - The offset to begin writing from.
*   input - This String or Number which gets written.

Writes the _input_ Number or String as a little-endian signed 64-bit int into _buffer_ at the given _offset_.

    var buf = ref.alloc('int64');
    ref.writeInt64LE(buf, 0, '9223372036854775807');

</div>

<div class="columns sixteen section"><a name="exports-writeObject"></a>[

### ref.writeObject(<span class="param">Buffer buffer</span>, <span class="param">Number offset</span>, <span class="param">Object object</span>)

](#exports-writeObject)

*   buffer - A Buffer instance to write _object_ to.
*   offset - The offset on the Buffer to start writing at.
*   object - The Object to be written into _buffer_.

Writes a pointer to _object_ into _buffer_ at the specified _offset.

This function "attaches" _object_ to _buffer_ to prevent it from being garbage collected.

    var buf = ref.alloc('Object');
    ref.writeObject(buf, 0, { foo: 'bar' });

</div>

<div class="columns sixteen section"><a name="exports-writePointer"></a>[

### ref.writePointer(<span class="param">Buffer buffer</span>, <span class="param">Number offset</span>, <span class="param">Buffer pointer</span>)

](#exports-writePointer)

*   buffer - A Buffer instance to write _pointer to.
*   offset - The offset on the Buffer to start writing at.
*   pointer - The Buffer instance whose memory address will be written to _buffer_.

Writes the memory address of _pointer_ to _buffer_ at the specified _offset_.

This function "attaches" _object_ to _buffer_ to prevent it from being garbage collected.

    var someBuffer = new Buffer('whatever');
    var buf = ref.alloc('pointer');
    ref.writePointer(buf, 0, someBuffer);

</div>

<div class="columns sixteen section"><a name="exports-writeUInt64BE"></a>[

### ref.writeUInt64BE(<span class="param">Buffer buffer</span>, <span class="param">Number offset</span>, <span class="param">Number|String input</span>)

](#exports-writeUInt64BE)

*   buffer - The buffer to write to.
*   offset - The offset to begin writing from.
*   input - This String or Number which gets written.

Writes the _input_ Number or String as a big-endian unsigned 64-bit int into _buffer_ at the given _offset_.

    var buf = ref.alloc('uint64');
    ref.writeUInt64BE(buf, 0, '18446744073709551615');

</div>

<div class="columns sixteen section"><a name="exports-writeUInt64LE"></a>[

### ref.writeUInt64LE(<span class="param">Buffer buffer</span>, <span class="param">Number offset</span>, <span class="param">Number|String input</span>)

](#exports-writeUInt64LE)

*   buffer - The buffer to write to.
*   offset - The offset to begin writing from.
*   input - This String or Number which gets written.

Writes the _input_ Number or String as a little-endian unsigned 64-bit int into _buffer_ at the given _offset_.

    var buf = ref.alloc('uint64');
    ref.writeUInt64LE(buf, 0, '18446744073709551615');

</div>

<div class="columns sixteen section"><a name="exports-_attach"></a>[

### ref._attach(<span class="param">Buffer buffer</span>, <span class="param">Object|Buffer object</span>)

](#exports-_attach)

*   buffer - A Buffer instance to attach _object_ to.
*   object - An Object or Buffer to prevent from being garbage collected until _buffer_ does.

Attaches _object_ to _buffer_ such that it prevents _object_ from being garbage collected until _buffer_ does.

</div>

<div class="columns sixteen section"><a name="exports-_reinterpret"></a>[

### ref._reinterpret(<span class="param">Buffer buffer</span>, <span class="param">Number size</span>, <span class="param">Number offset</span>) <span class="rtn">→ Buffer</span>

](#exports-_reinterpret)

*   buffer - A Buffer instance to base the returned Buffer off of.
*   size - The `length` property of the returned Buffer.
*   offset - The offset of the Buffer to begin from.
*   **Return:** A new Buffer instance with the same memory address as _buffer_, and the requested _size_.

Same as `ref.reinterpret()`, except that this version does not attach _buffer_ to the returned Buffer, which is potentially unsafe if the garbage collector runs.

</div>

<div class="columns sixteen section"><a name="exports-_reinterpretUntilZeros"></a>[

### ref._reinterpretUntilZeros(<span class="param">Buffer buffer</span>, <span class="param">Number size</span>, <span class="param">Number offset</span>) <span class="rtn">→ Buffer</span>

](#exports-_reinterpretUntilZeros)

*   buffer - A Buffer instance to base the returned Buffer off of.
*   size - The number of sequential, aligned `NULL` bytes that are required to terminate the buffer.
*   offset - The offset of the Buffer to begin from.
*   **Return:** A new Buffer instance with the same memory address as _buffer_, and a variable `length` that is terminated by _size_ NUL bytes.

Same as `ref.reinterpretUntilZeros()`, except that this version does not attach _buffer_ to the returned Buffer, which is potentially unsafe if the garbage collector runs.

</div>

<div class="columns sixteen section"><a name="exports-_writeObject"></a>[

### ref._writeObject(<span class="param">Buffer buffer</span>, <span class="param">Number offset</span>, <span class="param">Object object</span>)

](#exports-_writeObject)

*   buffer - A Buffer instance to write _object_ to.
*   offset - The offset on the Buffer to start writing at.
*   object - The Object to be written into _buffer_.

Same as `ref.writeObject()`, except that this version does not _attach_ the Object to the Buffer, which is potentially unsafe if the garbage collector runs.

</div>

<div class="columns sixteen section"><a name="exports-_writePointer"></a>[

### ref._writePointer(<span class="param">Buffer buffer</span>, <span class="param">Number offset</span>, <span class="param">Buffer pointer</span>)

](#exports-_writePointer)

*   buffer - A Buffer instance to write _pointer to.
*   offset - The offset on the Buffer to start writing at.
*   pointer - The Buffer instance whose memory address will be written to _buffer_.

Same as `ref.writePointer()`, except that this version does not attach _pointer_ to _buffer_, which is potentially unsafe if the garbage collector runs.

</div>

* * *

<div class="columns eight section types"><a name="types"></a>[

## _"type"_ system

](#types)</div>

<div class="columns sixteen intro types">

A "type" in `ref` is simply an plain 'ol JavaScript Object, with a set of expected properties attached that implement the logic for getting & setting values on a given `Buffer` instance.

To attach a "type" to a Buffer instance, you simply attach the "type" object to the Buffer's `type` property. `ref` comes with a set of commonly used types which are described in this section.

#### Creating your own "type"

It's trivial to create your own "type" that reads and writes your own custom datatype/class to and from Buffer instances using `ref`'s unified API.  
To create your own "type", simply create a JavaScript Object with the following properties defined:

<table>

<tbody>

<tr>

<th>Name</th>

<th>Data Type</th>

<th>Description</th>

</tr>

<tr>

<td>`size`</td>

<td>`Number`</td>

<td>The size in bytes required to hold this datatype.</td>

</tr>

<tr>

<td>`indirection`</td>

<td>`Number`</td>

<td>The current level of indirection of the buffer. When defining your own "types", just set this value to `1`.</td>

</tr>

<tr>

<td>`get`</td>

<td>`Function`</td>

<td>The function to invoke when [`ref.get()`](#exports-get) is invoked on a buffer of this type.</td>

</tr>

<tr>

<td>`set`</td>

<td>`Function`</td>

<td>The function to invoke when [`ref.set()`](#exports-set) is invoked on a buffer of this type.</td>

</tr>

<tr>

<td>`name`</td>

<td>`String`</td>

<td>_(Optional)_ The name to use during debugging for this datatype.</td>

</tr>

<tr>

<td>`alignment`</td>

<td>`Number`</td>

<td>_(Optional)_ The alignment of this datatype when placed inside a struct. Defaults to the type's `size`.</td>

</tr>

</tbody>

</table>

#### The built-in "types"

Here is the list of `ref`'s built-in "type" Objects. All these built-in "types" can be found on the `ref.types` export Object. All the built-in types use "native endianness" when multi-byte datatypes are involved.

</div>

<div class="columns sixteen section"><a name="types-void"></a>[

### types.void

](#types-void)

The `void` type.

</div>

<div class="columns sixteen section"><a name="types-int8"></a>[

### types.int8

](#types-int8)

The `int8` type.

</div>

<div class="columns sixteen section"><a name="types-uint8"></a>[

### types.uint8

](#types-uint8)

The `uint8` type.

</div>

<div class="columns sixteen section"><a name="types-int16"></a>[

### types.int16

](#types-int16)

The `int16` type.

</div>

<div class="columns sixteen section"><a name="types-uint16"></a>[

### types.uint16

](#types-uint16)

The `uint16` type.

</div>

<div class="columns sixteen section"><a name="types-int32"></a>[

### types.int32

](#types-int32)

The `int32` type.

</div>

<div class="columns sixteen section"><a name="types-uint32"></a>[

### types.uint32

](#types-uint32)

The `uint32` type.

</div>

<div class="columns sixteen section"><a name="types-int64"></a>[

### types.int64

](#types-int64)

The `int64` type.

</div>

<div class="columns sixteen section"><a name="types-uint64"></a>[

### types.uint64

](#types-uint64)

The `uint64` type.

</div>

<div class="columns sixteen section"><a name="types-float"></a>[

### types.float

](#types-float)

The `float` type.

</div>

<div class="columns sixteen section"><a name="types-double"></a>[

### types.double

](#types-double)

The `double` type.

</div>

<div class="columns sixteen section"><a name="types-Object"></a>[

### types.Object

](#types-Object)

The `Object` type. This can be used to read/write regular JS Objects into raw memory.

</div>

<div class="columns sixteen section"><a name="types-CString"></a>[

### types.CString

](#types-CString)

The `CString` (a.k.a `"string"`) type.

CStrings are a kind of weird thing. We say it's `sizeof(char *)`, and `indirection` level of 1, which means that we have to return a Buffer that is pointer sized, and points to a some utf8 string data, so we have to create a 2nd "in-between" buffer.

</div>

<div class="columns sixteen section"><a name="types-bool"></a>[

### types.bool

](#types-bool)

The `bool` type.

Wrapper type around `types.uint8` that accepts/returns `true` or `false` Boolean JavaScript values.

</div>

<div class="columns sixteen section"><a name="types-byte"></a>[

### types.byte

](#types-byte)

The `byte` type.

</div>

<div class="columns sixteen section"><a name="types-char"></a>[

### types.char

](#types-char)

The `char` type.

</div>

<div class="columns sixteen section"><a name="types-uchar"></a>[

### types.uchar

](#types-uchar)

The `uchar` type.

</div>

<div class="columns sixteen section"><a name="types-short"></a>[

### types.short

](#types-short)

The `short` type.

</div>

<div class="columns sixteen section"><a name="types-ushort"></a>[

### types.ushort

](#types-ushort)

The `ushort` type.

</div>

<div class="columns sixteen section"><a name="types-int"></a>[

### types.int

](#types-int)

The `int` type.

</div>

<div class="columns sixteen section"><a name="types-uint"></a>[

### types.uint

](#types-uint)

The `uint` type.

</div>

<div class="columns sixteen section"><a name="types-long"></a>[

### types.long

](#types-long)

The `long` type.

</div>

<div class="columns sixteen section"><a name="types-ulong"></a>[

### types.ulong

](#types-ulong)

The `ulong` type.

</div>

<div class="columns sixteen section"><a name="types-longlong"></a>[

### types.longlong

](#types-longlong)

The `longlong` type.

</div>

<div class="columns sixteen section"><a name="types-ulonglong"></a>[

### types.ulonglong

](#types-ulonglong)

The `ulonglong` type.

</div>

<div class="columns sixteen section"><a name="types-size_t"></a>[

### types.size_t

](#types-size_t)

The `size_t` type.

</div>

* * *

<div class="columns eight section exports"><a name="extensions"></a>[

## Buffer extensions

](#extensions)</div>

<div class="columns sixteen intro">

`Buffer.prototype` gets extended with some convenience functions that you can use in your modules and/or applications.

</div>

<div class="columns sixteen section"><a name="extensions-address"></a>[

### Buffer#address()

](#extensions-address)

Shorthand for [`ref.address(this, …)`](#exports-address).

Accepts a `Buffer` instance and returns the memory address of the buffer instance.

    console.log(ref.address(new Buffer(1)));
    4320233616

    console.log(ref.address(ref.NULL)));
    0

</div>

<div class="columns sixteen section"><a name="extensions-deref"></a>[

### Buffer#deref()

](#extensions-deref)

Shorthand for [`ref.deref(this, …)`](#exports-deref).

Accepts a Buffer instance and attempts to "dereference" it. That is, first it checks the `indirection` count of _buffer_'s "type", and if it's greater than **1** then it merely returns another Buffer, but with one level less `indirection`.

When _buffer_'s indirection is at **1**, then it checks for `buffer.type` which should be an Object with its own `get()` function.

    var buf = ref.alloc('int', 6);

    var val = ref.deref(buf);
    console.log(val);
    6

</div>

<div class="columns sixteen section"><a name="extensions-hexAddress"></a>[

### Buffer#hexAddress()

](#extensions-hexAddress)

Shorthand for [`ref.hexAddress(this, …)`](#exports-hexAddress).

</div>

<div class="columns sixteen section"><a name="extensions-inspect"></a>[

### Buffer#inspect()

](#extensions-inspect)

`ref` overwrites the default `Buffer#inspect()` function to include the hex-encoded memory address of the Buffer instance when invoked.

This is simply a nice-to-have.

**Before**:

    console.log(new Buffer('ref'));
    <Buffer 72 65 66>

**After**:

    console.log(new Buffer('ref'));
    <Buffer@0x103015490 72 65 66>

</div>

<div class="columns sixteen section"><a name="extensions-isNull"></a>[

### Buffer#isNull()

](#extensions-isNull)

Shorthand for [`ref.isNull(this, …)`](#exports-isNull).

Accepts a `Buffer` instance and returns _true_ if the buffer represents the NULL pointer, _false_ otherwise.

    console.log(ref.isNull(new Buffer(1)));
    false

    console.log(ref.isNull(ref.NULL));
    true

</div>

<div class="columns sixteen section"><a name="extensions-readCString"></a>[

### Buffer#readCString()

](#extensions-readCString)

Shorthand for [`ref.readCString(this, …)`](#exports-readCString).

Returns a JavaScript String read from _buffer_ at the given _offset_. The C String is read until the first NULL byte, which indicates the end of the String.

This function can read beyond the `length` of a Buffer.

    var buf = new Buffer('hello\0world\0');

    var str = ref.readCString(buf, 0);
    console.log(str);
    'hello'

</div>

<div class="columns sixteen section"><a name="extensions-readInt64BE"></a>[

### Buffer#readInt64BE()

](#extensions-readInt64BE)

Shorthand for [`ref.readInt64BE(this, …)`](#exports-readInt64BE).

Returns a big-endian signed 64-bit int read from _buffer_ at the given _offset_.

If the returned value will fit inside a JavaScript Number without losing precision, then a Number is returned, otherwise a String is returned.

    var buf = ref.alloc('int64');
    ref.writeInt64BE(buf, 0, '9223372036854775807');

    var val = ref.readInt64BE(buf, 0)
    console.log(val)
    '9223372036854775807'

</div>

<div class="columns sixteen section"><a name="extensions-readInt64LE"></a>[

### Buffer#readInt64LE()

](#extensions-readInt64LE)

Shorthand for [`ref.readInt64LE(this, …)`](#exports-readInt64LE).

Returns a little-endian signed 64-bit int read from _buffer_ at the given _offset_.

If the returned value will fit inside a JavaScript Number without losing precision, then a Number is returned, otherwise a String is returned.

    var buf = ref.alloc('int64');
    ref.writeInt64LE(buf, 0, '9223372036854775807');

    var val = ref.readInt64LE(buf, 0)
    console.log(val)
    '9223372036854775807'

</div>

<div class="columns sixteen section"><a name="extensions-readObject"></a>[

### Buffer#readObject()

](#extensions-readObject)

Shorthand for [`ref.readObject(this, …)`](#exports-readObject).

Reads a JavaScript Object that has previously been written to the given _buffer_ at the given _offset_.

    var obj = { foo: 'bar' };
    var buf = ref.alloc('Object', obj);

    var obj2 = ref.readObject(buf, 0);
    console.log(obj === obj2);
    true

</div>

<div class="columns sixteen section"><a name="extensions-readPointer"></a>[

### Buffer#readPointer()

](#extensions-readPointer)

Shorthand for [`ref.readPointer(this, …)`](#exports-readPointer).

Reads a Buffer instance from the given _buffer_ at the given _offset_. The _size_ parameter specifies the `length` of the returned Buffer instance, which defaults to **0**.

    var buf = new Buffer('hello world');
    var pointer = ref.alloc('pointer');

    var buf2 = ref.readPointer(pointer, 0, buf.length);
    console.log(buf.toString());
    'hello world'

</div>

<div class="columns sixteen section"><a name="extensions-readUInt64BE"></a>[

### Buffer#readUInt64BE()

](#extensions-readUInt64BE)

Shorthand for [`ref.readUInt64BE(this, …)`](#exports-readUInt64BE).

Returns a big-endian unsigned 64-bit int read from _buffer_ at the given _offset_.

If the returned value will fit inside a JavaScript Number without losing precision, then a Number is returned, otherwise a String is returned.

    var buf = ref.alloc('uint64');
    ref.writeUInt64BE(buf, 0, '18446744073709551615');

    var val = ref.readUInt64BE(buf, 0)
    console.log(val)
    '18446744073709551615'

</div>

<div class="columns sixteen section"><a name="extensions-readUInt64LE"></a>[

### Buffer#readUInt64LE()

](#extensions-readUInt64LE)

Shorthand for [`ref.readUInt64LE(this, …)`](#exports-readUInt64LE).

Returns a little-endian unsigned 64-bit int read from _buffer_ at the given _offset_.

If the returned value will fit inside a JavaScript Number without losing precision, then a Number is returned, otherwise a String is returned.

    var buf = ref.alloc('uint64');
    ref.writeUInt64LE(buf, 0, '18446744073709551615');

    var val = ref.readUInt64LE(buf, 0)
    console.log(val)
    '18446744073709551615'

</div>

<div class="columns sixteen section"><a name="extensions-ref"></a>[

### Buffer#ref()

](#extensions-ref)

Shorthand for [`ref.ref(this, …)`](#exports-ref).

`ref()` accepts a Buffer instance and returns a new Buffer instance that is "pointer" sized and has its data pointing to the given Buffer instance. Essentially the created Buffer is a "reference" to the original pointer, equivalent to the following C code:

    char *buf = buffer;
    char **ref = &buf;

</div>

<div class="columns sixteen section"><a name="extensions-reinterpret"></a>[

### Buffer#reinterpret()

](#extensions-reinterpret)

Shorthand for [`ref.reinterpret(this, …)`](#exports-reinterpret).

Returns a new Buffer instance with the specified _size_, with the same memory address as _buffer_.

This function "attaches" _buffer_ to the returned Buffer to prevent it from being garbage collected.

</div>

<div class="columns sixteen section"><a name="extensions-reinterpretUntilZeros"></a>[

### Buffer#reinterpretUntilZeros()

](#extensions-reinterpretUntilZeros)

Shorthand for [`ref.reinterpretUntilZeros(this, …)`](#exports-reinterpretUntilZeros).

Accepts a `Buffer` instance and a number of `NULL` bytes to read from the pointer. This function will scan past the boundary of the Buffer's `length` until it finds `size` number of aligned `NULL` bytes.

This is useful for finding the end of NUL-termintated array or C string. For example, the `readCString()` function _could_ be implemented like:

    function readCString (buf) {
      return ref.reinterpretUntilZeros(buf, 1).toString('utf8')
    }

This function "attaches" _buffer_ to the returned Buffer to prevent it from being garbage collected.

</div>

<div class="columns sixteen section"><a name="extensions-writeCString"></a>[

### Buffer#writeCString()

](#extensions-writeCString)

Shorthand for [`ref.writeCString(this, …)`](#exports-writeCString).

Writes the given string as a C String (NULL terminated) to the given buffer at the given offset. "encoding" is optional and defaults to **'utf8'**.

Unlike `readCString()`, this function requires the buffer to actually have the proper length.

</div>

<div class="columns sixteen section"><a name="extensions-writeInt64BE"></a>[

### Buffer#writeInt64BE()

](#extensions-writeInt64BE)

Shorthand for [`ref.writeInt64BE(this, …)`](#exports-writeInt64BE).

Writes the _input_ Number or String as a big-endian signed 64-bit int into _buffer_ at the given _offset_.

    var buf = ref.alloc('int64');
    ref.writeInt64BE(buf, 0, '9223372036854775807');

</div>

<div class="columns sixteen section"><a name="extensions-writeInt64LE"></a>[

### Buffer#writeInt64LE()

](#extensions-writeInt64LE)

Shorthand for [`ref.writeInt64LE(this, …)`](#exports-writeInt64LE).

Writes the _input_ Number or String as a little-endian signed 64-bit int into _buffer_ at the given _offset_.

    var buf = ref.alloc('int64');
    ref.writeInt64LE(buf, 0, '9223372036854775807');

</div>

<div class="columns sixteen section"><a name="extensions-writeObject"></a>[

### Buffer#writeObject()

](#extensions-writeObject)

Shorthand for [`ref.writeObject(this, …)`](#exports-writeObject).

Writes a pointer to _object_ into _buffer_ at the specified _offset.

This function "attaches" _object_ to _buffer_ to prevent it from being garbage collected.

    var buf = ref.alloc('Object');
    ref.writeObject(buf, 0, { foo: 'bar' });

</div>

<div class="columns sixteen section"><a name="extensions-writePointer"></a>[

### Buffer#writePointer()

](#extensions-writePointer)

Shorthand for [`ref.writePointer(this, …)`](#exports-writePointer).

Writes the memory address of _pointer_ to _buffer_ at the specified _offset_.

This function "attaches" _object_ to _buffer_ to prevent it from being garbage collected.

    var someBuffer = new Buffer('whatever');
    var buf = ref.alloc('pointer');
    ref.writePointer(buf, 0, someBuffer);

</div>

<div class="columns sixteen section"><a name="extensions-writeUInt64BE"></a>[

### Buffer#writeUInt64BE()

](#extensions-writeUInt64BE)

Shorthand for [`ref.writeUInt64BE(this, …)`](#exports-writeUInt64BE).

Writes the _input_ Number or String as a big-endian unsigned 64-bit int into _buffer_ at the given _offset_.

    var buf = ref.alloc('uint64');
    ref.writeUInt64BE(buf, 0, '18446744073709551615');

</div>

<div class="columns sixteen section"><a name="extensions-writeUInt64LE"></a>[

### Buffer#writeUInt64LE()

](#extensions-writeUInt64LE)

Shorthand for [`ref.writeUInt64LE(this, …)`](#exports-writeUInt64LE).

Writes the _input_ Number or String as a little-endian unsigned 64-bit int into _buffer_ at the given _offset_.

    var buf = ref.alloc('uint64');
    ref.writeUInt64LE(buf, 0, '18446744073709551615');

</div>

</div>

<div class="ribbon">[Fork me on GitHub](https://github.com/TooTallNate/ref)</div>