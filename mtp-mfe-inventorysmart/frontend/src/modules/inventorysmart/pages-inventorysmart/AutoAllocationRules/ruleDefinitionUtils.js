export const validateRuleDefinition = (definition, existingRuleNames = []) => {
  const def = definition || "";

  // Check 0: Expression cannot be blank
  if (!def.trim()) {
    return {
      valid: false,
      message: "Rule Definition cannot be blank.",
    };
  }

  // Check 1: Validate operator casing - only uppercase AND/OR allowed
  // This prevents lowercase operators like "and", "or" which could cause confusion
  const anyAndOr = def.match(/\b(and|or)\b/gi) || [];
  const incorrectCase = anyAndOr.some((m) => m !== m.toUpperCase());
  if (incorrectCase) {
    return {
      valid: false,
      message: "Use uppercase operators: AND / OR only.",
    };
  }

  // Check 2: Prevent consecutive operators - no "AND AND" or "OR OR" patterns
  // This ensures proper grammar: each operator must be followed by an operand
  if (/\b(AND|OR)\b\s+\b(AND|OR)\b/.test(def)) {
    return {
      valid: false,
      message: "Only one operator allowed between rules.",
    };
  }

  // Check 3: Validate balanced parentheses - every opening ( must have closing )
  // This prevents malformed expressions like "(Set Auto Approve" or "Set CutOff WOS)"
  if (!hasBalancedParentheses(def)) {
    return {
      valid: false,
      message: "Unbalanced parentheses in Rule Definition.",
    };
  }

  // Check 3a: Detect empty parentheses
  // Valid: "(Rule A) AND (Rule B)" | Invalid: "() AND (Rule B)" or "(Rule A) AND ()"
  if (/\(\s*\)/.test(def)) {
    return {
      valid: false,
      message: "Empty parentheses are not allowed.",
    };
  }

  const trimmed = def.trim();

  // Check 4: Operators cannot start or end the expression
  // Valid: "(Rule A) AND (Rule B)" | Invalid: "AND (Rule A) AND (Rule B)" or "(Rule A) AND (Rule B) AND"
  if (/^(AND|OR)\b/.test(trimmed) || /\b(AND|OR)$/.test(trimmed)) {
    return {
      valid: false,
      message: "Operators cannot be at the beginning or the end.",
    };
  }

  // Check 5: Detect missing operators between rule groups
  // Valid: "(Rule A) AND (Rule B)" | Invalid: "(Rule A)(Rule B)" - missing operator
  if (/\)\s*\(/.test(def)) {
    return { valid: false, message: "Add an operator between rule groups." };
  }

  // Check 6: Ensure proper spacing around operators
  // Valid: ") AND (" | Invalid: ")AND(" or ") AND(" - operators need spaces
  if (/\S(AND|OR)\b|\b(AND|OR)\S/.test(def)) {
    return {
      valid: false,
      message: 'Place spaces around operators (e.g., ") AND (" ).',
    };
  }

  // Check 6a: Validate that all rule names mentioned exist in the current configuration
  // This prevents references to non-existent rules and random text
  // Running this check BEFORE structural validation to catch invalid rule names early
  if (existingRuleNames && existingRuleNames.length > 0) {
    const totalRules = existingRuleNames.length;
    
    // Create a list of valid rule identifiers: both "Rule X" format and actual rule names
    const validRuleIds = [];
    for (let i = 1; i <= totalRules; i++) {
      validRuleIds.push(`Rule ${i}`);
    }
    const allValidRules = [...validRuleIds, ...existingRuleNames];
    
    // Extract all content inside parentheses and also standalone rule references
    const ruleMatches = def.match(/\(([^)]+)\)/g) || [];
    const mentionedRules = ruleMatches.map((match) =>
      match.replace(/[()]/g, "").trim()
    );
    
    // Also check for rule references without parentheses (e.g., "Rule 1 AND Rule 2")
    // Split by operators and extract rule names
    const parts = def.split(/\s+(AND|OR)\s+/);
    for (const part of parts) {
      const trimmedPart = part.trim();
      // Skip operators
      if (trimmedPart !== "AND" && trimmedPart !== "OR" && trimmedPart) {
        // Remove parentheses if present
        const ruleName = trimmedPart.replace(/[()]/g, "").trim();
        if (ruleName && !mentionedRules.includes(ruleName)) {
          mentionedRules.push(ruleName);
        }
      }
    }

    // Check if each mentioned rule is valid
    const invalidRules = mentionedRules.filter(
      (ruleName) => !allValidRules.includes(ruleName)
    );

    if (invalidRules.length > 0) {
      return {
        valid: false,
        message: `Rule(s) not found in configuration: ${invalidRules.join(", ")}.`,
      };
    }
  }

  // Check 7: Advanced structural validation using Abstract Syntax Tree (AST)-like pattern matching
  // This converts the complex rule definition into a simplified pattern and validates grammar
  let tmp = def;

  // Step 7a: Recursively collapse all parenthesized groups into "RULE" tokens
  // Example: "(Set Auto Approve) AND (Set CutOff WOS)" becomes "RULE AND RULE"
  const groupRegex = /\(([^()]+)\)/g;
  let guard = 0;
  while (groupRegex.test(tmp) && guard < 50) {
    tmp = tmp.replace(groupRegex, (fullMatch, inner) => {
      // Validate inside each group has no consecutive operators
      if (/\b(AND|OR)\b\s+\b(AND|OR)\b/.test(inner)) return fullMatch; // leave as-is, will fail later
      return "RULE";
    });
    guard++;
  }

  // Step 7b: Normalize whitespace and replace remaining rule names with "RULE"
  // Example: "Set Auto Approve AND Set CutOff WOS" becomes "RULE AND RULE"
  tmp = tmp.replace(/\s+/g, " ").trim();
  tmp = tmp.replace(/\b[^()\s]+(?:\s+[^()\s]+)*\b/g, (matchedToken) =>
    matchedToken === "RULE" || /^(AND|OR)$/.test(matchedToken)
      ? matchedToken
      : "RULE"
  );

  // Step 7c: Final validation - check for consecutive operators in simplified pattern
  const invalidDoubleOp = /\b(AND|OR)\b\s*\b(AND|OR)\b/.test(tmp);
  if (invalidDoubleOp) {
    return {
      valid: false,
      message: "Only one operator allowed between rules.",
    };
  }

  // Step 7d: Validate final pattern matches expected grammar: RULE [operator RULE]*
  // Valid patterns: "RULE", "RULE AND RULE", "RULE AND RULE OR RULE"
  // Invalid patterns: "AND RULE", "RULE AND", "RULEAND RULE"
  const validPattern = /^RULE(\s+(AND|OR)\s+RULE)*$/;
  if (!validPattern.test(tmp)) {
    return {
      valid: false,
      message:
        "Invalid Rule Definition structure. Ensure exactly one operator with spaces between rules.",
    };
  }

  return { valid: true };
};

