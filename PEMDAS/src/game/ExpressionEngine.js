/**
 * ExpressionEngine.js
 * 
 * AST-based math expression parser and evaluator for the PEMDAS game.
 * Handles parsing, parentheses traversal, operation validation, and step-by-step evaluation.
 */

// ─── Token Types ─────────────────────────────────────────────
const TOKEN_NUMBER = 'NUMBER';
const TOKEN_OP = 'OP';
const TOKEN_LPAREN = 'LPAREN';
const TOKEN_RPAREN = 'RPAREN';
const TOKEN_EXPONENT = 'EXPONENT';

// ─── AST Node Types ──────────────────────────────────────────
const NODE_NUMBER = 'NumberNode';
const NODE_BINOP = 'BinOpNode';
const NODE_UNARY_MINUS = 'UnaryMinusNode';
const NODE_EXPONENT = 'ExponentNode';

// ─── Tokenizer ───────────────────────────────────────────────
export function tokenize(expr) {
  const tokens = [];
  let i = 0;
  const s = expr.replace(/\s+/g, '');

  while (i < s.length) {
    const ch = s[i];

    if (ch >= '0' && ch <= '9') {
      let num = '';
      while (i < s.length && s[i] >= '0' && s[i] <= '9') {
        num += s[i++];
      }
      tokens.push({ type: TOKEN_NUMBER, value: parseInt(num, 10) });
    } else if (ch === '(') {
      tokens.push({ type: TOKEN_LPAREN });
      i++;
    } else if (ch === ')') {
      tokens.push({ type: TOKEN_RPAREN });
      i++;
    } else if (ch === '^') {
      tokens.push({ type: TOKEN_EXPONENT });
      i++;
    } else if ('+-*/'.includes(ch)) {
      tokens.push({ type: TOKEN_OP, value: ch });
      i++;
    } else {
      i++; // skip unknown
    }
  }
  return tokens;
}

// ─── Recursive Descent Parser ────────────────────────────────
// Produces an AST from tokens.
// Grammar:
//   expr       → addSub
//   addSub     → mulDiv (('+' | '-') mulDiv)*
//   mulDiv     → exponent (('*' | '/') exponent)*
//   exponent   → unary ('^' unary)*
//   unary      → '-' unary | primary
//   primary    → NUMBER | '(' expr ')'

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos] || null;
  }

  consume() {
    return this.tokens[this.pos++];
  }

  expect(type) {
    const tok = this.consume();
    if (!tok || tok.type !== type) {
      throw new Error(`Expected ${type} but got ${tok ? tok.type : 'EOF'}`);
    }
    return tok;
  }

  parse() {
    const node = this.addSub();
    return node;
  }

  addSub() {
    let left = this.mulDiv();
    while (this.peek() && this.peek().type === TOKEN_OP && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.consume().value;
      const right = this.mulDiv();
      left = { type: NODE_BINOP, op, left, right, id: genId() };
    }
    return left;
  }

  mulDiv() {
    let left = this.exponent();
    while (this.peek() && this.peek().type === TOKEN_OP && (this.peek().value === '*' || this.peek().value === '/')) {
      const op = this.consume().value;
      const right = this.exponent();
      left = { type: NODE_BINOP, op, left, right, id: genId() };
    }
    return left;
  }

  exponent() {
    let base = this.unary();
    while (this.peek() && this.peek().type === TOKEN_EXPONENT) {
      this.consume();
      const exp = this.unary();
      base = { type: NODE_EXPONENT, base, exponent: exp, id: genId() };
    }
    return base;
  }

  unary() {
    if (this.peek() && this.peek().type === TOKEN_OP && this.peek().value === '-') {
      this.consume();
      const operand = this.unary();
      return { type: NODE_UNARY_MINUS, operand, id: genId() };
    }
    return this.primary();
  }

  primary() {
    const tok = this.peek();
    if (tok && tok.type === TOKEN_NUMBER) {
      this.consume();
      return { type: NODE_NUMBER, value: tok.value, id: genId() };
    }
    if (tok && tok.type === TOKEN_LPAREN) {
      this.consume();
      const node = this.addSub();
      this.expect(TOKEN_RPAREN);
      node.parenthesized = true;
      return node;
    }
    throw new Error(`Unexpected token: ${JSON.stringify(tok)}`);
  }
}

