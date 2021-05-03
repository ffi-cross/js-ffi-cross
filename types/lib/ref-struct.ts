// Definitions by: Keerthi Niranjan <https://github.com/keerthi16>, Kiran Niranjan <https://github.com/KiranNiranjan>

import { Type } from './ref-type'

/**
 * This is the `constructor` of the Struct type that gets returned.
 *
 * Invoke it with `new` to create a new Buffer instance backing the struct.
 * Pass it an existing Buffer instance to use that as the backing buffer.
 * Pass in an Object containing the struct fields to auto-populate the
 * struct with the data.
 *
 * @constructor
 */
export interface StructType extends Type<any> {
    /** Pass it an existing Buffer instance to use that as the backing buffer. */
    new (arg: Buffer, data?: {}): any;
    new (data?: {}): any;
    /** Pass it an existing Buffer instance to use that as the backing buffer. */
    (arg: Buffer, data?: {}): any;
    (data?: {}): any;

    fields: { [key: string]: { type: Type<any> } };

    /**
     * Adds a new field to the struct instance with the given name and type.
     * Note that this function will throw an Error if any instances of the struct
     * type have already been created, therefore this function must be called at the
     * beginning, before any instances are created.
     */
    defineProperty(name: string, type: Type<any>): void;

    /**
     * Adds a new field to the struct instance with the given name and type.
     * Note that this function will throw an Error if any instances of the struct
     * type have already been created, therefore this function must be called at the
     * beginning, before any instances are created.
     */
    defineProperty(name: string, type: string): void;

    /**
     * Custom for struct type instances.
     * @override
     */
    toString(): string;
}

/** The struct type meta-constructor. */
export declare const StructType: {
    new (fields?: object, opt?: object): StructType;
    new (fields?: any[]): StructType;
    (fields?: object, opt?: object): StructType;
    (fields?: any[]): StructType;
}
