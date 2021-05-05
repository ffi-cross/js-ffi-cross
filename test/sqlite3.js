const path = require("path");
const ffi = require("../");
const { ref, types } = ffi;

describe("sqlite3", function () {
  let libsqlite3
  const sqlite3 = types.void;
  const sqlite3Ptr = ref.refType(sqlite3);
  const sqlite3PtrPtr = ref.refType(sqlite3Ptr);
  const stringPtr = ref.refType(types.CString);
  before(function() {
    const lib =
      process.platform == "win32"
        ? path.join(
            process.env.ProgramData || "",
            "chocolatey/lib/SQLite/tools/sqlite3.dll"
          )
        : "libsqlite3";
  
    libsqlite3 = ffi.Library(lib, {
      sqlite3_open: ["int", ["string", sqlite3PtrPtr]],
      sqlite3_close: ["int", [sqlite3PtrPtr]],
      sqlite3_exec: [
        "int",
        [sqlite3PtrPtr, "string", "pointer", "pointer", stringPtr],
      ],
      sqlite3_changes: ["int", [sqlite3PtrPtr]],
    });
  })
  it("open close", function () {
    const dbPtrPtr = ref.alloc(sqlite3PtrPtr);
    libsqlite3.sqlite3_open("test.sqlite3", dbPtrPtr);
    libsqlite3.sqlite3_close(ref.deref(dbPtrPtr));
  });
});
