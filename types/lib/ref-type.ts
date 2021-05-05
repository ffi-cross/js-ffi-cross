
export interface Type<T> {
    /** The size in bytes required to hold this datatype. */
    size: number;
    /** The current level of indirection of the buffer. */
    indirection: number;
    /** To invoke when `ref.get` is invoked on a buffer of this type. */
    get(buffer: Buffer, offset: number): T;
    /** To invoke when `ref.set` is invoked on a buffer of this type. */
    set(buffer: Buffer, value: T, offset: number): void;
    /** The name to use during debugging for this datatype. */
    name?: string;
    /** The alignment of this datatype when placed inside a struct. */
    alignment?: number;
}
