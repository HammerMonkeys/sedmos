function add(a: number, b: number): number {
    return a + b;
}

test("Add two numbers", () => {
    expect(add(1, 2)).toBe(3);
});