export class DiGraphNode<T> {
  public value: T;
  public children: Set<DiGraphNode<T>> = new Set();
  public parents: Set<DiGraphNode<T>> = new Set();

  constructor(value: T) {
    this.value = value;
  }

  public addChild(child: DiGraphNode<T>) {
    this.children.add(child);
    child.parents.add(this);
  }
}

export class DiGraph<T> {
  private _nodes: Map<string, DiGraphNode<T>> = new Map();

  public get(id: string) {
    return this._nodes.get(id);
  }

  public set(id: string, value: T) {
    if (this.has(id)) {
      this.get(id)!.value = value;
    } else {
      this._nodes.set(id, new DiGraphNode(value));
    }
  }

  public has(id: string) {
    return this._nodes.has(id);
  }

  public remove(id: string) {
    if (!this.has(id)) {
      throw new Error(`id ${id} not found`);
    }

    const node = this._nodes.get(id)!;

    for (const parent of node.parents) {
      parent.children.delete(node);
    }

    for (const child of node.children) {
      child.parents.delete(node);
    }

    this._nodes.delete(id);
  }

  public add_edge(from: string, to: string) {
    const fromNode = this._nodes.get(from);
    const toNode = this._nodes.get(to);

    if (!fromNode || !toNode) {
      throw new Error(`Missing ids; Edge ${from} -> ${to} cannot be created`);
    }

    fromNode.addChild(toNode);
  }

  public remove_edge(from: string, to: string) {
    const fromNode = this._nodes.get(from);
    const toNode = this._nodes.get(to);

    if (!fromNode || !toNode) {
      throw new Error(`Missing ids; Edge ${from} -> ${to} cannot be removed`);
    }

    fromNode.children.delete(toNode);
    toNode.parents.delete(fromNode);
  }

  public detect_cycle(id: string) {
    const seen = new Set<DiGraphNode<T>>();

    function detect_cycle_recursive(node: DiGraphNode<T>) {
      if (seen.has(node)) {
        return true;
      }

      seen.add(node);

      for (const child of node.children) {
        if (detect_cycle_recursive(child)) {
          return true;
        }
      }

      seen.delete(node);
      return false;
    }

    const node = this._nodes.get(id);

    if (!node) {
      throw new Error(`id ${id} not found`);
    }

    return detect_cycle_recursive(node);
  }
}