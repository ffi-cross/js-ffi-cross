'use strict';
const DynamicLibrary = require('./dynamic_library');
const ForeignFunction = require('./foreign_function');
const bindings = require('./bindings');
const funcs = bindings.StaticFunctions;
const ref = require('./ref/ref');
const { types } = ref;
let errno = null;
const intPtr = ref.refType(types.int);

if (process.platform == 'win32') {
  const _errno = DynamicLibrary('msvcrt.dll').get('_errno');
  const errnoPtr = ForeignFunction(_errno, intPtr, []);
  errno = function() {
    return ref.deref(errnoPtr());
  };
} else {
  errno = ForeignFunction(funcs._errno, types.int, []);
}

module.exports = errno;
