export class ExprEvalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpressionEvaluationError";
  }
}

export class BadLatexSyntax extends ExprEvalError {
  constructor() {
    super("Invalid latex syntax");
    this.name = "LatexSyntaxError";
  }
}

export class DuplicateSymbol extends ExprEvalError {
  constructor(id: string) {
    super("Duplicate symbol detected: " + id);
    this.name = "DuplicateSymbolError";
  }
}

export class CircularDependency extends ExprEvalError {
  constructor(id: string) {
    super("Circular dependency detected: " + id);
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

export class ImplicitFieldEquation extends ExprEvalError {
  constructor() {
    super("y' or x' must be on the left hand side of the equation");
    this.name = "ImplicitFieldEquationError";
  }
}