import { v4 as uuidv4 } from 'uuid';

export class SidebarElement {
	expression: string;
	color: string;
	isVisible: boolean;

	readonly key: number;

	constructor(latexFunction?: Partial<SidebarElement>) {
		this.expression = latexFunction?.expression ?? ""; // Latex expression
		this.color = latexFunction?.color ?? ""; // Hex color code
		this.isVisible = latexFunction?.isVisible ?? true; // Visibility boolean

		if (latexFunction?.key) {
			throw new Error("Keys are computed internally and should not be passed into the SidebarElement constructor");
		}

		this.key = uuidv4(); // Unique generated ID
	}
}
