// A small, safe arithmetic evaluator for the formulas of a lesson plan.
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

const tokenize = (source: string): Token[] => {
  const tokens: Token[] = [];
  const pattern = /\s*(?:(\d+(?:\.\d+)?(?:e[+-]?\d+)?)|([A-Za-z_][A-Za-z0-9_.]*)|(\*\*|[-+*/^(),]))/gy;
  let match: RegExpExecArray | null;
  let index = 0;
  while (index < source.length) {
    pattern.lastIndex = index;
    match = pattern.exec(source);
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

/** Evaluates `formula` with the given variables. Throws on unknown names or invalid syntax. */
export const evaluate = (formula: string, variables: Record<string, number>): number => {
  const tokens = tokenize(formula);
  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];
  const expect = (op: string) => {
    const token = take();
    if (token?.type !== 'op' || token.value !== op) throw new Error(`Expected "${op}" in formula`);
  };

  // expression := term (('+' | '-') term)*
  const expression = (): number => {
    let value = term();
    while (peek()?.type === 'op' && (peek().value === '+' || peek().value === '-')) {
      value = take().value === '+' ? value + term() : value - term();
    }
    return value;
  };
  // term := power (('*' | '/') power)*
  const term = (): number => {
    let value = unary();
    while (peek()?.type === 'op' && (peek().value === '*' || peek().value === '/')) {
      value = take().value === '*' ? value * unary() : value / unary();
    }
    return value;
  };
  // unary := ('-' | '+') unary | power
  const unary = (): number => {
    const token = peek();
    if (token?.type === 'op' && (token.value === '-' || token.value === '+')) {
      take();
      return token.value === '-' ? -unary() : unary();
    }
    return power();
  };
  // power := primary ('^' unary)?   (right associative)
  const power = (): number => {
    const base = primary();
    if (peek()?.type === 'op' && peek().value === '^') {
      take();
      return base ** unary();
    }
    return base;
  };
  const primary = (): number => {
    const token = take();
    if (!token) throw new Error('Unexpected end of formula');
    if (token.type === 'number') return token.value;
    if (token.type === 'op' && token.value === '(') {
      const value = expression();
      expect(')');
      return value;
    }
    if (token.type === 'name') {
      if (peek()?.type === 'op' && peek().value === '(') {
        if (!Object.hasOwn(FUNCTIONS, token.value)) throw new Error(`Unknown function "${token.value}"`);
        const fn = FUNCTIONS[token.value];
        take();
        const args = [expression()];
        while (peek()?.type === 'op' && peek().value === ',') {
          take();
          args.push(expression());
        }
        expect(')');
        return fn(...args);
      }
      if (Object.hasOwn(variables, token.value)) return variables[token.value];
      if (Object.hasOwn(CONSTANTS, token.value)) return CONSTANTS[token.value];
      throw new Error(`Unknown variable "${token.value}"`);
    }
    throw new Error(`Unexpected "${token.value}" in formula`);
  };

  const result = expression();
  if (position < tokens.length) throw new Error('Unexpected trailing input in formula');
  return result;
};
