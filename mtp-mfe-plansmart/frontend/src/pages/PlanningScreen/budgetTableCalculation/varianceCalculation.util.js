import { isNaN, isUndefined, round } from "lodash";
import numberValidation from "./common/numberValidation.util";

export default function (
  currentData,
  versionData,
  fixTo,
  rowVariance,
  pointVarianceList
) {
  const validCurrentData =
    isNaN(currentData) || isUndefined(currentData) ? 0 : currentData;
  const validVersionData =
    isNaN(versionData) || isUndefined(versionData) ? 0 : versionData;

  if (pointVarianceList.includes(rowVariance)) {
    const varianceValue =
      parseFloat(validCurrentData) - parseFloat(validVersionData);
    return numberValidation(varianceValue);
  }

  // below  conditions are for the situation when ly is 0 and wp is not 0, here we return var as 100
  // here we use round when fixto is 0 as as user is shown 0 instead of the whole number
  // for eg. original value is 0.9080 but user is show 0, and so the same is used for the below conditions
  if (
    Number(validCurrentData?.toFixed(fixTo)) === 0 &&
    Number(validVersionData?.toFixed(fixTo)) === 0
  ) {
    return 0;
  }
  if (
    Number(validCurrentData?.toFixed(fixTo)) !== 0 &&
    Number(validVersionData?.toFixed(fixTo)) === 0
  ) {
    return 100;
  }
  const calculatedValue =
    ((parseFloat(validCurrentData) - parseFloat(validVersionData)) /
      parseFloat(validVersionData)) *
    100;
  return numberValidation(calculatedValue);
}
