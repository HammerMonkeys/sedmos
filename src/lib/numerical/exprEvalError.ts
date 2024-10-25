export class ExprEvalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpressionEvaluationError";
  }
}

export class CircularDependencyError extends ExprEvalError {
  constructor() {
    super("Circular dependency detected");
    this.name = "CircularDependencyError";
  }
}

export class ReservedSymbol extends ExprEvalError {
  constructor(id: string) {
    super("Reserved symbol detected: " + id);
    this.name = "ReservedSymbolError";
  }
}

export class Not2DGraphable extends ExprEvalError {
  constructor() {
    super("Not 2D graphable. Must be only a function of x or y, but not both");
    this.name = "Not2DGraphableError";
  }
}
