#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <unordered_map>

#include "ffi.h"
#include "ref-napi.h"

#ifdef _WIN32
  #define __alignof__ __alignof
  #define snprintf(buf, bufSize, format, arg) _snprintf_s(buf, bufSize, _TRUNCATE, format, arg)
  #define strtoll _strtoi64
  #define strtoull _strtoui64
  #define PRId64 "lld"
  #define PRIu64 "llu"
#else
  #ifndef __STDC_FORMAT_MACROS
    #define __STDC_FORMAT_MACROS
  #endif
  #include <inttypes.h>
#endif


using namespace Napi;

// used by the Int64 functions to determine whether to return a Number
// or String based on whether or not a Number will lose precision.
// http://stackoverflow.com/q/307179/376773
#define JS_MAX_INT +9007199254740992LL
#define JS_MIN_INT -9007199254740992LL

// mirrors deps/v8/src/objects.h.
// we could use `node::Buffer::kMaxLength`, but it's not defined on node v0.6.x
static const size_t kMaxLength = 0x3fffffff;

enum ArrayBufferMode {
  AB_CREATED_BY_REF,
  AB_PASSED_TO_REF
};

// Since Node.js v14.0.0, we have to keep a global list of all ArrayBuffer
// instances that we work with, in order not to create any duplicates.
// Luckily, N-API instance data is available on v12.x and above.
namespace FFI {

  inline void UnregisterArrayBuffer(InstanceData *data, char* ptr) {
    auto it = data->pointer_to_orig_buffer.find(ptr);
    if (--it->second.finalizer_count == 0)
      data->pointer_to_orig_buffer.erase(it);
  }

  inline void RegisterArrayBufferImpl(InstanceData *data, ArrayBuffer buf, ArrayBufferMode mode) {
    char* ptr = static_cast<char*>(buf.Data());
    if (ptr == nullptr) return;

    auto it = data->pointer_to_orig_buffer.find(ptr);
    if (it != data->pointer_to_orig_buffer.end()) {
      if (!it->second.ab.Value().IsEmpty()) {
        // Already have a valid entry, nothing to do.
        return;
      }
      it->second.ab.Reset(buf, 0);
      it->second.finalizer_count++;
    } else {
      data->pointer_to_orig_buffer.emplace(ptr, ArrayBufferEntry {
        Reference<ArrayBuffer>::New(buf, 0),
        1
      });
    }

    // If AB_CREATED_BY_REF, then another finalizer has been added before this
    // as a "real" backing store finalizer.
    if (mode != AB_CREATED_BY_REF) {
      buf.AddFinalizer([=](Env env, char* ptr) {
        UnregisterArrayBuffer(data, ptr);
      }, ptr);
    }
  }


  inline ArrayBuffer LookupOrCreateArrayBuffer(InstanceData *data, char* ptr, size_t length) {
    assert(ptr != nullptr);
    ArrayBuffer ab;
    auto it = data->pointer_to_orig_buffer.find(ptr);
    if (it != data->pointer_to_orig_buffer.end())
      ab = it->second.ab.Value();

    if (ab.IsEmpty()) {
      length = std::max<size_t>(length, kMaxLength);
      ab = Buffer<char>::New(data->env, ptr, length, [=](Env env, char* ptr) {
        UnregisterArrayBuffer(data, ptr);
      }).ArrayBuffer();
      RegisterArrayBufferImpl(data, ab, AB_CREATED_BY_REF);
    }
    return ab;
  }
}

void FFI::InstanceData::RegisterArrayBuffer(napi_value val) {
    ArrayBuffer buf(env, val);
    RegisterArrayBufferImpl(this, buf, AB_PASSED_TO_REF);
}
/**
 * Converts an arbitrary pointer to a node Buffer with specified length
 */

napi_value FFI::InstanceData::WrapPointer(char* ptr, size_t length) {
  if (ptr == nullptr)
    length = 0;

  if (ptr != nullptr) {
    ArrayBuffer ab = LookupOrCreateArrayBuffer(this, ptr, length);
    assert(!ab.IsEmpty());
    return this->buffer_from.Call({
      ab, Number::New(env, 0), Number::New(env, length)
    });
  }

  return Buffer<char>::New(env, ptr, length, [](Env,char*){});
}

