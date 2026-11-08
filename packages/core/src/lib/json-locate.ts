/** A JSON path: object keys and array indexes. */
export type JsonPath = readonly (string | number)[];

/** Thrown inside the scanner to stop at a syntax error. */
class SyntaxStop extends Error {
  readonly offset: number;
  constructor(offset: number) {
    super('JSON syntax error');
    this.offset = offset;
  }
}

const WHITESPACE = new Set([' ', '\t', '\n', '\r']);
const LITERAL = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/y;

/**
 * Scans a JSON text, remembering the offset of the deepest value on `target` it saw. Throws
 * `SyntaxStop` at the first syntax error.
 */
class JsonScanner {
  private index = 0;
  private bestDepth = -1;
  private best = 0;

  constructor(
    private readonly text: string,
    private readonly target: JsonPath,
  ) {}

  scan(): number {
    this.readValue([]);
    this.skip();
    if (this.index < this.text.length) {
      throw new SyntaxStop(this.index);
    }
    return this.best;
  }

  private skip(): void {
    while (WHITESPACE.has(this.text[this.index] ?? '')) {
      this.index += 1;
    }
  }

  private take(char: string): void {
    this.skip();
    if (this.text[this.index] !== char) {
      throw new SyntaxStop(this.index);
    }
    this.index += 1;
  }

  private readString(): string {
    const start = this.index;
    this.take('"');
    let value = '';
    for (;;) {
      const char = this.text[this.index];
      if (char === undefined || char === '\n') {
        throw new SyntaxStop(start);
      }
      this.index += char === '\\' ? 2 : 1;
      if (char === '"') {
        return value;
      }
      value += char === '\\' ? (this.text[this.index - 1] ?? '') : char;
    }
  }

  /** Reads `,` (true: more follows) or `close` (false), else a syntax error. */
  private separator(close: string): boolean {
    this.skip();
    const next = this.text[this.index];
    if (next !== ',' && next !== close) {
      throw new SyntaxStop(this.index);
    }
    this.index += 1;
    return next === ',';
  }

  private isEmpty(open: string, close: string): boolean {
    this.take(open);
    this.skip();
    if (this.text[this.index] !== close) {
      return false;
    }
    this.index += 1;
    return true;
  }

  private mark(path: JsonPath): void {
    const { target } = this;
    const onTarget = path.length <= target.length && path.every((key, i) => target[i] === key);
    if (onTarget && path.length > this.bestDepth) {
      this.best = this.index;
      this.bestDepth = path.length;
    }
  }

  private readObject(path: JsonPath): void {
    if (this.isEmpty('{', '}')) {
      return;
    }
    do {
      this.skip();
      const key = this.readString();
      this.take(':');
      this.readValue([...path, key]);
    } while (this.separator('}'));
  }

  private readArray(path: JsonPath): void {
    if (this.isEmpty('[', ']')) {
      return;
    }
    let i = 0;
    do {
      this.readValue([...path, i]);
      i += 1;
    } while (this.separator(']'));
  }

  private readValue(path: JsonPath): void {
    this.skip();
    this.mark(path);
    const char = this.text[this.index];
    if (char === '{') {
      this.readObject(path);
    } else if (char === '[') {
      this.readArray(path);
    } else if (char === '"') {
      this.readString();
    } else {
      LITERAL.lastIndex = this.index;
      if (!LITERAL.test(this.text)) {
        throw new SyntaxStop(this.index);
      }
      this.index = LITERAL.lastIndex;
    }
  }
}

const lineAt = (text: string, offset: number): number => text.slice(0, offset).split('\n').length;

/**
 * The 1-based line to show for a problem in a JSON text: the first syntax error if there is one,
 * otherwise where the value at `path` starts (or its deepest existing parent, for a missing key).
 * Pure; used to point the Issues view at the right line.
 */
export const jsonProblemLine = (text: string, path: JsonPath = []): number => {
  try {
    return lineAt(text, new JsonScanner(text, path).scan());
  } catch (error: unknown) {
    if (error instanceof SyntaxStop) {
      return lineAt(text, error.offset);
    }
    throw error;
  }
};
