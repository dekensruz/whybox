// A small, safe arithmetic language for the formulas of a lesson plan.
// Formulas come from the model, so they are parsed rather than executed:
// only numbers, variables, + - * / ^, parentheses and a few math functions are allowed.

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  exp: Math.exp,
  log: Math.log,
  log10: Math.log10,
  pow: Math.pow,
  min: Math.min,
  max: Math.max,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
};

const CONSTANTS: Record<string, number> = { pi: Math.PI, PI: Math.PI, e: Math.E };

type Token = { type: 'number'; value: number } | { type: 'name'; value: string } | { type: 'op'; value: string };

export type Node =
  | { kind: 'number'; value: number }
  | { kind: 'variable'; name: string }
  | { kind: 'unary'; op: '-' | '+'; operand: Node }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/' | '^'; left: Node; right: Node }
  | { kind: 'call'; name: string; args: Node[] };

const tokenize = (source: string): Token[] => {
  const tokens: Token[] = [];
  const pattern = /\s*(?:(\d+(?:\.\d+)?(?:e[+-]?\d+)?)|([A-Za-z_][A-Za-z0-9_.]*)|(\*\*|[-+*/^(),]))/gy;
  let index = 0;
  while (index < source.length) {
    pattern.lastIndex = index;
    const match = pattern.exec(source);
    if (!match) {
      if (source.slice(index).trim() === '') break;
      throw new Error(`Unexpected character in formula: "${source.slice(index)}"`);
    }
    index = pattern.lastIndex;
    if (match[1] !== undefined) tokens.push({ type: 'number', value: Number(match[1]) });
    else if (match[2] !== undefined) tokens.push({ type: 'name', value: match[2].replace(/^Math\./, '') });
    else tokens.push({ type: 'op', value: match[3] === '**' ? '^' : match[3] });
  }
  return tokens;
};

/** Parses a formula into a syntax tree. Throws on invalid syntax or unknown functions. */
export const parse = (formula: string): Node => {
  const tokens = tokenize(formula);
  let position = 0;
  const peek = () => tokens[position];
  const isOp = (...ops: string[]) => peek()?.type === 'op' && ops.includes(peek().value as string);
  const take = () => tokens[position++];
  const expect = (op: string) => {
    const token = take();
    if (token?.type !== 'op' || token.value !== op) throw new Error(`Expected "${op}" in formula`);
  };

  // expression := term (('+' | '-') term)*
  const expression = (): Node => {
    let node = term();
    while (isOp('+', '-')) node = { kind: 'binary', op: take().value as '+' | '-', left: node, right: term() };
    return node;
  };
  // term := unary (('*' | '/') unary)*
  const term = (): Node => {
    let node = unary();
    while (isOp('*', '/')) node = { kind: 'binary', op: take().value as '*' | '/', left: node, right: unary() };
    return node;
  };
  // unary := ('-' | '+') unary | power      (so -a^2 means -(a^2))
  const unary = (): Node => (isOp('-', '+') ? { kind: 'unary', op: take().value as '-' | '+', operand: unary() } : power());
  // power := primary ('^' unary)?           (right associative)
  const power = (): Node => {
    const base = primary();
    if (!isOp('^')) return base;
    take();
    return { kind: 'binary', op: '^', left: base, right: unary() };
  };
  const primary = (): Node => {
    const token = take();
    if (!token) throw new Error('Unexpected end of formula');
    if (token.type === 'number') return { kind: 'number', value: token.value };
    if (token.type === 'op' && token.value === '(') {
      const node = expression();
      expect(')');
      return node;
    }
    if (token.type === 'name') {
      if (isOp('(')) {
        if (!Object.hasOwn(FUNCTIONS, token.value)) throw new Error(`Unknown function "${token.value}"`);
        take();
        const args = [expression()];
        while (isOp(',')) {
          take();
          args.push(expression());
        }
        expect(')');
        return { kind: 'call', name: token.value, args };
      }
      return { kind: 'variable', name: token.value };
    }
    throw new Error(`Unexpected "${token.value}" in formula`);
  };

  const node = expression();
  if (position < tokens.length) throw new Error('Unexpected trailing input in formula');
  return node;
};

const evaluateNode = (node: Node, variables: Record<string, number>): number => {
  switch (node.kind) {
    case 'number':
      return node.value;
    case 'variable':
      if (Object.hasOwn(variables, node.name)) return variables[node.name];
      if (Object.hasOwn(CONSTANTS, node.name)) return CONSTANTS[node.name];
      throw new Error(`Unknown variable "${node.name}"`);
    case 'unary':
      return node.op === '-' ? -evaluateNode(node.operand, variables) : evaluateNode(node.operand, variables);
    case 'binary': {
      const left = evaluateNode(node.left, variables);
      const right = evaluateNode(node.right, variables);
      if (node.op === '+') return left + right;
      if (node.op === '-') return left - right;
      if (node.op === '*') return left * right;
      if (node.op === '/') return left / right;
      return left ** right;
    }
    case 'call':
      return FUNCTIONS[node.name](...node.args.map((arg) => evaluateNode(arg, variables)));
  }
};

/** Evaluates `formula` with the given variables. Throws on unknown names or invalid syntax. */
export const evaluate = (formula: string, variables: Record<string, number>): number => evaluateNode(parse(formula), variables);

/**
 * Turns a formula into a fully parenthesized JavaScript expression over `p.<name>`, for the experiment runtime.
 * Safe by construction: only numbers, operators, whitelisted Math functions and known parameter names are emitted.
 */
export const toJavaScript = (formula: string, parameterNames: string[]): string => {
  const emit = (node: Node): string => {
    switch (node.kind) {
      case 'number':
        return `(${node.value})`;
      case 'variable':
        if (parameterNames.includes(node.name)) return `p.${node.name}`;
        if (Object.hasOwn(CONSTANTS, node.name)) return `(${CONSTANTS[node.name]})`;
        throw new Error(`Unknown variable "${node.name}"`);
      case 'unary':
        return `(${node.op}${emit(node.operand)})`;
      case 'binary':
        return node.op === '^' ? `Math.pow(${emit(node.left)}, ${emit(node.right)})` : `(${emit(node.left)} ${node.op} ${emit(node.right)})`;
      case 'call':
        return `Math.${node.name}(${node.args.map(emit).join(', ')})`;
    }
  };
  return emit(parse(formula));
};
