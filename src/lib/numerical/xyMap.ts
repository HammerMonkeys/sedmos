import type {int} from "$lib/types";

export class XYMap<T> {
  private _map: Map<int, T> = new Map();

  public static cantorPair(x: int, y: int) {
    return (x + y) * (x + y + 1) / 2 + y;
  }

  public set(x: int, y: int, value: T) {
    this._map.set(XYMap.cantorPair(x, y), value);
  }

  public get(x: int, y: int) {
    return this._map.get(XYMap.cantorPair(x, y));
  }

  public remove(x: int, y: int) {
    this._map.delete(XYMap.cantorPair(x, y));
  }

  public values() {
    return this._map.values();
  }
}