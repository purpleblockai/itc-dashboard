declare module 'papaparse' {
  export interface ParseConfig {
    delimiter?: string;
    newline?: string;
    quoteChar?: string;
    escapeChar?: string;
    header?: boolean;
    dynamicTyping?: boolean;
    preview?: number;
    encoding?: string;
    worker?: boolean;
    comments?: boolean;
    download?: boolean;
    skipEmptyLines?: boolean;
    fastMode?: boolean;
    withCredentials?: boolean;
    delimitersToGuess?: string[];
    chunk?(results: ParseResult, parser: Parser): void;
    complete?(results: ParseResult, file: File): void;
    error?(error: Error, file: File): void;
    transform?(value: string, field: string|number): any;
    step?(results: ParseStepResult, parser: Parser): void;
    beforeFirstChunk?(chunk: string): string|void;
  }

  export interface ParseResult {
    data: any[];
    errors: Array<{
      type: string;
      code: string;
      message: string;
      row: number;
    }>;
    meta: {
      delimiter: string;
      linebreak: string;
      aborted: boolean;
      truncated: boolean;
      cursor: number;
    };
  }

  export interface ParseStepResult {
    data: [string[]];
    errors: Array<{
      type: string;
      code: string;
      message: string;
      row: number;
    }>;
    meta: {
      delimiter: string;
      linebreak: string;
      aborted: boolean;
      truncated: boolean;
      cursor: number;
    };
  }

  export interface Parser {
    abort(): void;
    pause(): void;
    resume(): void;
  }

  export interface UnparseConfig {
    quotes?: boolean|string[];
    quoteChar?: string;
    escapeChar?: string;
    delimiter?: string;
    header?: boolean;
    newline?: string;
    skipEmptyLines?: boolean|'greedy';
    columns?: string[]|object[];
  }

  export function parse(input: string|File|NodeJS.ReadableStream, config?: ParseConfig): ParseResult;
  export function unparse(data: object|object[]|string[][], config?: UnparseConfig): string;
} 