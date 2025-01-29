import { Address } from "../core/address";

export interface IAccount {
    readonly address: Address;

    sign(data: Uint8Array): Promise<Uint8Array>;
}
