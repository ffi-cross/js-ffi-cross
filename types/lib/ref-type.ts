export interface TypedBuffer<T> extends Buffer {
  type: Type<T>;
  value: T extends Type<infer SubType>
    ? TypedBuffer<SubType>['self'] : undefined /* The type of dereferenced Type<T> */
  self: T extends Type<infer Item> ? TypedBuffer<Type<Item>> : T;
  pointer: T extends Type<infer Item> ? TypedBuffer<Type<Item>> : undefined;
  refer: TypedBuffer<Type<T>>;
  /**
   * When typeof T is `int*`, the `type` is `Type<Type<int>>`, then
   * typeof `value` is `int`,
   * typeof `self` is `int*`,
   * typeof `pointer` is `int*`,
   * typeof `refer` is `int**`,
   * if typeof T is not a pointer such as `int`,
   * When type of T is `int`, the `type` is `Type<int>`, then
   * typeof `value` is `int`,
   * typeof `self` is `int*`,
   * typeof `pointer` is `undefined`, as type int is not a pointer
   * typeof `refer` is `int*`,
   * then typeof `pointer` have no meaning and treat as undefined
   * but typeof `self` have meaning and should be `int`,
   */
}

export interface Type<T> {
  /** The type name passed to ffi for this datatype. */
  name?: string;
  /** The size in bytes required to hold this datatype. */
  size: number;
  /** The alignment of this datatype when placed inside a struct. */
  alignment?: number;
  /** The current level of indirection of the buffer. */
  indirection: number;

  /** The typename of T such as uint8_t */
  realName: string;

  type: Type<T>;
  value: TypedBuffer<T>["value"];
  self: TypedBuffer<T>["self"];
  pointer: TypedBuffer<T>["pointer"];
  refer: TypedBuffer<T>["refer"];

  /* The NULL value for T is T is a pointer type */
  NULL: TypedBuffer<T>["pointer"];

  /* The numeric value only valid for non-pointer Type */
  /* The zero value for type T */
  zero: TypedBuffer<T>["self"];

  /**
   * For signed value, it's -1
   * for unsigned value it's UINT32_MAX for uint32_t SIZE_MAX for size_t
   * for boolean value, it's true
   */
  negative_one: TypedBuffer<T>["self"];

  /* If the maximal possible sizeof T is 8 */
  max_size_is_8: boolean;

  /** To invoke when `ref.get` is invoked on a buffer of this type. */
  get(buffer: Buffer, offset: number): TypedBuffer<T>["self"];
  getNumber(buffer: Buffer, offset: number): number;
  getBigInt(buffer: Buffer, offset: number): bigint;
  /** To invoke when `ref.set` is invoked on a buffer of this type. */
  set(buffer: Buffer, value: TypedBuffer<T>["self"], offset: number): void;
  setNumeric(buffer: Buffer, value: number | bigint, offset: number): void;
  setNumber(buffer: Buffer, value: number, offset: number): void;
  setBigInt(buffer: Buffer, value: bigint, offset: number): void;
}
