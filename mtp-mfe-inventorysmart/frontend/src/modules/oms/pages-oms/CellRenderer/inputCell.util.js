export const numberFormatter = (value = "", roundToDigits = null) => {
  const strNumber = String(value).replace(/[^\d.-\s]/g, "");
  let num = !isNaN(Number(strNumber)) ? Number(strNumber) : 0;
  if (roundToDigits !== null && typeof roundToDigits === "number" && !isNaN(num)) {
    num = Number(num.toFixed(roundToDigits));
  }
  return num;
};

export const getRoundedStringForEditing = (val, digits) => {
  const strNumber = String(val).replace(/[^\d.-\s]/g, "");
  let num = !isNaN(Number(strNumber)) ? Number(strNumber) : 0;
  if (typeof digits === "number" && digits >= 0) {
    try { return num.toFixed(digits); } catch (e) { return String(num); }
  }
  return String(num);
};
