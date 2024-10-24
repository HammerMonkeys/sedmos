export class ExprEvalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedLatexError";
  }
}

export class CircularDependencyError extends ExprEvalError {
  constructor() {
    super("Circular dependency detected");
    this.name = "CircularDependencyError";
  }
}