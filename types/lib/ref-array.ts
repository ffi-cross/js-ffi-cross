
import { Type, TypedBuffer } from './ref-type'

export interface ArrayTypeValue<T> {
  [i: number]: ArrayTypeValue<T>['element'];
  length: number;
  toArray(): ArrayTypeValue<T>['element'][];
  toJSON(): ArrayTypeValue<T>['element'][];
  inspect(): string;
  buffer: Buffer;

  /* The following member are not exist at all, as they are used to inference type */
  type: TypedBuffer<Type<Type<T>>>['type']
  element: TypedBuffer<Type<T>>['value'] /* The type of array element, such as 'char' */
  value: TypedBuffer<Type<Type<T>>>['value']   /* array type, such as 'char*' */
  refer: TypedBuffer<Type<Type<T>>>['refer'] /* refer to array type, such as 'char**' */
}

export interface ArrayType<T> extends Type<T> {
    BYTES_PER_ELEMENT: number;
    fixedLength: number;
    /** The reference to the base type. */
    type: Type<T>;

    /**
     * Accepts a Buffer instance that should be an already-populated with data
     * for the ArrayType. The "length" of the Array is determined by searching
     * through the buffer's contents until an aligned NULL pointer is encountered.
     */
    untilZeros(buffer: Buffer): ArrayTypeValue<T>;

    new (length?: number): ArrayTypeValue<T>;
    new (data: ArrayTypeValue<T>['element'][], length?: number): ArrayTypeValue<T>;
    new (data: Buffer, length?: number): ArrayTypeValue<T>;
    (length?: number): ArrayTypeValue<T>;
    (data: ArrayTypeValue<T>['element'][], length?: number): ArrayTypeValue<T>;
    (data: Buffer, length?: number): ArrayTypeValue<T>;
}

/**
 * The array type meta-constructor.
 * The returned constructor's API is highly influenced by the WebGL
 * TypedArray API.
 */
export declare const ArrayType: {
    new <T>(type: Type<T>, length?: number): ArrayType<T>;
    <T>(type: Type<T>, length?: number): ArrayType<T>;
};