/**
 * Validates that parentheses are properly balanced in the text
 * @param {string} text - The text to validate
 * @returns {boolean} - True if parentheses are balanced, false otherwise
 *
 * Examples:
 * - Balanced: "(Rule A) AND (Rule B)" -> true
 * - Unbalanced: "(Rule A" -> false (missing closing)
 * - Unbalanced: "Rule A)" -> false (missing opening)
 * - Unbalanced: "(Rule A))" -> false (extra closing)
 */
const hasBalancedParentheses = (text) => {
  let depth = 0;
  for (let idx = 0; idx < text.length; idx++) {
    if (text[idx] === "(") depth++;
    else if (text[idx] === ")") {
      depth--;
      if (depth < 0) return false; // More closing than opening parentheses
    }
  }
  return depth === 0; // All parentheses must be closed
};

// ===== Abstract Syntax Tree (AST) utilities for ruleDefinition (AND/OR with parentheses) =====

/**
 * Represents a node in the Abstract Syntax Tree for rule expressions
 * Each node can be either an operator (AND/OR) or an operand (rule name)
 */
class AstNode {
  constructor(value, left = null, right = null) {
    this.value = value; // 'AND' | 'OR' | rule name string
    this.left = left; // Left child node (for binary operators)
    this.right = right; // Right child node (for binary operators)
  }
}

/**
 * Tokenizes a rule definition string into an array of tokens
 * Converts "(Set Auto Approve) AND (Set CutOff WOS)" into structured tokens
 * @param {string} def - The rule definition string to tokenize
 * @returns {Array} Array of token objects with type and value properties
 *
 * Token types:
 * - LPAREN: Opening parenthesis "("
 * - RPAREN: Closing parenthesis ")"
 * - OP: Operator "AND" or "OR"
 * - OPERAND: Rule name or other operand text
 */
