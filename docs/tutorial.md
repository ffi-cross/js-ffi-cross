# ffi-cross tutorial

## Overview

`ffi-cross` provides a powerful set of tools for interfacing with dynamic libraries using pure JavaScript in the Node.js environment. It can be used to build interface bindings for libraries without using any C++ code.

### The [`types`][types] module

Primitive c types for `ffi-crros`

### The [`ref`][ref] module

Central to the `ffi-cross` infrastructure is the [`ref`][ref] module, which extends node's built-in `Buffer` class with some useful native extensions that make them act more like "pointers". While we try our best to hide the gory details of dealing with pointers, in many cases libraries use complex memory structures that require access to allocation and manipulation of raw memory. See its documentation for more details about working with "pointers".

### The `Library` function

_signature:_

```js
ffi.Library(_libraryFile_, { _functionSymbol_: [ _returnType_, [ _arg1Type_, _arg2Type_, ... ], ... ]);
```

The primary API for `ffi-cross` is through the `Library` function. It is used to specify a dynamic library to link with, as well as a list of functions that should be available for that library. After instantiation, the returned object will have a method for each library function specified in the function, which can be used to easily call the library code.

```js
const ffi = require("ffi-cross");
const { ref, types } = ffi;

// typedef
const sqlite3 = types.void; // we don't know what the layout of "sqlite3" looks like
const sqlite3Ptr = ref.refType(sqlite3);
const sqlite3PtrPtr = ref.refType(sqlite3Ptr);
const stringPtr = ref.refType(types.CString);
const sqlite3CallbackContext = types.voidPtr;
const sqlite3Callback = ffi.Function(types.int, [
  sqlite3CallbackContext,
  types.int,
  stringPtr,
  stringPtr,
]);

// binding to a few "libsqlite3" functions...
const lib =
  process.platform == "win32"
    ? path.join(
        process.env.ProgramData ?? "",
        "chocolatey/lib/SQLite/tools/sqlite3.dll"
      )
    : "libsqlite3";
const libsqlite3 = ffi.Library(lib, {
  sqlite3_open: [types.int, [types.CString, sqlite3PtrPtr]],
  sqlite3_close: [types.int, [sqlite3PtrPtr]],
  sqlite3_exec: [
    types.int,
    [
      sqlite3Ptr,
      types.CString,
      sqlite3Callback,
      sqlite3CallbackContext,
      stringPtr,
    ],
  ],
  sqlite3_changes: [types.int, [sqlite3PtrPtr]],
});

// now use them:
var dbPtrPtr = ref.alloc(sqlite3PtrPtr);
libsqlite3.sqlite3_open("test.sqlite3", dbPtrPtr);
var dbHandle = ref.deref(dbPtrPtr);
```

To construct a usable `Library` object, a "libraryFile" String and at least one function must be defined in the specification.

### Common Usage

For the purposes of this explanation, we are going to use a fictitious interface specification for "libmylibrary." Here's the C interface we've seen in its .h header file:

```c
double    do_some_number_fudging(double a, int b);
myobj *   create_object();
double    do_stuff_with_object(myobj *obj);
void      use_string_with_object(myobj *obj, char *value);
void      delete_object(myobj *obj);
```

Our C code would be something like this:

```c
#include "mylibrary.h"
int main()
{
    myobj *fun_object;
    double res, fun;

    res = do_some_number_fudging(1.5, 5);
    fun_object = create_object();

    if (fun_object == NULL) {
      printf("Oh no! Couldn't create object!\n");
      exit(2);
    }

    use_string_with_object(fun_object, "Hello World!");
    fun = do_stuff_with_object(fun_object);
    delete_object(fun_object);
}
```

The JavaScript code to wrap this library would be:

```js
const ffi = require("ffi-cross");
const { ref, types } = ffi;
// typedefs
const myobj = types.void; // we don't know what the layout of "myobj" looks like
const myobjPtr = ref.refType(myobj);

const MyLibrary = ffi.Library("libmylibrary", {
  do_some_number_fudging: [types.double, [types.double, types.int]],
  create_object: [myobjPtr, []],
  do_stuff_with_object: [types.double, [myobjPtr]],
  use_string_with_object: [types.void, [myobjPtr, types.string]],
  delete_object: [types.void, [myobjPtr]],
});
```

We could then use it from JavaScript:

```js
var res = MyLibrary.do_some_number_fudging(1.5, 5);
var fun_object = MyLibrary.create_object();

if (ref.isNull(fun_object)) {
  console.log("Oh no! Couldn't create object!\n");
} else {
  MyLibrary.use_string_with_object(fun_object, "Hello World!");
  var fun = MyLibrary.do_stuff_with_object(fun_object);
  MyLibrary.delete_object(fun_object);
}
```

### Output Parameters

