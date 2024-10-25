export class SymbolTable {
  private _symbols = new Set<string>();
  private _anonymousCounter = 0;
  private _symbolRecycle: string[] = [];

  public has(symbol: string) {
    return this._symbols.has(symbol);
  }

  public add(symbol: string) {
    if (symbol.length === 0) {
      throw new Error("Symbol must have length");
    }

    // numeric symbols are reserved
    if (this._isReserved(symbol)) {
      throw new Error("Symbol must not start with a number because it is reserved for numeric symbols");
    }

    this._symbols.add(symbol);
  }

  public newAnonymous() {
    let symbol = this._symbolRecycle.pop();
    if (symbol) return symbol;
    return (this._anonymousCounter++).toString();
  }

  public remove(symbol: string) {
    this._symbols.delete(symbol);
    if (!this._isReserved(symbol)) return;
    this._symbolRecycle.push(symbol);
  }

  private _isReserved(symbol: string) {
    if (symbol.length === 0) return false;
    return symbol[0] >= '0' && symbol[0] <= '9';
  }
}