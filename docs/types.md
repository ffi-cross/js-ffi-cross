# types tutorial

## Introduction

Primitive types

## The built-in "types"

Here is the list of `ffi`'s built-in "type" Objects. All these built-in "types" can be found on the `ffi.types` export Object. All the built-in types use "native endianness" when multi-byte datatypes are involved.

### types.void

The `void` type.

### types.int8

The `int8` type.

### types.uint8

The `uint8` type.

### types.int16

The `int16` type.

### types.uint16

The `uint16` type.

### types.int32

The `int32` type.

### types.uint32

The `uint32` type.

### types.int64

The `int64` type.

### types.uint64

The `uint64` type.

### types.float

The `float` type.

### types.double

The `double` type.

### types.Object

The `Object` type. This can be used to read/write regular JS Objects into raw memory.

### types.CString

The `CString` type.

CStrings are a kind of weird thing. We say it's `sizeof(char *)`, and `indirection` level of 1, which means that we have to return a Buffer that is pointer sized, and points to a some utf8 string data, so we have to create a 2nd "in-between" buffer.

### types.bool

The `bool` type.

Wrapper type around `types.uint8` that accepts/returns `true` or `false` Boolean JavaScript values.

### types.byte

The `byte` type.

### types.char

The `char` type.

### types.uchar

The `uchar` type.

### types.short

The `short` type.

### types.ushort

The `ushort` type.

### types.int

The `int` type.

### types.uint

The `uint` type.

### types.long

The `long` type.

### types.ulong

The `ulong` type.

### types.longlong

The `longlong` type.

### types.ulonglong

The `ulonglong` type.

### types.size_t

The `size_t` type.

### types.voidPtr

The `void*` type