Sometimes C APIs will actually return things using parameters. Passing a pointer allows the called function to manipulate memory that has been passed to it.

Let's imagine our fictitious library has an additional function:

```c
void manipulate_number(int *out_number);
void get_md5_string(char *out_string);
```

Notice that the `out_number` parameter is an `int *`, not an `int`. This means that we're only going to pass a pointer to a value (or passing by reference), not the actual value itself. In C, we'd do the following to call this method:

```c
int outNumber = 0;
manipulate_number(&outNumber);
```

The `& (lvalue)` operator extracts a pointer for the `outNumber` variable. How do we do this in JavaScript? Let's define the wrapper:

```js
var intPtr = ref.refType(types.int);

var libmylibrary = ffi.Library('libmylibrary', { ...,
  'manipulate_number': [ types.void, [ intPtr ] ]
});
```

Note how we've actually defined this method as taking a `int *` parameter, not an `int` as we would if we were passing by value. To call the method, we must first allocate space to store the output data using the `ref.alloc()` function, then call the function with the returned `Buffer` instance.

```js
var outNumber = ref.alloc("int"); // allocate a 4-byte (32-bit) chunk for the output data
libmylibrary.manipulate_number(outNumber);
var actualNumber = ref.deref(outNumber);
```

Once we've called the function, our value is now stored in the memory we've allocated in `outNumber`. To extract it, we have to read the 32-bit signed integer value into a JavaScript Number value by calling the `.deref()` function.

Calling a function that wants to write into a preallocated char array works in a similar way:

```js
var libmylibrary = ffi.Library('libmylibrary', { ...,
  'get_md5_string': [ types.void, [ types.CString ] ]
});
```

To call the method, we must first allocate space to store the output data using new Buffer(), then call the function with the `Buffer` instance.

```js
var buffer = new Buffer(32); // allocate 32 bytes for the output data, an imaginary MD5 hex string.
libmylibrary.get_md5_string(buffer);
var actualString = ref.readCString(buffer, 0);
```

### Async Library Calls

`node-ffi` supports the ability to execute library calls in a different thread using the **libuv** library. To use the async support, you invoke the `.async()` function on any returned FFI'd function.

```js
var libmylibrary = ffi.Library("libmylibrary", {
  mycall: [types.int, [types.int]],
});

libmylibrary.mycall.async(1234, function (err, res) {});
```

Now a call to the function runs on the thread pool and invokes the supplied callback function when completed. Following the node convention, an `err` argument is passed to the callback first, followed by the `res` containing the result of the function call.

```js
libmylibrary.mycall.async(1234, function (err, res) {
  if (err) throw err;
  console.log("mycall returned " + res);
});
```

### Callbacks

The native library can call functions inside the javascript. The `ffi.Callback` function returns a pointer that can be passed to the native library.

_signature:_

```js
ffi.Callback(_returnType_, [ _arg1Type_, _arg2Type_, ... ], _function_);
```

Example:

```js
const ffi = require("ffi-cross");
const { ref, types } = ffi;

// Interface into the native lib
const libname = ffi.Library("./libname", {
  setCallback: [types.void, [types.voidPtr]],
});

// Callback from the native lib back into js
const callback = ffi.Callback(
  types.void[(types.int, types.CString)],
  function (id, name) {
    console.log("id: ", id);
    console.log("name: ", name);
  }
);

console.log("registering the callback");
libname.setCallback(callback);
console.log("done");

// Make an extra reference to the callback pointer to avoid GC
process.on("exit", function () {
  callback;
});
```

The native library can call this callback even in another thread. The javascript function for the callback is always fired in the node.js main thread event loop. The caller thread will wait until the call returns and the return value can then be used.

Note that you need to keep a reference to the callback pointer returned by `ffi.Callback` in some way to avoid garbage collection.

### Structs

To provide the ability to read and write C-style data structures, `js-ffi-cross` provides StructType. See its documentation for more information about defining Struct types. The returned StructType constructors are valid "types" for use in FFI'd functions, for example `gettimeofday()`:

```js
const ffi = require("ffi-cross");
const { ref, types, StructType } = ffi;

const TimeVal = StructType({
  tv_sec: types.long,
  tv_usec: types.long,
});
const TimeValPtr = ref.refType(TimeVal);

const lib = new ffi.Library(null, {
  gettimeofday: [types.int, [TimeValPtr, types.voidPtr]],
});
const tv = new TimeVal();
lib.gettimeofday(ref.ref(tv), null);
console.log("Seconds since epoch: " + tv.tv_sec);
```

[ref]: https://github.com/ffi-cross/js-ffi-cross/blob/master/docs/ref.md
[types]: https://github.com/ffi-cross/js-ffi-cross/blob/master/docs/types.md
[ref-struct]: https://github.com/ffi-cross/js-ffi-cross/blob/master/types/lib/ref-struct.ts