const tokenizeRuleDefinition = (def) => {
  const tokens = [];
  let currentPosition = 0;

  while (currentPosition < def.length) {
    const currentChar = def[currentPosition];

    // Skip whitespace characters
    if (/\s/.test(currentChar)) {
      currentPosition++;
      continue;
    }

    // Handle opening parenthesis
    if (currentChar === "(") {
      tokens.push({ type: "LPAREN", value: "(" });
      currentPosition++;
      continue;
    }

    // Handle closing parenthesis
    if (currentChar === ")") {
      tokens.push({ type: "RPAREN", value: ")" });
      currentPosition++;
      continue;
    }

    // Check for AND operator (must be at word boundary)
    const remainingText = def.slice(currentPosition);
    if (remainingText.startsWith("AND")) {
      tokens.push({ type: "OP", value: "AND" });
      currentPosition += 3; // Move past "AND"
      continue;
    }

    // Check for OR operator (must be at word boundary)
    if (remainingText.startsWith("OR")) {
      tokens.push({ type: "OP", value: "OR" });
      currentPosition += 2; // Move past "OR"
      continue;
    }

    // Handle operands: read until next parenthesis or operator
    let operandEndPosition = currentPosition;
    while (
      operandEndPosition < def.length &&
      def[operandEndPosition] !== "(" &&
      def[operandEndPosition] !== ")" &&
      !def.slice(operandEndPosition).startsWith("AND") &&
      !def.slice(operandEndPosition).startsWith("OR")
    ) {
      operandEndPosition++;
    }

    const operandText = def.slice(currentPosition, operandEndPosition).trim();
    if (operandText) {
      tokens.push({ type: "OPERAND", value: operandText });
    }
    currentPosition = operandEndPosition;
  }
  return tokens;
};

/**
 * Builds an Abstract Syntax Tree from tokenized rule definition
 * Uses the Shunting Yard algorithm to handle operator precedence and parentheses
 * @param {Array} tokens - Array of tokenized rule definition
 * @returns {AstNode} Root node of the constructed AST
 * @throws {Error} If parentheses are mismatched or expression is invalid
 *
 * Algorithm:
 * 1. Process each token in order
 * 2. Handle operands by creating leaf nodes
 * 3. Handle operators with precedence (AND > OR)
 * 4. Handle parentheses for grouping
 * 5. Build tree respecting operator precedence
 */
const buildAstFromTokens = (tokens) => {
  // Operator precedence: higher number = higher precedence
  const precedence = { OR: 1, AND: 2 };
  const operatorStack = []; // Stack for operators and parentheses
  const valueStack = []; // Stack for operand values

  /**
   * Applies the top operator from operatorStack to the top two values from valueStack
   * Creates a new AST node with the operator and its operands
   */
  const applyOperator = () => {
    const operatorToken = operatorStack.pop();
    const rightOperand = valueStack.pop();
    const leftOperand = valueStack.pop();
    valueStack.push(
      new AstNode(operatorToken.value, leftOperand, rightOperand)
    );
  };

  // Process each token in the tokenized expression
  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
    const currentToken = tokens[tokenIndex];

    if (currentToken.type === "OPERAND") {
      // Create leaf node for operand and push to value stack
      valueStack.push(new AstNode(currentToken.value));
    } else if (currentToken.type === "OP") {
      // Handle operator precedence: apply higher precedence operators first
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1].type === "OP" &&
        precedence[operatorStack[operatorStack.length - 1].value] >=
          precedence[currentToken.value]
      ) {
        applyOperator();
      }
      operatorStack.push(currentToken);
    } else if (currentToken.type === "LPAREN") {
      // Push opening parenthesis to operator stack
      operatorStack.push(currentToken);
    } else if (currentToken.type === "RPAREN") {
      // Process all operators until matching opening parenthesis
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1].type !== "LPAREN"
      ) {
        applyOperator();
      }
      if (operatorStack.length === 0) throw new Error("Mismatched parentheses");
      operatorStack.pop(); // Remove the matching LPAREN
    }
  }

  // Apply any remaining operators
  while (operatorStack.length > 0) {
    if (operatorStack[operatorStack.length - 1].type === "LPAREN") {
      throw new Error("Mismatched parentheses");
    }
    applyOperator();
  }

  // Validate final result: should have exactly one value (the root of the AST)
  if (valueStack.length !== 1) throw new Error("Invalid expression");
  return valueStack[0];
};

/**
 * Parses a rule definition string into an Abstract Syntax Tree
 * This is the main entry point for converting rule expressions to AST
 * @param {string} definition - The rule definition string to parse
 * @returns {AstNode|null} Root node of the AST, or null if empty/invalid
 *
 * Example:
 * Input: "(Set Auto Approve) AND (Set CutOff WOS)"
 * Output: AST with AND as root, left child "Set Auto Approve", right child "Set CutOff WOS"
 */
export const parseExpression = (definition) => {
  // Step 1: Tokenize the expression into structured tokens
  const tokens = tokenizeRuleDefinition(definition);
  if (!tokens || tokens.length === 0) return null;

  // Step 2: Build AST from tokens using Shunting Yard algorithm
  return buildAstFromTokens(tokens);
};

/**
 * Performs a preorder traversal of the AST to create prefix notation
 * Visits root first, then left subtree, then right subtree
 * @param {AstNode} node - The current node in the traversal
 * @param {Array} result - Array to store the traversal result
 *
 * Example:
 * AST: AND(Set Auto Approve, Set CutOff WOS)
 * Result: ["AND", "Set Auto Approve", "Set CutOff WOS"]
 */
