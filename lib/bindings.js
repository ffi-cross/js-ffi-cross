"use strict";
let bindings;
try {
  bindings = require("../build/Release/ffi_bindings.node");
} catch (outerError) {
  try {
    bindings = require("../build/Debug/ffi_bindings.node");
  } catch (innerError) {
    console.error("innerError", innerError);
    // Re-throw the exception from the Release require if the Debug require fails as well
    throw outerError;
  }
}

module.exports = bindings.initializeBindings();
