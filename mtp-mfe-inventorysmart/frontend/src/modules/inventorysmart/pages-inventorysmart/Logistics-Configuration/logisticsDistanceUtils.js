let distanceRangeIdCounter = 0;

export const createDistanceRangeId = () => {
  distanceRangeIdCounter += 1;
  return `distance-range-${distanceRangeIdCounter}`;
};

export const isDistanceFieldFilled = (value) =>
  value !== "" && value !== null && value !== undefined;

export const parseDistanceNumber = (value) => {
  if (!isDistanceFieldFilled(value)) {
    return null;
  }
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const distanceRangeHasData = (range) =>
  isDistanceFieldFilled(range.to) || isDistanceFieldFilled(range.value);

export const hasDistanceRowsBelowWithData = (ranges, index) =>
  ranges.slice(index + 1).some(distanceRangeHasData);

export const canEditDistanceToValue = (ranges, index) =>
  !hasDistanceRowsBelowWithData(ranges, index);

export const isDistanceToLessThanFrom = (from, to) => {
  const fromNum = parseDistanceNumber(from);
  const toNum = parseDistanceNumber(to);

  if (fromNum === null || toNum === null) {
    return false;
  }

  return toNum < fromNum;
};

export const canAddDistanceRange = (ranges) => {
  if (!ranges.length) {
    return true;
  }

  const lastRange = ranges[ranges.length - 1];
  return (
    isDistanceFieldFilled(lastRange.from) && isDistanceFieldFilled(lastRange.to)
  );
};

export const getNextDistanceFromValue = (ranges) => {
  if (!ranges.length) {
    return "0";
  }

  const lastTo = parseDistanceNumber(ranges[ranges.length - 1].to);
  if (lastTo === null) {
    return "";
  }

  return String(lastTo + 1);
};

export const createDistanceRange = (fromValue) => ({
  id: createDistanceRangeId(),
  from: fromValue,
  to: "",
  value: "",
});

export const buildDistanceRangesFromRules = (rules, getRuleValue) =>
  (rules || []).map((rule, index) => ({
    id: `distance-range-${index}`,
    from:
      rule.min_km != null && rule.min_km !== ""
        ? String(rule.min_km)
        : index === 0
        ? "0"
        : "",
    to: rule.max_km != null ? String(rule.max_km) : "",
    value: getRuleValue(rule) !== "" ? String(getRuleValue(rule)) : "",
  }));

export const recalculateDistanceFromValues = (ranges) => {
  if (!ranges.length) {
    return ranges;
  }

  return ranges.map((range, index) => {
    if (index === 0) {
      return { ...range, from: "0" };
    }

    const previousTo = parseDistanceNumber(ranges[index - 1].to);
    return {
      ...range,
      from: previousTo === null ? "" : String(previousTo + 1),
    };
  });
};

export const updateDistanceRangeAtIndex = (ranges, index, field, value) => {
  const nextRanges = ranges.map((range, rangeIndex) =>
    rangeIndex === index ? { ...range, [field]: value } : range
  );

  if (field === "to") {
    return recalculateDistanceFromValues(nextRanges);
  }

  return nextRanges;
};

export const removeDistanceRangeAtIndex = (ranges, index) =>
  recalculateDistanceFromValues(ranges.filter((_, rangeIndex) => rangeIndex !== index));
