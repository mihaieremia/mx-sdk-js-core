import * as fs from "fs";
import { PathLike } from "fs";
import { Message, MessageComputer, TransactionComputer } from "..";
import { Address } from "../address";
import { LibraryConfig } from "../config";
import { Transaction } from "../transaction";
import { KeyPair, Mnemonic, UserPublicKey, UserSecretKey, UserSigner, UserWallet } from "../wallet";
import { UserPem } from "../wallet/userPem";
import { IAccount } from "./interfaces";

/**
 * An abstraction representing an account (user or Smart Contract) on the Network.
 */
export class Account implements IAccount {
    /**
     * The address of the account.
     */
    readonly address: Address = Address.empty();

    /**
     * The nonce of the account (the account sequence number).
     */
    nonce: bigint = 0n;

    /**
     * The secret key of the account.
     */
    readonly secretKey: UserSecretKey;

    /**
     * The public key of the account.
     */
    readonly publicKey: UserPublicKey;

    /**
     * Creates an account object from an address
     */
    constructor(secretKey: UserSecretKey, hrp: string = LibraryConfig.DefaultAddressHrp) {
        this.secretKey = secretKey;
        this.publicKey = secretKey.generatePublicKey();
        this.address = this.publicKey.toAddress(hrp);
    }

    static async newFromPem(
        path: PathLike,
        index: number = 0,
        hrp: string = LibraryConfig.DefaultAddressHrp,
    ): Promise<Account> {
        const text = await fs.promises.readFile(path, { encoding: "utf8" });
        const userSigner = UserSigner.fromPem(text, index);
        return new Account(userSigner.secretKey, hrp);
    }

    static newFromKeystore(
        filePath: string,
        password: string,
        addressIndex?: number,
        hrp: string = LibraryConfig.DefaultAddressHrp,
    ): Account {
        const secretKey = UserWallet.loadSecretKey(filePath, password, addressIndex);
        return new Account(secretKey, hrp);
    }

    static newFromMnemonic(
        mnemonic: string,
        addressIndex: number = 0,
        hrp: string = LibraryConfig.DefaultAddressHrp,
    ): Account {
        const mnemonicHandler = Mnemonic.fromString(mnemonic);
        const secretKey = mnemonicHandler.deriveKey(addressIndex);
        return new Account(secretKey, hrp);
    }

    static newFromKeypair(keypair: KeyPair, hrp: string = LibraryConfig.DefaultAddressHrp): Account {
        return new Account(keypair.secretKey, hrp);
    }

    /**
     * Increments (locally) the nonce (the account sequence number).
     */
    incrementNonce() {
        this.nonce = this.nonce + 1n;
    }

    /**
     * Converts the account to a pretty, plain JavaScript object.
     */
    toJSON(): any {
        return {
            address: this.address.toBech32(),
            nonce: this.nonce.valueOf(),
        };
    }

    sign(data: Uint8Array): Uint8Array {
        return this.secretKey.sign(data);
    }

    verify(data: Uint8Array, signature: Uint8Array): boolean {
        return this.publicKey.verify(data, signature);
    }

    signTransaction(transaction: Transaction): Uint8Array {
        const transactionComputer = new TransactionComputer();
        const serializedTransaction = transactionComputer.computeBytesForSigning(transaction);
        return this.secretKey.sign(serializedTransaction);
    }

    signMessage(message: Message): Uint8Array {
        const messageComputer = new MessageComputer();
        const serializedMessage = messageComputer.computeBytesForSigning(message);
        return this.secretKey.sign(serializedMessage);
    }

    getNonceThenIncrement(): bigint {
        let nonce = this.nonce;
        this.nonce = this.nonce + 1n;
        return nonce;
    }

    saveToPem(path: string): void {
        const pem = new UserPem(this.address.toBech32(), this.secretKey);
        pem.save(path);
    }

    saveToKeystore(path: PathLike, password: string): void {
        const wallet = UserWallet.fromSecretKey({ secretKey: this.secretKey, password });
        wallet.save(path, this.address.getHrp());
    }
}
