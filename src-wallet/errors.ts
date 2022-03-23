/**
 * The base class for `erdjs` exceptions (errors).
 */
export class Err extends Error {
    inner: Error | undefined = undefined;

    public constructor(message: string, inner?: Error) {
        super(message);
        this.inner = inner;
    }
}

/**
 * Signals that an invariant failed.
 */
export class ErrInvariantFailed extends Err {
    public constructor(message: string) {
        super(`"Invariant failed: ${message}`);
    }
}

/**
 * Signals a wrong mnemonic format.
 */
export class ErrWrongMnemonic extends Err {
    public constructor() {
        super("Wrong mnemonic format");
    }
}

/**
 * Signals a wrong password.
 */
 export class ErrWrongPassword extends Err {
    public constructor(message: string) {
        super(`Possibly wrong password: ${message}`);
    }
}

/**
 * Signals a bad PEM file.
 */
export class ErrBadPEM extends Err {
    public constructor(message?: string) {
        super(message ? `Bad PEM: ${message}` : `Bad PEM`);
    }
}

/**
 * Signals an error related to signing a message (a transaction).
 */
export class ErrSignerCannotSign extends Err {
    public constructor(inner: Error) {
        super(`Cannot sign`, inner);
    }
}
