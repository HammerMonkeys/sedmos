import { v4 as uuidv4 } from "uuid";

export class GraphFunction {
  latex: string;
  color: string;
  isVisible: boolean;

  readonly key: number;

  constructor(graphFunction: Partial<GraphFunction>) {
    this.latex = graphFunction.latex ?? ""; // Latex expression
    this.color = graphFunction.color ?? ""; // Hex color code
    this.isVisible = graphFunction.isVisible ?? true; // Visibility boolean

    if (graphFunction.key) {
      throw new Error(
        "Keys are computed internally and should not be passed into the SidebarElement constructor",
      );
    }

    this.key = uuidv4(); // Unique generated ID
  }
}
