# ref tutorial

## Introduction

Turn Buffer instances into "pointers"

### What is `ref`?

`ref` is a native addon for Node.js with some fancy additions like:

- Getting the memory address of a Buffer
- Checking the endianness of the processor
- Checking if a Buffer represents the NULL pointer
- Reading and writing "pointers" with Buffers
- Reading and writing C Strings (NULL-terminated)
- Reading and writing JavaScript Object references
- Reading and writing **int64_t** and **uint64_t** values
- A "type" convention to define the contents of a Buffer

There is indeed a lot of _meat_ to `ref`, but it all fits together in one way or another in the end.
For simplicity, `ref`'s API can be broken down into 3 sections:

### ref `exports`

All the static versions of `ref`'s functions and default "types" available on the exports returned from `require('ffi-cross').ref`.

### _"type"_ system

The _"type"_ system allows you to define a "type" on any Buffer instance, and then use generic `ref()` and `deref()` functions to reference and dereference values.

### `Buffer` extensions

`Buffer.prototype` gets extended with some convenience functions. These all just mirror their static counterpart, using the Buffer's `this` variable as the `buffer` variable.

## ref exports

This section documents all the functions exported from `require('ffi-cross').ref`.

### ref.NULL ⇒ Buffer

A `Buffer` that references the C NULL pointer. That is, its memory address points to 0\. Its `length` is 0 because accessing any data from this buffer would cause a _segmentation fault_.

```js
console.log(ref.NULL);
<SlowBuffer@0x0 >
```

### ref.NULL_POINTER ⇒ Buffer

`NULL_POINTER` is a pointer-sized `Buffer` instance pointing to `NULL`. Conceptually, it's equivalent to the following C code:

```js
char * null_pointer;
null_pointer = NULL;
```

### ref.address(Buffer buffer) → BigInt

- buffer - The buffer to get the memory address of.
- **Return:** The memory address the buffer instance.

Accepts a `Buffer` instance and returns the memory address of the buffer instance.

```js
console.log(ref.address(new Buffer(1)));
4320233616n

console.log(ref.address(ref.NULL)));
0n
```

### ref.alloc(Object|String type, ? value) → Buffer

- type - The "type" object to allocate. Strings get coerced first.
- value - (optional) The initial value set on the returned Buffer, using _type_'s `set()` function.
- **Return:** A new Buffer instance with it's `type` set to "type", and (optionally) "value" written to it.

Returns a new Buffer instance big enough to hold `type`, with the given `value` written to it.

```js
var intBuf = ref.alloc(ffi.types.int);
var int_with_4 = ref.alloc(ffi.types.int, 4);
```

### ref.allocCString(String string, String encoding) → Buffer

- string - The JavaScript string to be converted to a C string.
- encoding - (optional) The encoding to use for the C string. Defaults to **'utf8'**.
- **Return:** The new `Buffer` instance with the specified String wrtten to it, and a trailing NUL byte.

Returns a new `Buffer` instance with the given String written to it with the given encoding (defaults to **'utf8'**). The buffer is 1 byte longer than the string itself, and is NUL terminated.

```js
var buf = ref.allocCString("hello world");

console.log(buf.toString());
("hello world\u0000");
```

### ref.deref(Buffer buffer) → ?

- buffer - A Buffer instance to dereference.
- **Return:** The returned value after dereferencing _buffer_.

Accepts a Buffer instance and attempts to "dereference" it. That is, first it checks the `indirection` count of _buffer_'s "type", and if it's greater than **1** then it merely returns another Buffer, but with one level less `indirection`.

When _buffer_'s indirection is at **1**, then it checks for `buffer.type` which should be an Object with its own `get()` function.

```js
var buf = ref.alloc("int", 6);

var val = ref.deref(buf);
console.log(val);
6;
```

### ref.derefType(Object|String type) → Object

- type - The "type" object to create a dereference type from. Strings get coerced first.
- **Return:** The new "type" object with its `indirection` decremented by 1.

Returns a new clone of the given "type" object, with its `indirection` level decremented by 1.

### ref.endianness ⇒ String

A string that represents the native endianness of the machine's processor. The possible values are either `"LE"` or `"BE"`.

```js
console.log(ref.endianness);
("LE");
```

### ref.get(Buffer buffer, Number offset, Object|String type) → ?

- buffer - The Buffer instance to read from.
- offset - (optional) The offset on the Buffer to start reading from. Defaults to 0.
- type - (optional) The "type" object to use when reading. Defaults to calling `getType()` on the buffer.
- **Return:** Whatever value the "type" used when reading returns.

Calls the `get()` function of the Buffer's current "type" (or the passed in _type_ if present) at the given _offset_.

