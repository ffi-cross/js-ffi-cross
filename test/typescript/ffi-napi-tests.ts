import * as path from "path";
import * as assert from "assert";
import * as ffi from "../../";

import  { ref, StructType, types, UnionType, ArrayType, buffer } from "../../";

{
  var U = UnionType({ a: types.int })
  console.log(U)
}

{
  const normalStruct = StructType({
    t: types.uint8,
    v: types.long,
  });
  assert(typeof normalStruct === "function");

  const packedStruct = StructType(
    {
      t: types.uint8,
      v: types.long,
    },
    { packed: true }
  );
  assert(typeof packedStruct === "function");
}

{
  const funcPtr = Buffer.alloc(10);
  const func = ffi.ForeignFunction(funcPtr, types.int, [types.int]);
  assert(typeof func === "function");
  console.log(`funcPtr invalid: ${funcPtr.toString("hex")}`);
  // Calling to this function will result crash.
  // As it's not the real code, it's just 0 filled byte array
  try {
    func(-5);
  } catch (err) {
    console.log(err);
  }
  func.async(-5, (err: any, res: any) => {
    console.log(`async err: ${err}`);
  });
}
{
  const funcPtr = ffi.Callback(types.int, [types.int], Math.abs);
  console.log(`funcPtr: ${funcPtr.toString("hex")}`);
  const func = ffi.ForeignFunction(funcPtr, types.int, [types.int]);
  func(-5);
  func.async(-5, (err: any, res: any) => {});
}
{
  const lib = process.platform == "win32" ? "msvcrt" : "libc";
  const printfPointer = ffi.DynamicLibrary(lib + ffi.LIB_EXT).get("printf");
  const printfGen = ffi.VariadicForeignFunction(printfPointer, types.void, [
    types.CString,
  ]);
  printfGen()("Hello World!\n");
  printfGen("int")("This is an int: %d\n", 10);
  printfGen("string")("This is a string: %s\n", "hello");
}
{
  ref.address(Buffer.alloc(1));
  const intBuf = ref.alloc(types.int);
  const intWith4 = ref.alloc(types.int, 4);
  const buf0 = ref.allocCString("hello world");
  const val = ref.deref(intBuf);
}
{
  ref.isNull(Buffer.alloc(1));
}
{
  const str = ref.readCString(Buffer.from("hello\0world\0"), 0);
  const buf = ref.alloc(types.int64);
  buffer.writeBigInt64BE(buf, 9223372036854775807n, 0);
  const val = buffer.readBigInt64BE(buf, 0);
}
{
  const voidPtrType = ref.refType(types.void);
  const buf = ref.alloc(types.int64);
  buffer.writeBigInt64LE(buf, 9223372036854775807n, 0);
}
{
  const S1 = StructType({ a: types.int });
  const S2 = new StructType({ a: "int" });
}
{
  const P = new StructType();
  P.defineProperty("a", types.int);
  P.defineProperty("d", "long");
}
{
  const SimpleStruct = StructType({
    first: types.byte,
    last: types.byte,
  });

  const ss = new SimpleStruct({ first: 50, last: 100 });
  ss.first += 200;
}
{
  const ST = StructType();
  ST.defineProperty("t", types.int);

  const test: ffi.Type<number> = ST.fields["t"].type;
}
{
  const CharArray = ArrayType(types.char);
  const b = "hello ascii";
  const a = new CharArray(b.split(''));
  const c = new CharArray(Buffer.from(b));
  assert(''.concat(...a.toArray()) === "hello ascii")
  assert(''.concat(...c.toArray()) === "hello ascii")
}
{
  const Int32Array = ArrayType(types.int32);
  const input = [1, 4, 91, 123123, 5123512, 0, -1];
  const a = new Int32Array(input);
  type a_element_type = typeof a.element
  type a_type = typeof a.value
  const b = ref.ref(a)
  type b_type = typeof b
}
{
  const int = types.int;
  const IntArray = ArrayType(int);

  const buf = Buffer.alloc(int.size * 3);
  int.set(buf, 5, int.size * 0);
  int.set(buf, 8, int.size * 1);
  int.set(buf, 0, int.size * 2);

  const array = IntArray.untilZeros(buf);
}
{
  const refCharArr = ref.ref(ArrayType(types.char)(["a", "b"], 2));
}
{
  // You can also access just functions in the current process by passing a null
  const uv_func = ffi.Library(null, {
    uv_version_string: [types.CString, []],
  });
  const uv_version = uv_func.uv_version_string();
  console.log(`uv_version: ${uv_version}`);
}

