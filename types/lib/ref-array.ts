// Definitions by: Keerthi Niranjan <https://github.com/keerthi16>, Kiran Niranjan <https://github.com/KiranNiranjan>

import { Type } from './ref-type'

export interface ArrayTypeValue<T> {
  [i: number]: T;
  length: number;
  toArray(): T[];
  toJSON(): T[];
  inspect(): string;
  buffer: Buffer;
  ref(): Buffer;
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
    new (data: number[], length?: number): ArrayTypeValue<T>;
    new (data: Buffer, length?: number): ArrayTypeValue<T>;
    (length?: number): ArrayTypeValue<T>;
    (data: number[], length?: number): ArrayTypeValue<T>;
    (data: Buffer, length?: number): ArrayTypeValue<T>;
}

/**
 * The array type meta-constructor.
 * The returned constructor's API is highly influenced by the WebGL
 * TypedArray API.
 */
export declare const ArrayType: {
    new <T>(type: Type<T>, length?: number): ArrayType<T>;
    new <T>(type: string, length?: number): ArrayType<T>;
    <T>(type: Type<T>, length?: number): ArrayType<T>;
    <T>(type: string, length?: number): ArrayType<T>;
};