char* FFI::InstanceData::GetBufferData(napi_value val) {
  Value v(env, val);
  Buffer<char> buf = v.As<Buffer<char>>();
  this->RegisterArrayBuffer(buf.ArrayBuffer());
  return buf.Data();
}

namespace {

Value WrapPointer(Env env, char* ptr, size_t length) {
  napi_value buf = FFI::InstanceData::Get(env)->WrapPointer(ptr, length);
  return Value(env, buf);
}

char* GetBufferData(Value val) {
  FFI::InstanceData* data = FFI::InstanceData::Get(val.Env());
  return data->GetBufferData(val);
}

char* AddressForArgs(const CallbackInfo& args, size_t offset_index = 1) {
  Value buf = args[0];
  if (!buf.IsBuffer()) {
    throw TypeError::New(args.Env(), "Buffer instance expected");
  }

  int64_t offset = args[offset_index].ToNumber();
  return GetBufferData(buf) + offset;
}

/**
 * Returns the pointer address as a BigInt of the given Buffer instance.
 *
 *
 * args[0] - Buffer - the Buffer instance get the memory address of
 * args[1] - Number - optional (0) - the offset of the Buffer start at
 */

Value Address (const CallbackInfo& args) {
  char* ptr = AddressForArgs(args);
  intptr_t intptr = reinterpret_cast<intptr_t>(ptr);

  return BigInt::New(args.Env(), (int64_t)intptr);
}

/**
 * Retreives a JS Object instance that was previously stored in
 * the given Buffer instance at the given offset.
 *
 * args[0] - Buffer - the "buf" Buffer instance to read from
 * args[1] - Number - the offset from the "buf" buffer's address to read from
 */

Value ReadObject(const CallbackInfo& args) {
  char* ptr = AddressForArgs(args);

  if (ptr == nullptr) {
    throw Error::New(args.Env(), "readObject: Cannot read from nullptr pointer");
  }

  Reference<Object>* rptr = reinterpret_cast<Reference<Object>*>(ptr);
  return rptr->Value();
}

/**
 * Writes a weak reference to given Object to the given Buffer
 * instance and offset.
 *
 * args[0] - Buffer - the "buf" Buffer instance to write to
 * args[1] - Object - the "obj" Object which will have a new Persistent reference
 *                    created for the obj, whose memory address will be written.
 * args[2] - Number - the offset from the "buf" buffer's address to write to
 */

void WriteObject(const CallbackInfo& args) {
  Env env = args.Env();
  char* ptr = AddressForArgs(args, 2);

  if (ptr == nullptr) {
    throw Error::New(env, "readObject: Cannot write to nullptr pointer");
  }

  Reference<Object>* rptr = reinterpret_cast<Reference<Object>*>(ptr);
  Value obj = args[1];
  if (obj.IsObject()) {
    Object val = obj.As<Object>();
    *rptr = std::move(Reference<Object>::New(val));
  } else if (obj.IsNull()) {
    rptr->Reset();
  } else {
    throw TypeError::New(env, "WriteObject's 3rd argument needs to be an object");
  }
}

/**
 * Reads the memory address of the given "buf" pointer Buffer at the specified
 * offset, and returns a new SlowBuffer instance from the memory address stored.
 *
 * args[0] - Buffer - the "buf" Buffer instance to read from
 * args[1] - Number - the offset from the "buf" buffer's address to read from
 * args[2] - Number - the length in bytes of the returned SlowBuffer instance
 */

Value ReadPointer(const CallbackInfo& args) {
  Env env = args.Env();
  char* ptr = AddressForArgs(args);

  if (ptr == nullptr) {
    throw Error::New(env, "readPointer: Cannot read from nullptr pointer");
  }

  int64_t size = args[2].ToNumber();

  char* val = *reinterpret_cast<char**>(ptr);
  return WrapPointer(env, val, size);
}

/**
 * Writes the memory address of the "input" buffer (and optional offset) to the
 * specified "buf" buffer and offset. Essentially making "buf" hold a reference
 * to the "input" Buffer.
 *
 * args[0] - Buffer - the "buf" Buffer instance to write to
 * args[1] - Buffer - the "input" Buffer whose memory address will be written
 * args[2] - Number - the offset from the "buf" buffer's address to write to
 */

void WritePointer(const CallbackInfo& args) {
  Env env = args.Env();
  char* ptr = AddressForArgs(args, 2);
  Value input = args[1];

  if (!input.IsNull() && !input.IsBuffer()) {
    throw TypeError::New(env, "writePointer: Buffer instance expected as third argument");
  }

  if (input.IsNull()) {
    *reinterpret_cast<char**>(ptr) = nullptr;
  } else {
    if ((args.Length() == 4) && (args[3].As<Boolean>() == true)) {
      // create a node-api reference and finalizer to ensure that
      // the buffer whoes pointer is written can only be
      // collected after the finalizers for the buffer
      // to which the pointer was written have already run
      Reference<Value>* ref = new Reference<Value>;
      *ref = Persistent(input);
      args[0].As<Object>().AddFinalizer([](Env env, Reference<Value>* ref) {
        delete ref;
      }, ref);
    }

    char* input_ptr = GetBufferData(input);
    *reinterpret_cast<char**>(ptr) = input_ptr;
  }
}

/**
 * Returns a new Buffer instance that has the same memory address
 * as the given buffer, but with the specified size.
 *
 * args[0] - Buffer - the "buf" Buffer instance to read the address from
 * args[1] - Number - the size in bytes that the returned Buffer should be
 * args[2] - Number - the offset from the "buf" buffer's address to read from
 */

Value ReinterpretBuffer(const CallbackInfo& args) {
  Env env = args.Env();
  char* ptr = AddressForArgs(args, 2);

  if (ptr == nullptr) {
    throw Error::New(env, "reinterpret: Cannot reinterpret from nullptr pointer");
  }

  int64_t size = args[1].ToNumber();

  return WrapPointer(env, ptr, size);
}

/**
 * Same as `ref.reinterpretUntilZeros()`, except that this version does not attach _buffer_ to the
 * returned Buffer, which is potentially unsafe if the garbage collector runs.
 *
 * args[0] - Buffer - the "buf" Buffer instance to read the address from
 * args[1] - Number - the offset from the "buf" buffer's address to read from
 * return A new Buffer instance with the same memory address as _buffer_, and a variable `length` that
 *  is terminated by sizeof(T) NUL bytes.
 */

template<typename T>
Value ReinterpretBufferUntilZeros(const CallbackInfo& args) {
  Env env = args.Env();
  char* ptr = AddressForArgs(args);

  if (ptr == nullptr) {
    throw Error::New(env, "reinterpretUntilZeros: Cannot reinterpret from nullptr pointer");
  }
  size_t size = 0;
  while (size < kMaxLength) {
    if ((*(T*)(ptr + size))== 0) {
      break;
    }
    size += sizeof(T);
  }

  return WrapPointer(env, ptr, size);
}

Value _reinterpretUntilZeros8(const CallbackInfo& args) {
  Env env = args.Env();
  char* ptr = AddressForArgs(args);

  if (ptr == nullptr) {
    throw Error::New(env, "reinterpretUntilZeros: Cannot reinterpret from nullptr pointer");
  }
  return WrapPointer(env, ptr, strlen(ptr));
}

auto _reinterpretUntilZeros16 = ReinterpretBufferUntilZeros<uint16_t>;
auto _reinterpretUntilZeros32 = ReinterpretBufferUntilZeros<uint32_t>;
auto _reinterpretUntilZeros64 = ReinterpretBufferUntilZeros<uint64_t>;

} // anonymous namespace