let _idCounter = 0;
function genId() {
  return ++_idCounter;
}

export function resetIdCounter() {
  _idCounter = 0;
}

export function parseExpression(exprStr) {
  const tokens = tokenize(exprStr);
  const parser = new Parser(tokens);
  return parser.parse();
}

// ─── AST to display tokens ──────────────────────────────────
// Converts AST back into a flat array of display tokens, each with an id reference.
export function astToTokens(node) {
  if (!node) return [];
  const tokens = [];

  if (node.type === NODE_NUMBER) {
    tokens.push({ type: 'number', value: String(node.value), nodeId: node.id });
  } else if (node.type === NODE_UNARY_MINUS) {
    tokens.push({ type: 'op', value: '-', nodeId: node.id });
    tokens.push(...astToTokens(node.operand));
  } else if (node.type === NODE_EXPONENT) {
    if (node.parenthesized) tokens.push({ type: 'paren', value: '(', nodeId: node.id });
    tokens.push(...astToTokens(node.base));
    tokens.push({ type: 'op', value: '^', nodeId: node.id });
    tokens.push(...astToTokens(node.exponent));
    if (node.parenthesized) tokens.push({ type: 'paren', value: ')', nodeId: node.id });
  } else if (node.type === NODE_BINOP) {
    if (node.parenthesized) tokens.push({ type: 'paren', value: '(', nodeId: node.id });
    tokens.push(...astToTokens(node.left));
    tokens.push({ type: 'op', value: node.op, nodeId: node.id });
    tokens.push(...astToTokens(node.right));
    if (node.parenthesized) tokens.push({ type: 'paren', value: ')', nodeId: node.id });
  }

  return tokens;
}

// ─── Parenthesized Group Finder ──────────────────────────────
// Returns an ordered list of parenthesized node IDs: outer→inner, left→right.
export function getParenGroups(node, depth = 0) {
  if (!node) return [];
  const groups = [];

  if (node.type === NODE_BINOP || node.type === NODE_EXPONENT) {
    if (node.parenthesized) {
      groups.push({ id: node.id, depth, node });
    }

    // Recurse into children
    if (node.type === NODE_BINOP) {
      groups.push(...getParenGroups(node.left, depth + (node.parenthesized ? 1 : 0)));
      groups.push(...getParenGroups(node.right, depth + (node.parenthesized ? 1 : 0)));
    } else if (node.type === NODE_EXPONENT) {
      groups.push(...getParenGroups(node.base, depth + (node.parenthesized ? 1 : 0)));
      groups.push(...getParenGroups(node.exponent, depth + (node.parenthesized ? 1 : 0)));
    }
  } else if (node.type === NODE_UNARY_MINUS) {
    groups.push(...getParenGroups(node.operand, depth));
  }

  // Sort: first by depth (outer first), then by position (left first — we use id as proxy for order)
  groups.sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.id - b.id;
  });

  return groups;
}

// ─── Scope Extraction ────────────────────────────────────────
// Given an AST and a selected paren group node ID, returns the sub-AST node for that scope.
export function findNodeById(node, targetId) {
  if (!node) return null;
  if (node.id === targetId) return node;

  if (node.type === NODE_BINOP) {
    return findNodeById(node.left, targetId) || findNodeById(node.right, targetId);
  } else if (node.type === NODE_EXPONENT) {
    return findNodeById(node.base, targetId) || findNodeById(node.exponent, targetId);
  } else if (node.type === NODE_UNARY_MINUS) {
    return findNodeById(node.operand, targetId);
  }
  return null;
}

// ─── Get all operations in a scope ───────────────────────────
// Returns a list of {op, nodeId, left, right} for operations within a scope node.
function getOperationsInScope(node) {
  if (!node) return [];
  const ops = [];

  if (node.type === NODE_BINOP) {
    // Don't descend into child parenthesized groups
    if (!node.left?.parenthesized) {
      ops.push(...getOperationsInScope(node.left));
    }
    if (!node.right?.parenthesized) {
      ops.push(...getOperationsInScope(node.right));
    }
    ops.push({ op: node.op, nodeId: node.id, node });
  } else if (node.type === NODE_EXPONENT) {
    if (!node.base?.parenthesized) {
      ops.push(...getOperationsInScope(node.base));
    }
    if (!node.exponent?.parenthesized) {
      ops.push(...getOperationsInScope(node.exponent));
    }
    ops.push({ op: '^', nodeId: node.id, node });
  } else if (node.type === NODE_UNARY_MINUS) {
    ops.push(...getOperationsInScope(node.operand));
  }

  return ops;
}

