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
