import * as path from "path";
import * as assert from "assert";
import * as ffi from "../../";

const { ref, StructType, types, UnionType, ArrayType, buffer } = ffi;
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
  const CharArray = ArrayType("char");
  const b = Buffer.from("hello ascii");
  const a = new CharArray(b);
}
{
  const Int32Array = ArrayType(types.int32);
  const input = [1, 4, 91, 123123, 5123512, 0, -1];
  const a = new Int32Array(input);
}
{
  const int = types.int;
  const IntArray = ArrayType(int);

  const buf = Buffer.alloc(int.size * 3);
  int.set(buf, int.size * 0, 5);
  int.set(buf, int.size * 1, 8);
  int.set(buf, int.size * 2, 0);

  const array = IntArray.untilZeros(buf);
}
{
  const refCharArr = ref.ref(ArrayType("char")([1, 3, 5], 2));
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
  const sqlite3 = types.void;
  const sqlite3Ptr = ref.refType(sqlite3);
  const sqlite3PtrPtr = ref.refType(sqlite3Ptr);
  const stringPtr = ref.refType(types.CString);
  const lib =
    process.platform == "win32"
      ? path.join(
          process.env.ProgramData || "",
          "chocolatey/lib/SQLite/tools/sqlite3.dll"
        )
      : "libsqlite3";

  const libsqlite3 = ffi.Library(lib, {
    sqlite3_open: ["int", ["string", sqlite3PtrPtr]],
    sqlite3_close: ["int", [sqlite3PtrPtr]],
    sqlite3_exec: [
      "int",
      [sqlite3PtrPtr, "string", "pointer", "pointer", stringPtr],
    ],
    sqlite3_changes: ["int", [sqlite3PtrPtr]],
  });

  const dbPtrPtr = ref.alloc(sqlite3PtrPtr);
  libsqlite3.sqlite3_open("test.sqlite3", dbPtrPtr);
  libsqlite3.sqlite3_close(ref.deref(dbPtrPtr));
  console.log("sqlite3 test finished");
}
