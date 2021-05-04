// Definitions by: Keerthi Niranjan <https://github.com/keerthi16>, Kiran Niranjan <https://github.com/KiranNiranjan>

/// <reference types="node" />
import { ArrayTypeValue } from './ref-array';
import { Type } from './ref-type'

/** A Buffer that references the C NULL pointer. */
export declare var NULL: Buffer;
/** A pointer-sized buffer pointing to NULL. */
export declare var NULL_POINTER: Buffer;
/** Get the memory address of buffer. */
export declare function address(buffer: Buffer): number;
/** Allocate the memory with the given value written to it. */
export declare function alloc<T>(type: Type<T>, value?: any): Buffer;

/**
 * Allocate the memory with the given string written to it with the given
 * encoding (defaults to utf8). The buffer is 1 byte longer than the
 * string itself, and is NULL terminated.
 */
export declare function allocCString(string: string, encoding?: string): Buffer;

/**
 * Get value after dereferencing buffer.
 * That is, first it checks the indirection count of buffer's type, and
 * if it's greater than 1 then it merely returns another Buffer, but with
 * one level less indirection.
 */
export declare function deref<T>(buffer: Buffer): T;

/** Create clone of the type, with decremented indirection level by 1. */
export declare function derefType<T>(type: Type<T>): Type<T>;
/** Represents the native endianness of the processor ("LE" or "BE"). */
export declare var endianness: string;
/** Check the indirection level and return a dereferenced when necessary. */
export declare function get<T>(buffer: Buffer, offset?: number, type?: Type<T>): any;
/** Get type of the buffer. Create a default type when none exists. */
export declare function getType<T>(buffer: Buffer): Type<T>;
/** Check the NULL. */
export declare function isNull(buffer: Buffer): boolean;
/** Read C string until the first NULL. */
export declare function readCString(buffer: Buffer, offset?: number): string;

/** Read a JS Object that has previously been written. */
export declare function readObject(buffer: Buffer, offset?: number): Object;
/** Read data from the pointer. */
export declare function readPointer(buffer: Buffer, offset?: number,
    length?: number): Buffer;

/** Create pointer to buffer. */
export declare function ref<T>(buffer: Buffer | ArrayTypeValue<T>): Buffer;
/** Create clone of the type, with incremented indirection level by 1. */
export declare function refType<T>(type: Type<T>): Type<T>;

/**
 * Create buffer with the specified size, with the same address as source.
 * This function "attaches" source to the returned buffer to prevent it from
 * being garbage collected.
 */
export declare function reinterpret(buffer: Buffer, size: number,
    offset?: number): Buffer;
/**
 * Scan past the boundary of the buffer's length until it finds size number
 * of aligned NULL bytes.
 */
export declare function reinterpretUntilZeros(buffer: Buffer, size: number,
    offset?: number): Buffer;

/** Write pointer if the indirection is 1, otherwise write value. */
export declare function set<T>(buffer: Buffer, offset: number, value: any, type?: Type<T>): void;
/** Write the string as a NULL terminated. Default encoding is utf8. */
export declare function writeCString(buffer: Buffer, string: string, offset: number, encoding?: string): void;

/**
 * Write the JS Object. This function "attaches" object to buffer to prevent
 * it from being garbage collected.
 */
export declare function writeObject(buffer: Buffer, object: Object, offset: number): void;

/**
 * Write the memory address of pointer to buffer at the specified offset. This
 * function "attaches" object to buffer to prevent it from being garbage collected.
 */
export declare function writePointer(buffer: Buffer, pointer: Buffer, offset?: number): void;

/**
 * Attach object to buffer such.
 * It prevents object from being garbage collected until buffer does.
 */
export declare function _attach(buffer: Buffer, object: Object): void;

/** Same as ref.reinterpret, except that this version does not attach buffer. */
export declare function _reinterpret(buffer: Buffer, size: number,
    offset?: number): Buffer;
/** Same as ref.reinterpretUntilZeros, except that this version does not attach buffer. */
export declare function _reinterpretUntilZeros(buffer: Buffer, size: number,
    offset?: number): Buffer;
/** Same as ref.writePointer, except that this version does not attach pointer. */
export declare function _writePointer(buffer: Buffer, pointer: Buffer, offset: number): void;
/** Same as ref.writeObject, except that this version does not attach object. */
export declare function _writeObject(buffer: Buffer, object: Object, offset: number): void;