export const preorderTraversal = (node, result) => {
  if (!node) return;

  // Visit current node (root first in preorder)
  result.push(node.value);

  // Recursively traverse left subtree
  preorderTraversal(node.left, result);

  // Recursively traverse right subtree
  preorderTraversal(node.right, result);
};

/**
 * Converts an AST array (prefix notation) back to a readable string format
 * Rebuilds the AST tree from prefix array, then performs inorder traversal
 * @param {Array} astArray - The AST array in prefix notation (e.g., ["OR", "AND", "Rule1", "Rule2", "Rule3"])
 * @returns {string} The reconstructed readable expression string
 *
 * Example:
 * Input: ["OR", "AND", "Set Minimum DC Inventory", "Set CutOff WOS", "Set WOS Threshold"]
 * Output: "((Set Minimum DC Inventory) AND (Set CutOff WOS)) OR (Set WOS Threshold)"
 */
export const convertAstToString = (astArray) => {
  if (!astArray || astArray.length === 0) return "";

  let position = 0; // Track position in prefix array

  /**
   * Recursively builds AST tree from prefix notation array
   * Returns the root node of the tree
   */
  const buildTreeFromPrefix = () => {
    if (position >= astArray.length) return null;

    const currentToken = astArray[position];
    position++;

    if (currentToken === "AND" || currentToken === "OR") {
      // Operator node: build left and right subtrees
      const leftChild = buildTreeFromPrefix();
      const rightChild = buildTreeFromPrefix();
      return new AstNode(currentToken, leftChild, rightChild);
    } else {
      // Leaf node: rule name
      return new AstNode(currentToken);
    }
  };

  /**
   * Performs inorder traversal to convert AST to readable string
   * Visits left subtree, then root, then right subtree
   */
  const inorderToString = (node) => {
    if (!node) return "";

    // If it's a leaf node (rule name), return it directly
    if (!node.left && !node.right) {
      return node.value;
    }

    // If it's an operator node, wrap children in parentheses
    const leftStr = inorderToString(node.left);
    const rightStr = inorderToString(node.right);

    return `(${leftStr}) ${node.value} (${rightStr})`;
  };

  // Build the AST tree from prefix array
  const rootNode = buildTreeFromPrefix();

  // Convert tree to string using inorder traversal
  return rootNode ? inorderToString(rootNode) : "";
};

/**
 * Extracts operators from a rule definition string and maps them to rule indices
 * Parses the string directly to find operators and their positions
 * @param {string} ruleDefinition - The rule definition string
 * @param {Array} ruleNames - Array of rule names in order
 * @returns {Object} Object mapping rule indices to their operators
 *
 * Example:
 * Input: ruleDefinition = "((Set Minimum DC Inventory) OR (Set CutOff WOS)) AND ((Set WOS Threshold) OR (Triggered if MinStock not satisfied))"
 * Output: {2: "OR", 3: "AND", 4: "OR"} (Rule 2 uses OR, Rule 3 uses AND, Rule 4 uses OR)
 */
export const extractOperatorsFromAst = (
  ruleDefinition,
  ruleNames,
  excludedRulesInDefinition
) => {
  if (
    !ruleDefinition ||
    !ruleNames ||
    ruleDefinition.length === 0 ||
    ruleNames.length === 0
  ) {
    return {};
  }

  const operatorsByIndex = {};

  // Find all operators in the string with their positions
  const operatorMatches = [];
  const operatorRegex = /\b(AND|OR)\b/g;
  let match;

  while ((match = operatorRegex.exec(ruleDefinition)) !== null) {
    operatorMatches.push({
      operator: match[1],
      position: match.index,
    });
  }

  let excludedRulesCount = 0;

  // For each rule (except the first one), find the operator that comes after it
  for (let ruleIndex = 0; ruleIndex < ruleNames.length; ruleIndex++) {
    if (excludedRulesInDefinition.includes(ruleNames[ruleIndex])) {
      excludedRulesCount++;
      continue;
    }
    const ruleName = ruleNames[ruleIndex];

    // Find the position of this rule in the string
    const rulePosition = ruleDefinition.indexOf(`(${ruleName})`);
    if (rulePosition === -1) continue;

    // Find the operator that comes after this rule
    const ruleEndPosition = rulePosition + `(${ruleName})`.length;

    // Look for the next operator after this rule
    for (const operatorMatch of operatorMatches) {
      if (operatorMatch.position > ruleEndPosition) {
        operatorsByIndex[ruleIndex + 1 + excludedRulesCount] =
          operatorMatch.operator; // Convert to 1-based index
        break; // Found the first operator after this rule
      }
    }
  }

  return operatorsByIndex;
};