This function handles checking the "indirection" level and returning a proper "dereferenced" Bufffer instance when necessary.

### ref.getType(Buffer buffer) → Object

- buffer - The Buffer instance to get the "type" object from.
- **Return:** The "type" object from the given Buffer.

Returns the "type" property of the given Buffer. Creates a default type for the buffer when none exists.

### ref.isNull(Buffer buffer) → Boolean

- buffer - The buffer to check for NULL.
- **Return:** true or false.

Accepts a `Buffer` instance and returns _true_ if the buffer represents the NULL pointer, _false_ otherwise.

```js
console.log(ref.isNull(new Buffer(1)));
false;

console.log(ref.isNull(ref.NULL));
true;
```

### ref.readCString(Buffer buffer, Number offset) → String

- buffer - The buffer to read a Buffer from.
- offset - The offset to begin reading from.
- **Return:** The String that was read from _buffer_.

Returns a JavaScript String read from _buffer_ at the given _offset_. The C String is read until the first NULL byte, which indicates the end of the String.

This function can read beyond the `length` of a Buffer.

```js
var buf = new Buffer("hello\0world\0");

var str = ref.readCString(buf, 0);
console.log(str);
("hello");
```

### ref.readObject(Buffer buffer, Number offset) → Object

- buffer - The buffer to read an Object from.
- offset - The offset to begin reading from.
- **Return:** The Object that was read from _buffer_.

Reads a JavaScript Object that has previously been written to the given _buffer_ at the given _offset_.

```js
var obj = { foo: "bar" };
var buf = ref.alloc("Object", obj);

var obj2 = ref.readObject(buf, 0);
console.log(obj === obj2);
true;
```

### ref.readPointer(Buffer buffer, Number offset, Number length) → Buffer

- buffer - The buffer to read a Buffer from.
- offset - The offset to begin reading from.
- length - (optional) The length of the returned Buffer. Defaults to 0.
- **Return:** The Buffer instance that was read from _buffer_.

Reads a Buffer instance from the given _buffer_ at the given _offset_. The _size_ parameter specifies the `length` of the returned Buffer instance, which defaults to **0**.

```js
var buf = new Buffer("hello world");
var pointer = ref.alloc("pointer");

var buf2 = ref.readPointer(pointer, 0, buf.length);
console.log(buf.toString());
("hello world");
```

### ref.ref(Buffer buffer) → Buffer

- buffer - A Buffer instance to create a reference to.
- **Return:** A new Buffer instance pointing to _buffer_.

`ref()` accepts a Buffer instance and returns a new Buffer instance that is "pointer" sized and has its data pointing to the given Buffer instance. Essentially the created Buffer is a "reference" to the original pointer, equivalent to the following C code:

```c
char *buf = buffer;
char **ref = &buf;
```

### ref.refType(Object|String type) → Object

- type - The "type" object to create a reference type from. Strings get coerced first.
- **Return:** The new "type" object with its `indirection` incremented by 1.

Returns a new clone of the given "type" object, with its `indirection` level incremented by **1**.

Say you wanted to create a type representing a `void *`:

```js
var voidPtr = ref.refType(ffi.types.void);
```

### ref.reinterpret(Buffer buffer, Number size, Number offset) → Buffer

- buffer - A Buffer instance to base the returned Buffer off of.
- size - The `length` property of the returned Buffer.
- offset - The offset of the Buffer to begin from.
- **Return:** A new Buffer instance with the same memory address as _buffer_, and the requested _size_.

Returns a new Buffer instance with the specified _size_, with the same memory address as _buffer_.

This function "attaches" _buffer_ to the returned Buffer to prevent it from being garbage collected.

### ref.reinterpretUntilZeros(Buffer buffer, Number size, Number offset) → Buffer

- buffer - A Buffer instance to base the returned Buffer off of.
- size - The number of sequential, aligned `NULL` bytes are required to terminate the buffer.
- offset - The offset of the Buffer to begin from.
- **Return:** A new Buffer instance with the same memory address as _buffer_, and a variable `length` that is terminated by _size_ NUL bytes.

Accepts a `Buffer` instance and a number of `NULL` bytes to read from the pointer. This function will scan past the boundary of the Buffer's `length` until it finds `size` number of aligned `NULL` bytes.

This is useful for finding the end of NUL-termintated array or C string.
This function "attaches" _buffer_ to the returned Buffer to prevent it from being garbage collected.

### ref.set(Buffer buffer, ? value, Number offset, Object|String type)

- buffer - The Buffer instance to write to.
- value - The value to write to the Buffer instance.
- offset - The offset on the Buffer to start writing to.
- type - (optional) The "type" object to use when reading. Defaults to calling `getType()` on the buffer.

