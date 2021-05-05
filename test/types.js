'use strict';
const assert = require('assert')
const ffi = require('../')
const { ref } = ffi

describe('types', function () {
  describe('`ffi_type` to ref type matchups', function () {
    Object.keys(ref.types).forEach(name => {
      it('should match a valid `ffi_type` for "' + name + '"', () =>{
        const type = ref.types[name];
        const ffi_type = ffi.ffiType(type);
        assert(Buffer.isBuffer(ffi_type));
      });
    });

    Object.keys(ref.types).forEach(name => {
      if (name === 'Object') {
        return;
      }
      it(`should match a valid 'ffi_type' for '${name}' without a cached value`, () =>{
        // simulate a ref type without a "ffi_type" property set
        const type = Object.create(ref.types[name]);
        type.ffi_type = undefined;

        const ffi_type = ffi.ffiType(type);
        assert(Buffer.isBuffer(ffi_type));
      });
    });
  });
});
