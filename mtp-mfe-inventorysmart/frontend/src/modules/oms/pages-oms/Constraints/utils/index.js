export const getValidCheckConfiguration = (checkConfiguration) => {
  let validCheckConfiguration = [];
  if (Array.isArray(checkConfiguration)) {
    validCheckConfiguration = checkConfiguration.filter(
      (item) => item !== null && item !== undefined
    );
  }
  if (validCheckConfiguration.length === 0) return [];
  else return validCheckConfiguration;
};
