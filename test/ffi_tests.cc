#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <napi.h>
#include <uv.h>

using namespace Napi;

#undef SYMBOL_EXPORT
#ifdef _WIN32
# define SYMBOL_EXPORT __declspec(dllexport)
#else
# define SYMBOL_EXPORT __attribute__((visibility("default")))
#endif

#ifdef _WIN32
  #define __alignof__ __alignof
#endif

/*
 * Exported function with C naming and calling conventions.
 * Used by dynamic_library.js to test symbol lookup.
 * Never actually called.
 */

extern "C"
int
SYMBOL_EXPORT
ExportedFunction(int value)
{
  return value * 2;
}

namespace {

/*
 * Test struct definition used in the test harness functions below.
 */

typedef struct box {
  int width;
  int height;
} _box;

/*
 * Accepts a struct by value, and returns a struct by value.
 */

box double_box(box input) {
  box rtn;
  // modify the input box, ensure on the JS side that it's not altered
  input.width *= 2;
  input.height *= 2;
  rtn.width = input.width;
  rtn.height = input.height;
  return rtn;
}

/*
 * Accepts a box struct pointer, and returns a struct by value.
 */

box double_box_ptr(box *input) {
  box rtn;
  // modify the input box, ensure on the JS side that IT IS altered
  input->width *= 2;
  input->height *= 2;
  rtn.width = input->width;
  rtn.height = input->height;
  return rtn;
}

/*
 * Accepts a struct by value, and returns an int.
 */

int area_box(box input) {
  return input.width * input.height;
}

/*
 * Accepts a box pointer and returns an int.
 */

int area_box_ptr(box *input) {
  return input->width * input->height;
}

/*
 * Creates a box and returns it by value.
 */

box create_box(int width, int height) {
  box rtn = { width, height };
  return rtn;
}

/*
 * Creates a box that has the sum of the width and height for its own values.
 */

box add_boxes(box boxes[], int num) {
  box rtn = { 0, 0 };
  box cur;
  for (int i = 0; i < num; i++) {
    cur = boxes[i];
    rtn.width += cur.width;
    rtn.height += cur.height;
  }
  return rtn;
}

/*
 * Reads "ints" from the "input" array until -1 is found.
 * Returns the number of elements in the array.
 */

int *int_array(int *input) {
  int *array = input;
  while (*array != -1){
    *array = *array * 2;
    array++;
  }
  return input;
}

/*
 * Tests for passing a Struct that contains Arrays inside of it.
 */

struct arst {
  int num;
  double array[20];
};

struct arst array_in_struct (struct arst input) {
  struct arst rtn;
  rtn.num = input.num * 2;
  for (int i = 0; i < 20; i++) {
    rtn.array[i] = input.array[i] * 3.14;
  }
  return rtn;
}

/*
 * Tests for C function pointers.
 */

typedef int (*my_callback)(int);

my_callback callback_func (my_callback cb) {
  return cb;
}

/*
 * Hard-coded `strtoul` binding, for the benchmarks.
 *
 * args[0] - the string number to convert to a real Number
 * args[1] - a "buffer" instance to write into (the "endptr")
 * args[2] - the base (0 means autodetect)
 */

Value Strtoul(const CallbackInfo& args) {
  Env env = args.Env();

  if (!args[1].IsBuffer() ||
      args[1].As<Buffer<char*>>().Length() < sizeof(char*))
    throw TypeError::New(env, "strtoul(): char* Buffer required as second arg");

  std::string str = args[0].ToString();
  int base = args[2].ToNumber().Int32Value();

  char** endptr = args[1].As<Buffer<char*>>().Data();

  unsigned long val = strtoul(str.c_str(), endptr, base);

  return Number::New(env, val);
}


// experiments for #72
typedef void (*cb)(void);

static cb callback = NULL;

void SetCb(const CallbackInfo& args) {
  callback = reinterpret_cast<cb>(args[0].As<Buffer<char>>().Data());
}

void CallCb(const CallbackInfo& args) {
  if (callback == nullptr)
    throw Error::New(args.Env(), "you must call \"set_cb()\" first");

  callback();
}

void CallCbFromThread(const CallbackInfo& args) {
  if (callback == nullptr)
    throw Error::New(args.Env(), "you must call \"set_cb()\" first");

  uv_thread_t tid;
  uv_thread_create(&tid, [](void*) {
    cb c = callback;
    if (c != nullptr)
      c();
  }, nullptr);
}

void CallCbAsync(const CallbackInfo& args) {
  if (callback == nullptr)
    throw Error::New(args.Env(), "you must call \"set_cb()\" first");

  uv_work_t* req = new uv_work_t;
  req->data = reinterpret_cast<void*>(callback);
  uv_loop_t* loop = nullptr;
  napi_get_uv_event_loop(args.Env(), &loop);
  uv_queue_work(loop,
                req,
                [](uv_work_t* req) {
                  reinterpret_cast<cb>(req->data)();
                },
                [](uv_work_t* req, int status) {
                  delete req;
                });
}


// Race condition in threaded callback invocation testing
// https://github.com/node-ffi/node-ffi/issues/153
void play_ping_pong (const char* (*callback) (const char*)) {
  const char* response;
  do {
    response = callback("ping");
  } while (strcmp(response, "pong") == 0);
}


// https://github.com/node-ffi/node-ffi/issues/169
int test_169(char* dst, int len) {
  const char src[] = "sample str\0";
  strncpy(dst, src, len);
  return fmin(len, strlen(src));
}


// https://github.com/TooTallNate/ref/issues/56
struct Obj56 {
  bool traceMode;
};
int test_ref_56(struct Obj56 *obj) {
  return obj->traceMode ? 1 : 0;
}


/*
 * Converts an arbitrary pointer to a node Buffer (with 0-length)
 */
template<typename T>
inline Value WrapPointer(Env env, T* ptr, size_t length = 0) {
  if (ptr == nullptr)
    length = 0;
  return Buffer<char>::New(env,
                           reinterpret_cast<char*>(ptr),
                           length,
                           [](Env,char*){});
}

Value ArrayAbs(const Napi::CallbackInfo& args) {
  int32_t *arr = reinterpret_cast<int32_t *>(args[0].As<Napi::Uint8Array>().Data());
  int64_t length = args[1].As<Napi::Number>().Int64Value();
  for (int64_t i = 0; i < length; i++) {
    *(arr + i) = abs(arr[i]);
  }
  return Napi::Value();
}

Object InitializeArrayTest(Env env, Object exports) {
  exports["arrayAbs"] = Function::New(env, ArrayAbs);
  return exports;
}

namespace {

typedef struct _test1 {
  int a;
  int b;
  double c;
} test1;

typedef struct _test2 {
  int a;
  double b;
  int c;
} test2;

typedef struct _test3 {
  double a;
  int b;
  int c;
} test3;

typedef struct _test4 {
  double a;
  double b;
  int c;
} test4;

typedef struct _test5 {
  int a;
  double b;
  double c;
} test5;

typedef struct _test6 {
  char a;
  short b;
  int c;
} test6;

typedef struct _test7 {
  int a;
  short b;
  char c;
} test7;

typedef struct _test8 {
  int a;
  short b;
  char c;
  char d;
} test8;

typedef struct _test9 {
  int a;
  short b;
  char c;
  char d;
  char e;
} test9;

typedef struct _test10 {
  test1 a;
  char b;
} test10;

// this one simulates the `ffi_type` struct
typedef struct _test11 {
  size_t a;
  unsigned short b;
  unsigned short c;
  struct _test11 **d;
} test11;

typedef struct _test12 {
  char *a;
  int b;
} test12;

typedef struct _test13 {
  char a;
  char b[2];
} test13;

typedef struct _test14 {
  char a;
  char b[2];
  short c;
  char d;
} test14;

typedef struct _test15 {
  test1 a;
  test1 b;
} test15;

typedef struct _test16 {
  double a[10];
  char b[3];
  int c[6];
} test16;

typedef struct _test17 {
  char a[3];
} test17;

typedef struct _test18 {
  test17 a[100];
} test18;

/* test19 example is from libdespotify
 * See: https://github.com/TooTallNate/ref-struct/issues/1
 */

#define STRING_LENGTH 256
typedef struct _test19 {
  bool has_meta_data;
  bool playable;
  bool geo_restricted;
  unsigned char track_id[33];
  unsigned char file_id[41];
  unsigned int file_bitrate;
  unsigned char album_id[33];
  unsigned char cover_id[41];
  unsigned char *key;

  char *allowed;
  char *forbidden;

  char title[STRING_LENGTH];
  struct artist* artist;
  char album[STRING_LENGTH];
  int length;
  int tracknumber;
  int year;
  float popularity;
  struct _test19 *next; /* in case of multiple tracks
                          in an album or playlist struct */
} test19;

#pragma pack(1)
typedef struct _test20 {
  char a;
  void *p;
} test20;

#pragma pack()
typedef struct _test21 {
  char a;
  void *p;
} test21;

Object InitializeStructTest(Env env, Object exports) {
  exports["test1 sizeof"] = (sizeof(test1));
  exports["test1 alignof"] = (__alignof__(test1));
  exports["test1 offsetof a"] = (offsetof(test1, a));
  exports["test1 offsetof b"] = (offsetof(test1, b));
  exports["test1 offsetof c"] = (offsetof(test1, c));

  exports["test2 sizeof"] = (sizeof(test2));
  exports["test2 alignof"] = (__alignof__(test2));
  exports["test2 offsetof a"] = (offsetof(test2, a));
  exports["test2 offsetof b"] = (offsetof(test2, b));
  exports["test2 offsetof c"] = (offsetof(test2, c));

  exports["test3 sizeof"] = (sizeof(test3));
  exports["test3 alignof"] = (__alignof__(test3));
  exports["test3 offsetof a"] = (offsetof(test3, a));
  exports["test3 offsetof b"] = (offsetof(test3, b));
  exports["test3 offsetof c"] = (offsetof(test3, c));

  exports["test4 sizeof"] = (sizeof(test4));
  exports["test4 alignof"] = (__alignof__(test4));
  exports["test4 offsetof a"] = (offsetof(test4, a));
  exports["test4 offsetof b"] = (offsetof(test4, b));
  exports["test4 offsetof c"] = (offsetof(test4, c));

  exports["test5 sizeof"] = (sizeof(test5));
  exports["test5 alignof"] = (__alignof__(test5));
  exports["test5 offsetof a"] = (offsetof(test5, a));
  exports["test5 offsetof b"] = (offsetof(test5, b));
  exports["test5 offsetof c"] = (offsetof(test5, c));

  exports["test6 sizeof"] = (sizeof(test6));
  exports["test6 alignof"] = (__alignof__(test6));
  exports["test6 offsetof a"] = (offsetof(test6, a));
  exports["test6 offsetof b"] = (offsetof(test6, b));
  exports["test6 offsetof c"] = (offsetof(test6, c));

  exports["test7 sizeof"] = (sizeof(test7));
  exports["test7 alignof"] = (__alignof__(test7));
  exports["test7 offsetof a"] = (offsetof(test7, a));
  exports["test7 offsetof b"] = (offsetof(test7, b));
  exports["test7 offsetof c"] = (offsetof(test7, c));

  exports["test8 sizeof"] = (sizeof(test8));
  exports["test8 alignof"] = (__alignof__(test8));
  exports["test8 offsetof a"] = (offsetof(test8, a));
  exports["test8 offsetof b"] = (offsetof(test8, b));
  exports["test8 offsetof c"] = (offsetof(test8, c));
  exports["test8 offsetof d"] = (offsetof(test8, d));

  exports["test9 sizeof"] = (sizeof(test9));
  exports["test9 alignof"] = (__alignof__(test9));
  exports["test9 offsetof a"] = (offsetof(test9, a));
  exports["test9 offsetof b"] = (offsetof(test9, b));
  exports["test9 offsetof c"] = (offsetof(test9, c));
  exports["test9 offsetof d"] = (offsetof(test9, d));
  exports["test9 offsetof e"] = (offsetof(test9, e));

  exports["test10 sizeof"] = (sizeof(test10));
  exports["test10 alignof"] = (__alignof__(test10));
  exports["test10 offsetof a"] = (offsetof(test10, a));
  exports["test10 offsetof b"] = (offsetof(test10, b));

  exports["test11 sizeof"] = (sizeof(test11));
  exports["test11 alignof"] = (__alignof__(test11));
  exports["test11 offsetof a"] = (offsetof(test11, a));
  exports["test11 offsetof b"] = (offsetof(test11, b));
  exports["test11 offsetof c"] = (offsetof(test11, c));
  exports["test11 offsetof d"] = (offsetof(test11, d));

  exports["test12 sizeof"] = (sizeof(test12));
  exports["test12 alignof"] = (__alignof__(test12));
  exports["test12 offsetof a"] = (offsetof(test12, a));
  exports["test12 offsetof b"] = (offsetof(test12, b));

  exports["test13 sizeof"] = (sizeof(test13));
  exports["test13 alignof"] = (__alignof__(test13));
  exports["test13 offsetof a"] = (offsetof(test13, a));
  exports["test13 offsetof b"] = (offsetof(test13, b));

  exports["test14 sizeof"] = (sizeof(test14));
  exports["test14 alignof"] = (__alignof__(test14));
  exports["test14 offsetof a"] = (offsetof(test14, a));
  exports["test14 offsetof b"] = (offsetof(test14, b));
  exports["test14 offsetof c"] = (offsetof(test14, c));
  exports["test14 offsetof d"] = (offsetof(test14, d));

  exports["test15 sizeof"] = (sizeof(test15));
  exports["test15 alignof"] = (__alignof__(test15));
  exports["test15 offsetof a"] = (offsetof(test15, a));
  exports["test15 offsetof b"] = (offsetof(test15, b));

  exports["test16 sizeof"] = (sizeof(test16));
  exports["test16 alignof"] = (__alignof__(test16));
  exports["test16 offsetof a"] = (offsetof(test16, a));
  exports["test16 offsetof b"] = (offsetof(test16, b));
  exports["test16 offsetof c"] = (offsetof(test16, c));

  exports["test17 sizeof"] = (sizeof(test17));
  exports["test17 alignof"] = (__alignof__(test17));
  exports["test17 offsetof a"] = (offsetof(test17, a));

  exports["test18 sizeof"] = (sizeof(test18));
  exports["test18 alignof"] = (__alignof__(test18));
  exports["test18 offsetof a"] = (offsetof(test18, a));

  exports["test19 sizeof"] = (sizeof(test19));
  exports["test19 alignof"] = (__alignof__(test19));
  exports["test19 offsetof has_meta_data"] = (offsetof(test19, has_meta_data));
  exports["test19 offsetof playable"] = (offsetof(test19, playable));
  exports["test19 offsetof geo_restricted"] = (offsetof(test19, geo_restricted));
  exports["test19 offsetof track_id"] = (offsetof(test19, track_id));
  exports["test19 offsetof file_id"] = (offsetof(test19, file_id));
  exports["test19 offsetof file_bitrate"] = (offsetof(test19, file_bitrate));
  exports["test19 offsetof album_id"] = (offsetof(test19, album_id));
  exports["test19 offsetof cover_id"] = (offsetof(test19, cover_id));
  exports["test19 offsetof key"] = (offsetof(test19, key));
  exports["test19 offsetof allowed"] = (offsetof(test19, allowed));
  exports["test19 offsetof forbidden"] = (offsetof(test19, forbidden));
  exports["test19 offsetof title"] = (offsetof(test19, title));
  exports["test19 offsetof artist"] = (offsetof(test19, artist));
  exports["test19 offsetof album"] = (offsetof(test19, album));
  exports["test19 offsetof length"] = (offsetof(test19, length));
  exports["test19 offsetof tracknumber"] = (offsetof(test19, tracknumber));
  exports["test19 offsetof year"] = (offsetof(test19, year));
  exports["test19 offsetof popularity"] = (offsetof(test19, popularity));
  exports["test19 offsetof next"] = (offsetof(test19, next));

  exports["test20 sizeof"] = (sizeof(test20));
  exports["test20 alignof"] = (__alignof__(test20));

  exports["test21 sizeof"] = (sizeof(test21));
  exports["test21 alignof"] = (__alignof__(test21));
  return exports;
}

} // anonymous namespace


namespace UnionTest {

typedef union _test1 {
  char a;
  short b;
} test1;

typedef union _test2 {
  char a;
  int b;
} test2;

typedef union _test3 {
  char a;
  short b;
  int c;
} test3;

typedef union _test4 {
  struct {
    char a;
    short b;
    int c;
  } a;
  int b;
} test4;

typedef union _test5 {
  double a;
  char b;
} test5;

typedef union _test6 {
  test1 a;
  char b;
} test6;

typedef union _test7 {
  char a;
  char b[2];
  short c;
  char d;
} test7;

typedef union _test8 {
  int a;
  double b;
  int c;
} test8;

Object InitializeUnionTest(Env env, Object exports) {
  exports["test1 sizeof"] = (sizeof(test1));
  exports["test1 alignof"] = (__alignof__(test1));
  exports["test1 offsetof a"] = (offsetof(test1, a));
  exports["test1 offsetof b"] = (offsetof(test1, b));

  exports["test2 sizeof"] = (sizeof(test2));
  exports["test2 alignof"] = (__alignof__(test2));
  exports["test2 offsetof a"] = (offsetof(test2, a));
  exports["test2 offsetof b"] = (offsetof(test2, b));

  exports["test3 sizeof"] = (sizeof(test3));
  exports["test3 alignof"] = (__alignof__(test3));
  exports["test3 offsetof a"] = (offsetof(test3, a));
  exports["test3 offsetof b"] = (offsetof(test3, b));
  exports["test3 offsetof c"] = (offsetof(test3, c));

  exports["test4 sizeof"] = (sizeof(test4));
  exports["test4 alignof"] = (__alignof__(test4));
  exports["test4 offsetof a"] = (offsetof(test4, a));
  exports["test4 offsetof b"] = (offsetof(test4, b));

  exports["test5 sizeof"] = (sizeof(test5));
  exports["test5 alignof"] = (__alignof__(test5));
  exports["test5 offsetof a"] = (offsetof(test5, a));
  exports["test5 offsetof b"] = (offsetof(test5, b));

  exports["test6 sizeof"] = (sizeof(test6));
  exports["test6 alignof"] = (__alignof__(test6));
  exports["test6 offsetof a"] = (offsetof(test6, a));
  exports["test6 offsetof b"] = (offsetof(test6, b));

  exports["test7 sizeof"] = (sizeof(test7));
  exports["test7 alignof"] = (__alignof__(test7));
  exports["test7 offsetof a"] = (offsetof(test7, a));
  exports["test7 offsetof b"] = (offsetof(test7, b));
  exports["test7 offsetof c"] = (offsetof(test7, c));
  exports["test7 offsetof d"] = (offsetof(test7, d));

  exports["test8 sizeof"] = (sizeof(test8));
  exports["test8 alignof"] = (__alignof__(test8));
  exports["test8 offsetof a"] = (offsetof(test8, a));
  exports["test8 offsetof b"] = (offsetof(test8, b));
  exports["test8 offsetof c"] = (offsetof(test8, c));
  return exports;
}

}

Object Initialize(Env env, Object exports) {
#if WIN32
  // initialize "floating point support" on Windows?!?!
  // (this is some serious magic...)
  // http://support.microsoft.com/kb/37507
  float x = 2.3f;
#endif

  exports["atoi"] = WrapPointer(env, atoi);
  int (*absPtr)(int)(abs);
  exports["abs"] = WrapPointer(env, absPtr);
  exports["sprintf"] = WrapPointer(env, sprintf);

  // hard-coded `strtoul` binding, for the benchmarks
  exports["strtoul"] = Function::New(env, Strtoul);
  exports["set_cb"] = Function::New(env, SetCb);
  exports["call_cb"] = Function::New(env, CallCb);
  exports["call_cb_from_thread"] = Function::New(env, CallCbFromThread);
  exports["call_cb_async"] = Function::New(env, CallCbAsync);

  // also need to test these custom functions
  exports["double_box"] = WrapPointer(env, double_box);
  exports["double_box_ptr"] = WrapPointer(env, double_box_ptr);
  exports["area_box"] = WrapPointer(env, area_box);
  exports["area_box_ptr"] = WrapPointer(env, area_box_ptr);
  exports["create_box"] = WrapPointer(env, create_box);
  exports["add_boxes"] = WrapPointer(env, add_boxes);
  exports["int_array"] = WrapPointer(env, int_array);
  exports["array_in_struct"] = WrapPointer(env, array_in_struct);
  exports["callback_func"] = WrapPointer(env, callback_func);
  exports["play_ping_pong"] = WrapPointer(env, play_ping_pong);
  exports["test_169"] = WrapPointer(env, test_169);
  exports["test_ref_56"] = WrapPointer(env, test_ref_56);

  Napi::Object arrayTest = Napi::Object::New(env);
  exports["arrayTest"] = InitializeArrayTest(env, arrayTest);

  Napi::Object structTest = Napi::Object::New(env);
  exports["structTest"] = InitializeStructTest(env, structTest);

  Napi::Object unionTest = Napi::Object::New(env);
  exports["unionTest"] = UnionTest::InitializeUnionTest(env, unionTest);

  return exports;
}

} // anonymous namespace

NODE_API_MODULE(ffi_tests, Initialize)
