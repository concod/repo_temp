import { isNaN, isUndefined } from "lodash";

export default function (value) {
  const isFloat = (number) => {
    return Number(number) === number && number % 1 !== 0;
  };

  if (
    isUndefined(value) ||
    isNaN(value) ||
    value === Infinity ||
    value === -Infinity ||
    value === ""
  ) {
    return 0;
  } else if (typeof value === "string") {
    const validatedValue = eval(value);
    if (
      validatedValue === Infinity ||
      validatedValue === null ||
      validatedValue === -Infinity ||
      validatedValue === 0 ||
      isNaN(validatedValue)
    ) {
      return 0;
    }
    return validatedValue;
  } else if (value === 0) return 0;
  else if (isFloat(value)) {
    const formattedValue = Number(value.toFixed(4));
    return formattedValue === -0 ? Math.abs(formattedValue) : formattedValue;
  }
  return value;
}