Object Init(Env env, Object exports) {
  // "sizeof" map
  Object smap = Object::New(env);
  // fixed sizes
#define SET_SIZEOF(name, type) \
  smap[ #name ] = Number::New(env, sizeof(type));
  SET_SIZEOF(int8, int8_t);
  SET_SIZEOF(uint8, uint8_t);
  SET_SIZEOF(int16, int16_t);
  SET_SIZEOF(uint16, uint16_t);
  SET_SIZEOF(int32, int32_t);
  SET_SIZEOF(uint32, uint32_t);
  SET_SIZEOF(int64, int64_t);
  SET_SIZEOF(uint64, uint64_t);
  SET_SIZEOF(float, float);
  SET_SIZEOF(double, double);
  // (potentially) variable sizes
  SET_SIZEOF(bool, bool);
  SET_SIZEOF(byte, unsigned char);
  SET_SIZEOF(char, char);
  SET_SIZEOF(uchar, unsigned char);
  SET_SIZEOF(short, short);
  SET_SIZEOF(ushort, unsigned short);
  SET_SIZEOF(int, int);
  SET_SIZEOF(uint, unsigned int);
  SET_SIZEOF(long, long);
  SET_SIZEOF(ulong, unsigned long);
  SET_SIZEOF(longlong, long long);
  SET_SIZEOF(ulonglong, unsigned long long);
  SET_SIZEOF(pointer, char *);
  SET_SIZEOF(size_t, size_t);
  // size of a weak handle to a JS object
  SET_SIZEOF(Object, Reference<Object>);

  // "alignof" map
  Object amap = Object::New(env);
#define SET_ALIGNOF(name, type) \
  struct s_##name { type a; }; \
  amap[ #name ] = Number::New(env, alignof(struct s_##name));
  SET_ALIGNOF(int8, int8_t);
  SET_ALIGNOF(uint8, uint8_t);
  SET_ALIGNOF(int16, int16_t);
  SET_ALIGNOF(uint16, uint16_t);
  SET_ALIGNOF(int32, int32_t);
  SET_ALIGNOF(uint32, uint32_t);
  SET_ALIGNOF(int64, int64_t);
  SET_ALIGNOF(uint64, uint64_t);
  SET_ALIGNOF(float, float);
  SET_ALIGNOF(double, double);
  SET_ALIGNOF(bool, bool);
  SET_ALIGNOF(byte, unsigned char);
  SET_ALIGNOF(char, char);
  SET_ALIGNOF(uchar, unsigned char);
  SET_ALIGNOF(short, short);
  SET_ALIGNOF(ushort, unsigned short);
  SET_ALIGNOF(int, int);
  SET_ALIGNOF(uint, unsigned int);
  SET_ALIGNOF(long, long);
  SET_ALIGNOF(ulong, unsigned long);
  SET_ALIGNOF(longlong, long long);
  SET_ALIGNOF(ulonglong, unsigned long long);
  SET_ALIGNOF(pointer, char *);
  SET_ALIGNOF(size_t, size_t);
  SET_ALIGNOF(Object, Reference<Object>);

  // exports
  exports["sizeof"] = smap;
  exports["alignof"] = amap;
  exports["nullptr"] = exports["NULL"] = WrapPointer(env, nullptr, 0);
  exports["address"] = Function::New(env, Address);
  exports["readObject"] = Function::New(env, ReadObject);
  exports["_writeObject"] = Function::New(env, WriteObject);
  exports["readPointer"] = Function::New(env, ReadPointer);
  exports["_writePointer"] = Function::New(env, WritePointer);
  exports["_reinterpret"] = Function::New(env, ReinterpretBuffer);
  exports["_reinterpretUntilZeros8"] = Function::New(env, _reinterpretUntilZeros8);
  exports["_reinterpretUntilZeros16"] = Function::New(env, _reinterpretUntilZeros16);
  exports["_reinterpretUntilZeros32"] = Function::New(env, _reinterpretUntilZeros32);
  exports["_reinterpretUntilZeros64"] = Function::New(env, _reinterpretUntilZeros64);
  return exports;
}
