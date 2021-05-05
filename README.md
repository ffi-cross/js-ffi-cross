# js-ffi-cross

Foreign Function Interface for JavaScript(NodeJS/QuickJS)

[![NPM Version](https://img.shields.io/npm/v/ffi-cross.svg?style=flat)](https://npmjs.org/package/ffi-cross)
[![NPM Downloads](https://img.shields.io/npm/dm/ffi-cross.svg?style=flat)](https://npmjs.org/package/ffi-cross)
[![Coverage Status](https://coveralls.io/repos/github/ffi-cross/js-ffi-cross/badge.svg?branch=master)](https://coveralls.io/github/ffi-cross/js-ffi-cross?branch=master)
[![Dependency Status](https://david-dm.org/ffi-cross/js-ffi-cross.svg?style=flat)](https://david-dm.org/ffi-cross/js-ffi-cross)

`js-ffi-cross` is a Node.js addon for loading and calling dynamic libraries
using pure JavaScript. It can be used to create bindings to native libraries
without writing any C++ code.

It also simplifies the augmentation of node.js with C code as it takes care of
handling the translation of types across JavaScript and C, which can add reams
of boilerplate code to your otherwise simple C. See the `example/factorial`
for an example of this use case.

**WARNING**: `js-ffi-cross` assumes you know what you're doing. You can pretty
easily create situations where you will segfault the interpreter and unless
you've got C debugger skills, you probably won't know what's going on.

**WARNING**: As a fork of `node-ffi` and `node-ffi-napi`, the original API of `node-ffi` is
are rewrited in the `js-ffs-cross`. So please reference the [TypeScript DefinitelyTyped file][typed].
The API did not have very well-defined properties in the context of garbage collection
and multi-threaded execution. It is recommended to avoid any multi-threading usage of
this library if possible. 

## Example

``` js
const ffi = require('ffi-cross');

const libm = ffi.Library('libm', {
  'ceil': [ ffi.types.double [ ffi.types.double ] ]
});
libm.ceil(1.5); // 2

// You can also access just functions in the current process by passing a null
const current = ffi.Library(null, {
  'atoi': [ ffi.types.int, [ ffi.types.CString ] ]
});
current.atoi('1234'); // 1234
```

For a more detailed introduction, see the [js-ffi-cross tutorial page][tutorial].

## Requirements

* Linux, OS X, Windows, or Solaris.
* `libffi` comes bundled with js-ffi-cross; it does *not* need to be installed on your system.
* The current version is tested to run on Node 12 and above.

## Installation

Make sure you've installed all the [necessary build
tools](https://github.com/TooTallNate/node-gyp#installation) for your platform,
then invoke:

``` bash
npm install ffi-cross
```

## Source Install / Manual Compilation

Now you can compile `js-ffi-cross`:

``` bash
git clone git://github.com/ffi-cross/js-ffi-cross.git
cd js-ffi-cross
npm i
npm run prebuild
```

Building debug version:

```bash
npm run prebuild:debug
```

## Testing

On Win32, should install chocolatey and sqlite3 with `Administrator` permission powershell

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
choco install -y --no-progress sqlite
```

On Debian and decendent Linux, should install sqlite3 with:

```bash
sudo apt-get install -y libsqlite3-dev
```

## Types

The types that you specify in function declarations correspond to ref's types
system. So [see its docs][ref-types] for
a reference if you are unfamiliar.

## V8 and 64-bit Types

Internally, V8 stores integers that will fit into a 32-bit space in a 32-bit
integer, and those that fall outside of this get put into double-precision
floating point numbers. This is problematic because FP numbers are imprecise.
To get around this, the methods in js-ffi-cross that deal with 64-bit integers return
strings and can accept strings as parameters.

## Call Overhead

There is non-trivial overhead associated with FFI calls. Comparing a hard-coded
binding version of `strtoul()` to an FFI version of `strtoul()` shows that the
native hard-coded binding is orders of magnitude faster. So don't just use the
C version of a function just because it's faster. There's a significant cost in
FFI calls, so make them worth it.

## License

MIT License. See the `LICENSE` file.

[typed]: https://github.com/ffi-cross/js-ffi-cross/blob/master/types/index.d.ts
[tutorial]: https://github.com/ffi-cross/js-ffi-cross/blob/master/docs/tutorial.md
[ref-types]: https://github.com/ffi-cross/js-ffi-cross/blob/master/docs/ref.md#the-built-in-types
