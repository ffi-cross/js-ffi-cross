
/**
 * This example creates an ffi.Callback from the "Math.abs()" JavaScript function
 * then creates a ffi.ForeignFunction from that callback function pointer.
 *
 * The result is basically the same as calling "Math.abs()" directly, haha!
 *
 * This example should basically just run forever, in an endless loop.
 * This file is a "pummel test" of sorts for:
 *     https://github.com/rbranson/node-ffi/issues/74
 *
 * We should run this file periodically for a period of ~10 minutes to make sure
 * it doesn't crash ever.
 */

const ffi = require('../')
const assert = require('assert')

var funcPtr = ffi.Callback(ffi.types.int, [ ffi.types.int ], Math.abs)
var func = ffi.ForeignFunction(funcPtr, ffi.types.int, [ ffi.types.int ])

let count = 0
function loop () {
  for (var i = 0; i < 100; i++) {
    assert.equal(Math.abs(-i), func(-i))
  }
  count += 1
  if (count % 100 == 0) {
    console.log(Date.now())
  }

  // Use this to check memory leak
  (typeof setImmediate != 'undefined' ? setImmediate : process.nextTick)(loop)
}
loop()