{
  const pal_fd = types.int
  const pal_fd_ptr = ref.refType(pal_fd)
  const pal_fd_ptr_ptr = ref.refType(pal_fd_ptr)
  typeof pal_fd.value
  typeof pal_fd.self
  typeof pal_fd.pointer
  typeof pal_fd.NULL
  typeof pal_fd.refer
  typeof pal_fd.type

  typeof pal_fd_ptr.value
  typeof pal_fd_ptr.self
  typeof pal_fd_ptr.pointer
  typeof pal_fd_ptr.NULL
  typeof pal_fd_ptr.refer
  typeof pal_fd_ptr.type

  typeof pal_fd_ptr_ptr.value
  typeof pal_fd_ptr_ptr.self
  typeof pal_fd_ptr_ptr.pointer
  typeof pal_fd_ptr_ptr.NULL
  typeof pal_fd_ptr_ptr.refer
  typeof pal_fd_ptr_ptr.type

  /* Allocate a buffer to storage integer */
  const int_val_allocated = ref.alloc(types.int)
  type  int_val_allocated_ffitype = typeof int_val_allocated.type
  ref.set(int_val_allocated, 10, 0)
  const get_val = ref.get(int_val_allocated, 0)
  assert(get_val === 10)
  const int_val_allocated_ref = ref.ref(int_val_allocated)

  const pal_fd_ptr_allocated = ref.alloc(pal_fd_ptr)  /* int** */
  ref.set(pal_fd_ptr_allocated, pal_fd_ptr.NULL , 0)
  ref.set(pal_fd_ptr_allocated, int_val_allocated, 0)
  const int_ref_ref_dref = ref.deref(pal_fd_ptr_allocated)
  assert.equal(ref.address(int_ref_ref_dref), ref.address(int_val_allocated))

  const sqlite3 = types.void;
  const sqlite3Ptr = ref.refType(sqlite3);
  const sqlite3PtrPtr = ref.refType(sqlite3Ptr);

  typeof sqlite3.value
  typeof sqlite3.self
  typeof sqlite3.pointer
  typeof sqlite3.refer
  typeof sqlite3.type

  typeof sqlite3Ptr.value
  typeof sqlite3Ptr.self
  typeof sqlite3Ptr.pointer
  typeof sqlite3Ptr.refer
  typeof sqlite3Ptr.type

  typeof sqlite3PtrPtr.value
  typeof sqlite3PtrPtr.self
  typeof sqlite3PtrPtr.pointer
  typeof sqlite3PtrPtr.refer
  typeof sqlite3PtrPtr.type

  types.intptr_t.NULL
  const intptr_val_allocated = ref.alloc(types.intptr_t)
  intptr_val_allocated.refer
  ref.set(intptr_val_allocated, 10n, 0)
  assert(ref.get(intptr_val_allocated, 0) === 10n)


  /* allocated a buffer can storage a pointer void* sqlite3 */
  const sqlite3Allocated = ref.alloc(sqlite3)
  const sqlite3PtrAllocated = ref.alloc(sqlite3Ptr)
  type sqlite3PtrPtrValType = typeof sqlite3PtrPtr.value
  type zeroValueType = typeof sqlite3PtrPtr.zero
  type nullValueType = typeof sqlite3PtrPtr.NULL
  type sqlite3PtrPtrRefType = typeof sqlite3PtrPtr.refer
  type sqlite3PtrPtrRefFfiType = sqlite3PtrPtrRefType['type']


  /* set the value of the buffer to zero sqlite3 = NULL */
  console.log(`sqlite3Ptr:` + sqlite3Ptr.NULL)
  ref.set(sqlite3PtrAllocated, sqlite3Ptr.NULL, 0)
  const sqlite3PtrPtrAllocated = ref.alloc(sqlite3PtrPtr);
  ref.set(sqlite3PtrPtrAllocated, sqlite3PtrAllocated, 0)
  const result = ref.get(sqlite3PtrPtrAllocated, 0)
  assert.equal(ref.address(result), ref.address(sqlite3PtrAllocated))
  assert.equal(typeof ref.address(result), 'bigint')

  const sqlite3PtrArray = ArrayType(sqlite3Ptr);
  const b = new sqlite3PtrArray([sqlite3Allocated, sqlite3Ptr.NULL, intptr_val_allocated as unknown as typeof ref.NULL])
  b[0] = sqlite3Allocated
  assert.equal(ref.address(b[0]), ref.address(sqlite3Allocated))
  assert.equal(ref.address(b[0]), ref.address(sqlite3Allocated))
  console.log('show array b')
  for (let i = 0; i < b.length; ++i) {
    console.log(ref.address(b[i]))
  }
  console.log('end show array b')
  assert.equal(ref.address(b[2]), ref.address(intptr_val_allocated))

  const stringPtr = ref.refType(types.CString);
  const sqlite3CallbackContext = ref.refType(types.void)
  const sqlite3Callback = ffi.Function(types.int, [sqlite3CallbackContext, types.int, stringPtr, stringPtr])
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
    sqlite3_exec: [types.int, [sqlite3Ptr, types.CString, sqlite3Callback, sqlite3CallbackContext, stringPtr]],
    sqlite3_changes: [types.int, [sqlite3PtrPtr]],
  });

  const dbPtrPtr = ref.alloc(sqlite3Ptr);
  libsqlite3.sqlite3_open("test.sqlite3", dbPtrPtr);
  let dbPtr: typeof sqlite3Ptr.self = ref.deref(dbPtrPtr)
  console.log(dbPtr)
  console.log(dbPtrPtr)
  assert.equal(sqlite3Ptr.NULL, sqlite3PtrPtr.NULL)
  assert.equal(sqlite3Ptr.NULL, ref.NULL)

  libsqlite3.sqlite3_close(dbPtr);
  console.log("sqlite3 test finished");
}