// ─── Operation type mapping ──────────────────────────────────
const OP_TO_PEMDAS = {
  '^': 'E',
  '*': 'M',
  '/': 'D',
  '+': 'A',
  '-': 'S',
};

const PEMDAS_TO_OPS = {
  'E': ['^'],
  'M': ['*'],
  'D': ['/'],
  'A': ['+'],
  'S': ['-'],
};

// PEMDAS priority (lower = higher priority)
const PEMDAS_PRIORITY = {
  '^': 1,
  '*': 2,
  '/': 2,
  '+': 3,
  '-': 3,
};

// ─── Validate a button press ─────────────────────────────────
// Returns: { valid, flash, nodeIds, errorType }
// errorType: 'not_present' (no life lost), 'wrong_order' (life lost), null (valid)
export function validateOperation(ast, scopeNodeId, pemdasKey) {
  // Determine the scope
  let scope = ast;
  if (scopeNodeId !== null) {
    scope = findNodeById(ast, scopeNodeId);
  }
  if (!scope) return { valid: false, errorType: 'not_present', flash: null, nodeIds: [] };

  const opsInScope = getOperationsInScope(scope);
  const targetOps = PEMDAS_TO_OPS[pemdasKey];
  if (!targetOps) return { valid: false, errorType: 'not_present', flash: null, nodeIds: [] };

  // Check if this operation type exists in the scope at all
  const matchingOps = opsInScope.filter(o => targetOps.includes(o.op));
  if (matchingOps.length === 0) {
    return { valid: false, errorType: 'not_present', flash: null, nodeIds: [] };
  }

  // Check if any parenthesized sub-groups still exist in scope (P should be pressed first)
  const subParens = getParenGroups(scope, 0).filter(g => g.id !== scope.id);
  if (subParens.length > 0) {
    // Inner parentheses must be resolved first — ALL operations at this scope level are blocked.
    // The player must press P to select the inner parens and resolve them.
    // Flash the matching ops in red to show the player what they tried to do.
    return {
      valid: false,
      errorType: 'wrong_order',
      flash: null,
      nodeIds: matchingOps.map(o => o.nodeId),
    };
  }

  return validateFromOps(opsInScope, targetOps, pemdasKey);
}

function validateFromOps(opsInScope, targetOps, pemdasKey) {
  // Find the highest priority operation in scope
  let highestPriority = Infinity;
  for (const o of opsInScope) {
    const p = PEMDAS_PRIORITY[o.op];
    if (p < highestPriority) highestPriority = p;
  }

  const matchingOps = opsInScope.filter(o => targetOps.includes(o.op));

  // Check if the pressed operation matches the highest priority
  const pressedPriority = PEMDAS_PRIORITY[targetOps[0]];
  if (pressedPriority > highestPriority) {
    // Wrong order — there's a higher-priority op to do first
    // Flash the first matching op of the pressed type
    const firstMatch = matchingOps[0];
    return {
      valid: false,
      errorType: 'wrong_order',
      flash: firstMatch ? { nodeId: firstMatch.nodeId } : null,
      nodeIds: matchingOps.map(o => o.nodeId),
    };
  }

  // Correct priority level! Now find the leftmost operation of this type.
  // The "leftmost" is the one whose left operand appears first in the expression.
  // Since our AST is left-associative, the leftmost op at this level is the deepest left child.
  const leftmostOp = findLeftmostOperation(opsInScope, targetOps);

  return {
    valid: true,
    errorType: null,
    flash: null,
    targetNodeId: leftmostOp.nodeId,
    targetNode: leftmostOp.node,
  };
}

function findLeftmostOperation(ops, targetOps) {
  const matching = ops.filter(o => targetOps.includes(o.op));
  // Smallest ID = leftmost (since IDs are assigned left-to-right during parsing)
  matching.sort((a, b) => a.nodeId - b.nodeId);
  return matching[0];
}

