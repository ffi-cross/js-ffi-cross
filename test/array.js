const assert = require("assert")
const { ref, ArrayType } = require("../")
const bindings = require('node-gyp-build')(__dirname).arrayTest;

describe('Array', function () {

  afterEach(gc)

  it('should be a function', function () {
    assert.equal('function', typeof ArrayType)
  })

  describe('char[]', function () {
    var CharArray = ArrayType('char')

    it('should map directly to a "string"', function () {
      var b = Buffer.from('hello', 'ascii')
      var a = new CharArray(b)
      assert.equal(b.length, a.length)
      for (var i = 0; i < b.length; i++) {
        assert.equal(a[i], String.fromCharCode(b[i]))
      }
    })

    it('should throw an Error when invoked with no arguments', function () {
      assert.throws(function () {
        new CharArray()
      })
    })

  })

  describe('int32[]', function () {
    var Int32Array = ArrayType('int32')

    it('should have the type\'s size be pointer-sized by default', function () {
      assert.equal(ref.sizeof.pointer, Int32Array.size)
    })

    it('should act like an Int32Array with a number', function () {
      var a = new Int32Array(5)
      assert.equal(5, a.length)
      assert.equal(20, a.buffer.length)
      a[0] = 0
      a[1] = 10
      a[2] = 234
      a[3] = 69
      a[4] = 1410214
      assert.deepEqual([0, 10, 234, 69, 1410214], a.toArray())
    })

    it('should act like an Int32Array with an array', function () {
      var input = [ 1, 4, 91, 123123, 5123512, 0, -1 ]
      var a = new Int32Array(input)
      assert.equal(input.length, a.length)
      assert.deepEqual(input, a.toArray())
    })

    it('should throw an Error when invoked with no arguments', function () {
      assert.throws(function () {
        new Int32Array()
      })
    })

  })

  describe('void *[]', function () {
    var VoidPtrArray = ArrayType('void *')

    it('should have each element be "pointer" sized', function () {
      assert.equal(ref.sizeof.pointer, VoidPtrArray.BYTES_PER_ELEMENT)
    })

    it('should accept arbitrary pointers', function () {
      var a = new VoidPtrArray(5)
      assert.equal(5, a.length)
      assert.equal(a.length * ref.sizeof.pointer, a.buffer.length)
      var ptr1 = Buffer.alloc(1)
      var ptr2 = Buffer.alloc(1)
      var ptr3 = Buffer.alloc(1)
      a[0] = ref.NULL
      a[1] = ref.NULL_POINTER
      a[2] = ptr1
      a[3] = ptr2
      a[4] = ptr3

      assert.equal(ref.address(a[0]), ref.address(ref.NULL))
      assert.equal(ref.address(a[1]), ref.address(ref.NULL_POINTER))
      assert.equal(ref.address(a[2]), ref.address(ptr1))
      assert.equal(ref.address(a[3]), ref.address(ptr2))
      assert.equal(ref.address(a[4]), ref.address(ptr3))
    })

    it('should throw an Error when invoked with no arguments', function () {
      assert.throws(function () {
        new VoidPtrArray()
      })
    })

  })

  describe('fixed size arrays', function () {

    describe('int[10]', function () {
      var int = ref.types.int
      var IntArrayTen = ArrayType(int, 10)

      it('should have the type\'s "size" property match the default size', function () {
        assert.equal(int.size * 10, IntArrayTen.size)
      })

      it('should be created when invoked with no arguments', function () {
        var array = new IntArrayTen()
        assert.equal(10, array.length)
      })

    })

  })

  describe('.untilZeros(buffer)', function () {

    it('should read a Buffer until a NULL pointer is found', function () {
      var int = ref.types.int
      var IntArray = ArrayType(int)

      // manually create a NULL-terminated int[]
      var buf = Buffer.alloc(int.size * 3)
      int.set(buf, 5, int.size * 0)
      int.set(buf, 8, int.size * 1)
      int.set(buf, 0, int.size * 2) // <- terminate with 0s

      var array = IntArray.untilZeros(buf)
      assert.equal(2, array.length)
      assert.equal(5, array[0])
      assert.equal(8, array[1])
    })

  })

  describe('.ref()', function () {
    var IntArray = ArrayType('int')

    it('should return a Buffer that points to the base "buffer"', function () {
      var a = new IntArray(1)
      var r = ref.ref(a)
      assert.equal(ref.address(ref.readPointer(r, 0)), ref.address(a.buffer))
    })

    it('should return a Buffer with "indirection" equal to 1', function () {
      var a = new IntArray(1)
      var r = ref.ref(a)
      assert.equal(1, r.type.indirection)
    })

    it('should .deref() back into an instance of the ArrayType type', function () {
      var a = new IntArray([ 69 ])
      var r = ref.ref(a)
      var _a = ref.deref(r)
      assert(_a instanceof IntArray)
      assert.equal(ref.address(a.buffer), ref.address(_a.buffer))
      assert.equal(1, a.length)
      assert.equal(69, a[0])
    })

  })

  describe('.slice()', function () {
    var IntArray = ArrayType('int')

    it('should be able to return a slice of the base array', function () {
      var x = new IntArray([12, 34, 56, 78])
      var y = x.slice(1,3)
      assert.equal(y.length, 2)
      assert.equal(y[0], x[1])
      assert.equal(y[1], x[2])
    })

    it('should be able to use only start parameter', function () {
      var x = new IntArray([12, 34, 56, 78])
      var y = x.slice(1)
      assert.equal(y.length, 3)
      assert.equal(y[0], x[1])
      assert.equal(y[1], x[2])
      assert.equal(y[2], x[3])
    })
  })

  describe('native tests', function () {
    var IntArray = ArrayType('int')

    it('should be pass an Array to a native function', function () {
      var input = [-1, -25, -3111, -41234, -5]
      var array = new IntArray(input)

      bindings.arrayAbs(array.buffer, array.length)

      assert.deepEqual(array.toJSON(), input.map(Math.abs))
    })

  })

})
