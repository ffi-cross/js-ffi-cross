'use strict';
const assert = require('assert');
const { ref } = require('../..');

describe('char', function() {
  it('should accept a JS String, and write the first char\'s code', function() {
    const val = 'a';

    let buf = ref.alloc('char', val);
    assert.strictEqual(val, ref.deref(buf));

    buf = ref.alloc('uchar', val);
    assert.strictEqual(val, ref.deref(buf));
  });
});
