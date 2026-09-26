import { FORBIDDEN_LOGICAL_OPERATORS } from "./constants";
/**
 *
 * @param {string} pseudocode
 * @param {list of subrule objects} subrules
 * @returns boolean true/false
 *
 * Function is used to check if all the subrules that were included
 * are valid or not. If it is not valid it throws an error saying
 * it is invalid definition
 */
export const pseudocodeValidation = (pseudocode, subrules) => {
  const re = /\b(?!(?:OR|AND))\w+/g;
  const extractedSubRulesFromDefn = [];
  let match = null;
  do {
    match = re.exec(pseudocode);
    if (match) {
      extractedSubRulesFromDefn.push(match[0]);
    }
  } while (match);
  for (let subrule of subrules) {
    if (
      !extractedSubRulesFromDefn.some(
        (extractedSubRule) => extractedSubRule === subrule.name
      )
    ) {
      return false;
    }
  }
  return true;
};

export const getPromptStatus = (condition, loc) => {
  const message = `Are you sure you want to go to ${loc.pathname}?`;
  if (condition) {
    return message;
  }
  return true;
};

const areParenthesesBalanced = (query) => {
  const stack = [];

  const parenthesesMap = {
    "(": ")",
    "[": "]",
    "{": "}",
  };

  for (const char of query) {
    if (["(", "[", "{"].includes(char)) {
      stack.push(char);
    } else if ([")", "]", "}"].includes(char)) {
      if (stack.length === 0 || parenthesesMap[stack.pop()] !== char) {
        return false; // Unbalanced or mismatched parentheses
      }
    }
  }
  return stack.length === 0; // Stack should be empty for balanced parentheses
};

const areAllSubrulesIncluded = (query, subrules) => {
  const wordsInQuery = query.match(/\b\w+\b/g) || []; // Extract whole words from the query
  const lowerWordsInQuery = wordsInQuery.map((word) => word.toLowerCase());
  return subrules.every((subrule) =>
    lowerWordsInQuery.includes(subrule.name.toLowerCase())
  );
};
export const isValidQuery = (query, subrules) => {
  // Check if parentheses are balanced
  if (!areParenthesesBalanced(query)) {
    return false;
  }

  // Check for forbidden operators
  const forbiddenOperators = query
    ?.split(" ")
    ?.filter((word) => FORBIDDEN_LOGICAL_OPERATORS.has(word.toUpperCase()));
  if (forbiddenOperators.length > 0) {
    console.error(
      `Forbidden operators found: ${forbiddenOperators.join(", ")}`
    );
    return false;
  }

  // Check if all subrules are included
  return areAllSubrulesIncluded(query, subrules);
};
