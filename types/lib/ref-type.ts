export interface TypedBuffer<T> extends Buffer {
  type: Type<T> /* Always Type<T> */;
  value: T extends Type<infer Item>
    ? Item extends Type<infer SecondItem>
      ? TypedBuffer<Type<SecondItem>>
      : Item
    : T;
  refer: TypedBuffer<Type<T>>;
  self: T extends Type<infer Item> ? TypedBuffer<Type<Item>> : T
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

  /**
   * Suppose typeof T is int*, then
   * typeof `NULL` is int*,
   * typeof `value` is int,
   * typeof `self` is int*,
   * typeof `refer` is int**,
   * if typeof T is not a pointer, then NULL have no meaning
   */
  NULL: T extends Type<infer Item> ? TypedBuffer<Type<Item>> : undefined;
  value: TypedBuffer<T>["value"];
  self:  TypedBuffer<T>["self"];
  refer: TypedBuffer<T>["refer"];

  /* The numeric value only valid for non-pointer Type */
  /* The zero value for type T */
  zero: TypedBuffer<T>["value"];

  /**
   * For signed value, it's -1
   * for unsigned value it's UINT32_MAX for uint32_t SIZE_MAX for size_t
   * for boolean value, it's true
   */
  negative_one: TypedBuffer<T>["value"];

  /* If the maximal possible sizeof T is 8 */
  max_size_is_8: boolean;

  /** To invoke when `ref.get` is invoked on a buffer of this type. */
  get(buffer: Buffer, offset: number): TypedBuffer<T>["value"];
  getNumber(buffer: Buffer, offset: number): number;
  getBigInt(buffer: Buffer, offset: number): bigint;
  /** To invoke when `ref.set` is invoked on a buffer of this type. */
  set(buffer: Buffer, value: TypedBuffer<T>["value"], offset: number): void;
  setNumeric(buffer: Buffer, value: number | bigint, offset: number): void;
  setNumber(buffer: Buffer, value: number, offset: number): void;
  setBigInt(buffer: Buffer, value: bigint, offset: number): void;
}