// ─── Evaluate a single operation node ────────────────────────
// Returns the numeric result of evaluating one BinOp/Exponent node.
export function evaluateNode(node) {
  if (node.type === NODE_NUMBER) return node.value;

  const leftVal = evaluateNode(node.type === NODE_EXPONENT ? node.base : node.left);
  const rightVal = evaluateNode(node.type === NODE_EXPONENT ? node.exponent : node.right);

  switch (node.op || (node.type === NODE_EXPONENT ? '^' : null)) {
    case '+': return leftVal + rightVal;
    case '-': return leftVal - rightVal;
    case '*': return leftVal * rightVal;
    case '/': return Math.floor(leftVal / rightVal); // integer division for game
    case '^': return Math.pow(leftVal, rightVal);
    default: return 0;
  }
}

// ─── Replace a node in the AST with a number ────────────────
// Returns a new AST with the target node replaced by its evaluated result.
export function replaceNodeWithResult(ast, targetNodeId) {
  return _replaceNode(ast, targetNodeId);
}

function _replaceNode(node, targetId) {
  if (!node) return node;
  if (node.id === targetId) {
    const result = evaluateNode(node);
    return { type: NODE_NUMBER, value: result, id: genId() };
  }

  if (node.type === NODE_BINOP) {
    const newLeft = _replaceNode(node.left, targetId);
    const newRight = _replaceNode(node.right, targetId);
    // If after replacement, both children are numbers and this node itself was the target's parent,
    // just return the updated node
    const newNode = { ...node, left: newLeft, right: newRight };

    // If this node is parenthesized and now contains just a single number, unwrap
    if (newNode.parenthesized && newNode.left.type === NODE_NUMBER && newNode.right === undefined) {
      return newNode.left;
    }

    return newNode;
  }

  if (node.type === NODE_EXPONENT) {
    return { ...node, base: _replaceNode(node.base, targetId), exponent: _replaceNode(node.exponent, targetId) };
  }

  if (node.type === NODE_UNARY_MINUS) {
    return { ...node, operand: _replaceNode(node.operand, targetId) };
  }

  return node;
}

// After replacing a node, if a parenthesized group now contains only a number, dissolve it.
export function simplifyParens(node) {
  if (!node) return node;

  if (node.type === NODE_BINOP) {
    node.left = simplifyParens(node.left);
    node.right = simplifyParens(node.right);

    // If this node is parenthesized and evaluates to node with both sides being numbers
    // after the operation was replaced, check if it's now a single number
    if (node.parenthesized && node.type === NODE_BINOP) {
      // not yet fully simplified, keep going
    }
  } else if (node.type === NODE_EXPONENT) {
    node.base = simplifyParens(node.base);
    node.exponent = simplifyParens(node.exponent);
  } else if (node.type === NODE_UNARY_MINUS) {
    node.operand = simplifyParens(node.operand);
  }

  return node;
}

// ─── Check if AST is fully simplified (single number) ────────
export function isFullySimplified(node) {
  return node && node.type === NODE_NUMBER;
}

// ─── Check if left-to-right arrow should be shown ────────────
// Show arrow when M/D or A/S operations coexist at the same level in the current scope.
export function shouldShowArrow(ast, scopeNodeId) {
  let scope = ast;
  if (scopeNodeId !== null) {
    scope = findNodeById(ast, scopeNodeId);
  }
  if (!scope) return false;

  const ops = getOperationsInScope(scope);
  // Filter out ops inside sub-parens
  const subParens = getParenGroups(scope, 0).filter(g => g.id !== scope.id);
  const opsAtLevel = ops.filter(o => {
    for (const pg of subParens) {
      if (findNodeById(pg.node, o.nodeId)) return false;
    }
    return true;
  });

  const opTypes = new Set(opsAtLevel.map(o => o.op));

  // Find the highest priority available
  let highestPriority = Infinity;
  for (const o of opsAtLevel) {
    const p = PEMDAS_PRIORITY[o.op];
    if (p < highestPriority) highestPriority = p;
  }

  // Check if the highest priority level has both ops (M&D or A&S)
  const highestOps = opsAtLevel.filter(o => PEMDAS_PRIORITY[o.op] === highestPriority);
  const highestOpTypes = new Set(highestOps.map(o => o.op));

  if ((highestOpTypes.has('*') && highestOpTypes.has('/')) ||
      (highestOpTypes.has('+') && highestOpTypes.has('-'))) {
    return true;
  }

  return false;
}

