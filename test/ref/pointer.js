'use strict';
const assert = require('assert');
const { ref } = require('../..');

let weak; try { weak = require('weak-napi'); } catch (e) {}

describe('pointer', function() {
  const test = Buffer.from('hello world');

  beforeEach(gc);

  it('should write and read back a pointer (Buffer) in a Buffer', function() {
    const buf = Buffer.alloc(ref.sizeof.pointer);
    ref.writePointer(buf, test, 0)
    const out = ref.readPointer(buf, 0, test.length);
    assert.strictEqual(out.length, test.length)
    for (let i = 0, l = out.length; i < l; i++) {
      assert.strictEqual(out[i], test[i])
    }
    assert.strictEqual(ref.address(out), ref.address(test))
  });

  it('should retain references to a written pointer in a Buffer', function (done) {
    if (weak === undefined)
      return this.skip('weak not avaialbe');
    let child_gc = false;
    let parent_gc = false;
    let child = Buffer.from('a pointer holding some data...');
    let parent = Buffer.alloc(ref.sizeof.pointer);

    weak(child, () => { child_gc = true });
    weak(parent, () => { parent_gc = true });
    ref.writePointer(parent, child, 0);
    assert(!child_gc, '"child" has been garbage collected too soon');
    assert(!parent_gc, '"parent" has been garbage collected too soon');

    // try to GC `child`
    child = null;
    gc();
    assert(!child_gc, '"child" has been garbage collected too soon');
    assert(!parent_gc, '"parent" has been garbage collected too soon');

    // now GC `parent`
    parent = null;
    gc();
    setImmediate(() => {
      setImmediate(() => {
        assert(parent_gc, '"parent" has not been garbage collected');
        gc();
        setImmediate(() => {
          setImmediate(() => {
            assert(child_gc, '"child" has not been garbage collected');
            done();
          });
        });
      });
    });
  });

  it('should throw an Error when reading from the NULL pointer', function() {
    assert.throws(() => {
      ref.readPointer(NULL);
    });
  });

  it('should return a 0-length Buffer when reading a NULL pointer', function() {
    const buf = Buffer.alloc(ref.sizeof.pointer);
    ref.writePointer(buf, ref.NULL, 0);
    const out = ref.readPointer(buf, 0, 100);
    assert.strictEqual(out.length, 0);
  })

  describe('offset', function() {
    it('should read two pointers next to each other in memory', function() {
      const buf = Buffer.alloc(ref.sizeof.pointer * 2);
      const a = Buffer.from('hello');
      const b = Buffer.from('world');
      ref.writePointer(buf, a, 0 * ref.sizeof.pointer);
      ref.writePointer(buf, b, 1 * ref.sizeof.pointer);
      const _a = ref.readPointer(buf, 0 * ref.sizeof.pointer);
      const _b = ref.readPointer(buf, 1 * ref.sizeof.pointer);
      assert.strictEqual(ref.address(a), ref.address(_a));
      assert.strictEqual(ref.address(b), ref.address(_b));
    });
  });
});