Calls the `set()` function of the Buffer's current "type" (or the passed in _type_ if present) at the given _offset_.

This function handles checking the "indirection" level writing a pointer rather than calling the `set()` function if the indirection is greater than 1.

### ref.writeCString(Buffer buffer, String string, Number offset, String encoding)

- buffer - The Buffer instance to write to.
- string - The JavaScript String to write that will be written to the buffer.
- offset - The offset of the buffer to begin writing at.
- encoding - (optional) The encoding to read the C string as. Defaults to **'utf8'**.

Writes the given string as a C String (NULL terminated) to the given buffer at the given offset. "encoding" is optional and defaults to **'utf8'**.

Unlike `readCString()`, this function requires the buffer to actually have the proper length.

### ref.writeObject(Buffer buffer, Object object, Number offset)

- buffer - A Buffer instance to write _object_ to.
- object - The Object to be written into _buffer_.
- offset - The offset on the Buffer to start writing at.

Writes a pointer to _object_ into _buffer_ at the specified \_offset.

This function "attaches" _object_ to _buffer_ to prevent it from being garbage collected.

```js
var buf = ref.alloc("Object");
ref.writeObject(buf, { foo: "bar" }, 0);
```

### ref.writePointer(Buffer buffer, Buffer pointer, Number offset)

- buffer - A Buffer instance to write \_pointer to.
- pointer - The Buffer instance whose memory address will be written to _buffer_.
- offset - The offset on the Buffer to start writing at.

Writes the memory address of _pointer_ to _buffer_ at the specified _offset_.

This function "attaches" _object_ to _buffer_ to prevent it from being garbage collected.

```js
var someBuffer = new Buffer("whatever");
var buf = ref.alloc("pointer");
ref.writePointer(buf, someBuffer, 0);
```

### ref.\_attach(Buffer buffer, Object|Buffer object)

- buffer - A Buffer instance to attach _object_ to.
- object - An Object or Buffer to prevent from being garbage collected until _buffer_ does.

Attaches _object_ to _buffer_ such that it prevents _object_ from being garbage collected until _buffer_ does.

### ref.\_reinterpret(Buffer buffer, Number size, Number offset) → Buffer

- buffer - A Buffer instance to base the returned Buffer off of.
- size - The `length` property of the returned Buffer.
- offset - The offset of the Buffer to begin from.
- **Return:** A new Buffer instance with the same memory address as _buffer_, and the requested _size_.

Same as `ref.reinterpret()`, except that this version does not attach _buffer_ to the returned Buffer, which is potentially unsafe if the garbage collector runs.

### ref.\_writeObject(Buffer buffer, Object object, Number offset)

- buffer - A Buffer instance to write _object_ to.
- object - The Object to be written into _buffer_.
- offset - The offset on the Buffer to start writing at.

Same as `ref.writeObject()`, except that this version does not _attach_ the Object to the Buffer, which is potentially unsafe if the garbage collector runs.

### ref.\_writePointer(Buffer buffer, Buffer pointer, Number offset)

- buffer - A Buffer instance to write \_pointer to.
- pointer - The Buffer instance whose memory address will be written to _buffer_.
- offset - The offset on the Buffer to start writing at.

Same as `ref.writePointer()`, except that this version does not attach _pointer_ to _buffer_, which is potentially unsafe if the garbage collector runs.

## The _"type"_ system

A "type" in `ref` is simply an plain old JavaScript Object, with a set of expected properties attached that implement the logic for getting & setting values on a given `Buffer` instance.

To attach a "type" to a Buffer instance, you simply attach the "type" object to the Buffer's `type` property. `ref` comes with a set of commonly used types which are described in this section.

### Creating your own "type"

It's trivial to create your own "type" that reads and writes your own custom datatype/class to and from Buffer instances using `ref`'s unified API.
To create your own "type", simply create a JavaScript Object with the following properties defined:

| Name          | Data Type  | Description                                                                                                 |
| ------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `size`        | `Number`   | The size in bytes required to hold this datatype.                                                           |
| `indirection` | `Number`   | The current level of indirection of the buffer. When defining your own "types", just set this value to `1`. |
| `get`         | `Function` | The function to invoke when [`ref.get()` is invoked on a buffer of this type.                               |
| `set`         | `Function` | The function to invoke when [`ref.set()` is invoked on a buffer of this type.                               |
| `name`        | `String`   | _(Optional)_ The name to use during debugging for this datatype.                                            |
| `alignment`   | `Number`   | _(Optional)_ The alignment of this datatype when placed inside a struct. Defaults to the type's `size`.     |

[Fork me on GitHub](https://github.com/ffi-cross/js-ffi-cross)
