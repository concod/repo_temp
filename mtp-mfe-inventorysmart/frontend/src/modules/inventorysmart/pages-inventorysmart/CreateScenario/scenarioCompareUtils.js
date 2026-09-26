export const ALLOCATION_COMPARE_CODE_COUNT = 2;

const stripCurlyBraces = (value) => {
  if (value == null) {
    return value;
  }
  return String(value).replace(/[{}]/g, "").trim();
};

const stripWrapperBraces = (value) => {
  const trimmed = String(value).trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

export const parseAllocationCodesFromQuery = (allocationCodeParam) => {
  if (!allocationCodeParam || typeof allocationCodeParam !== "string") {
    return [];
  }
  return stripWrapperBraces(allocationCodeParam)
    .split(",")
    .map((code) => stripCurlyBraces(code))
    .filter(Boolean);
};

export const isAllocationCompareCodes = (codes) =>
  Array.isArray(codes) && codes.length === ALLOCATION_COMPARE_CODE_COUNT;

export const isInvalidAllocationCompareCodes = (codes) =>
  Array.isArray(codes) && codes.length > ALLOCATION_COMPARE_CODE_COUNT;

export const shouldFetchScenarioRecommendation = ({
  scenarioId,
  compareCodes,
}) => Boolean(scenarioId) || isAllocationCompareCodes(compareCodes);

export const buildScenarioSimBody = ({
  scenarioId,
  compareCodes,
  extra = {},
}) => {
  if (isAllocationCompareCodes(compareCodes)) {
    return {
      allocation_code_1: stripCurlyBraces(compareCodes[0]),
      allocation_code_2: stripCurlyBraces(compareCodes[1]),
      ...extra,
    };
  }
  return {
    scenario_id: scenarioId,
    ...extra,
  };
};
