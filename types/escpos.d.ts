/**
 * Declaraciones de tipos para módulos de impresora ESC/POS sin tipos oficiales.
 * Estos módulos son CommonJS y no tienen @types en DefinitelyTyped.
 */
declare module 'escpos' {
    export class Printer {
        constructor(device: any, options?: { encoding?: string });
        encode(encoding: string): this;
        align(value: 'CT' | 'LT' | 'RT'): this;
        style(value: 'B' | 'I' | 'U' | 'NORMAL' | string): this;
        size(width: number, height: number): this;
        text(content: string): this;
        tableCustom(data: Array<{ text: string; align?: string; width?: number; bold?: boolean }>): this;
        cut(): this;
        close(callback?: (err?: Error) => void): void;
    }
    export default { Printer };
}

declare module 'escpos-usb' {
    class USB {
        constructor(vid?: number, pid?: number);
        open(callback: (err: Error | null) => void): void;
        close(): void;
    }
    function findPrinter(): any[];
    export default USB;
    export { findPrinter };
}

declare module 'escpos-network' {
    class Network {
        constructor(host: string, port?: number);
        open(callback: (err: Error | null) => void): void;
        close(): void;
    }
    export default Network;
}
