import BigNumber from "bignumber.js";
import { BigUIntType, BigUIntValue, ManagedDecimalType, ManagedDecimalValue, U32Value } from "../typesystem";
import { BinaryCodec } from "./binary";
import { SizeOfU32 } from "./constants";
import { bufferToBigInt } from "./utils";

export class ManagedDecimalCodec {
    private readonly binaryCodec: BinaryCodec;

    constructor(binaryCodec: BinaryCodec) {
        this.binaryCodec = binaryCodec;
    }

    decodeNested(buffer: Buffer, type: ManagedDecimalType): [ManagedDecimalValue, number] {
        // Check if buffer is long enough to read the length prefix
        if (buffer.length < 4) {
            throw new Error("Buffer too short to read length prefix");
        }

        const length = buffer.readUInt32BE(0); // Length of BigUInt payload

        // Calculate total expected length (length prefix + BigUInt + scale for decimals)
        const totalLength = 4 + length + (type.isVariable() ? SizeOfU32 : 0);
        if (totalLength > buffer.length) {
            throw new Error(`Buffer too short for ManagedDecimal (expected ${totalLength}, got ${buffer.length})`);
        }

        const result = this.decodeTopLevel(buffer.slice(0, totalLength), type);

        return [result, totalLength];
    }

    decodeTopLevel(buffer: Buffer, type: ManagedDecimalType): ManagedDecimalValue {
        if (buffer.length === 0) {
            return new ManagedDecimalValue(new BigNumber(0), 0, type.isVariable());
        }

        if (type.isVariable()) {
            // Ensure buffer includes scale for variable types
            if (buffer.length < SizeOfU32) {
                throw new Error("Buffer too short to include scale for variable ManagedDecimal");
            }

            const bigUintSize = buffer.length - SizeOfU32;
            if (bigUintSize < 0) {
                throw new Error("Invalid buffer size for BigUInt");
            }
            const biguintBuffer = buffer.slice(0, bigUintSize);
            const [value] = this.binaryCodec.decodeNested(biguintBuffer, new BigUIntType());
            const scale = buffer.readUInt32BE(bigUintSize);

            return new ManagedDecimalValue(value.valueOf().shiftedBy(-scale), scale, true);
        }

        // Fixed type: scale from metadata
        const value = bufferToBigInt(buffer);
        const metadata = type.getMetadata();
        const scale = metadata !== "usize" ? parseInt(metadata.toString()) : 0;
        return new ManagedDecimalValue(value.shiftedBy(-scale), scale, false);
    }

    encodeNested(value: ManagedDecimalValue): Buffer {
        let buffers: Buffer[] = [];
        const rawValue = new BigUIntValue(value.toBigNumber().shiftedBy(value.getScale()));
        if (value.isVariable()) {
            buffers.push(Buffer.from(this.binaryCodec.encodeNested(rawValue)));
            buffers.push(Buffer.from(this.binaryCodec.encodeNested(new U32Value(value.getScale()))));
        } else {
            buffers.push(this.binaryCodec.encodeTopLevel(rawValue));
        }
        return Buffer.concat(buffers);
    }

    encodeTopLevel(value: ManagedDecimalValue): Buffer {
        return this.encodeNested(value);
    }
}