// ─── Get all node IDs in a scope (for highlighting) ──────────
export function getNodeIdsInScope(node) {
  if (!node) return [];
  const ids = [node.id];

  if (node.type === NODE_BINOP) {
    ids.push(...getNodeIdsInScope(node.left));
    ids.push(...getNodeIdsInScope(node.right));
  } else if (node.type === NODE_EXPONENT) {
    ids.push(...getNodeIdsInScope(node.base));
    ids.push(...getNodeIdsInScope(node.exponent));
  } else if (node.type === NODE_UNARY_MINUS) {
    ids.push(...getNodeIdsInScope(node.operand));
  }

  return ids;
}

// ─── Stringify AST (for debugging) ───────────────────────────
export function astToString(node) {
  if (!node) return '';
  if (node.type === NODE_NUMBER) return String(node.value);
  if (node.type === NODE_UNARY_MINUS) return `-${astToString(node.operand)}`;
  if (node.type === NODE_EXPONENT) {
    const s = `${astToString(node.base)} ^ ${astToString(node.exponent)}`;
    return node.parenthesized ? `(${s})` : s;
  }
  if (node.type === NODE_BINOP) {
    const s = `${astToString(node.left)} ${node.op} ${astToString(node.right)}`;
    return node.parenthesized ? `(${s})` : s;
  }
  return '';
}

// ─── Get the tokens that belong to a specific operation ──────
// For flash red/green effect — returns the nodeIds of the left operand, operator, and right operand
export function getOperationTokenIds(node) {
  if (!node) return [];
  if (node.type === NODE_BINOP) {
    const leftIds = getAllDescendantIds(node.left);
    const rightIds = getAllDescendantIds(node.right);
    return { leftIds, rightIds, opId: node.id, allIds: [...leftIds, node.id, ...rightIds] };
  }
  if (node.type === NODE_EXPONENT) {
    const baseIds = getAllDescendantIds(node.base);
    const expIds = getAllDescendantIds(node.exponent);
    return { leftIds: baseIds, rightIds: expIds, opId: node.id, allIds: [...baseIds, node.id, ...expIds] };
  }
  return { leftIds: [], rightIds: [], opId: node.id, allIds: [node.id] };
}

function getAllDescendantIds(node) {
  if (!node) return [];
  const ids = [node.id];
  if (node.type === NODE_BINOP) {
    ids.push(...getAllDescendantIds(node.left));
    ids.push(...getAllDescendantIds(node.right));
  } else if (node.type === NODE_EXPONENT) {
    ids.push(...getAllDescendantIds(node.base));
    ids.push(...getAllDescendantIds(node.exponent));
  } else if (node.type === NODE_UNARY_MINUS) {
    ids.push(...getAllDescendantIds(node.operand));
  }
  return ids;
}

// ─── Find wrong flash targets ────────────────────────────────
// When a wrong operation is pressed, determine which tokens to flash red.
// E.g., pressing D in scope (6 / (8-3*2) * (20+4*5) - 1) flashes "6 /"
export function getWrongFlashTargets(ast, scopeNodeId, pemdasKey) {
  let scope = ast;
  if (scopeNodeId !== null) {
    scope = findNodeById(ast, scopeNodeId);
  }
  if (!scope) return [];

  const targetOps = PEMDAS_TO_OPS[pemdasKey];
  if (!targetOps) return [];

  // Find operations of this type in scope (not inside sub-parens)
  const opsInScope = getOperationsInScope(scope);
  const subParens = getParenGroups(scope, 0).filter(g => g.id !== scope.id);
  const opsAtLevel = opsInScope.filter(o => {
    for (const pg of subParens) {
      if (findNodeById(pg.node, o.nodeId)) return false;
    }
    return true;
  });

  const matching = opsAtLevel.filter(o => targetOps.includes(o.op));
  if (matching.length === 0) return [];

  // Return the first matching operation's token IDs
  const first = matching[0];
  return getOperationTokenIds(first.node);
}
