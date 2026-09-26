import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";

export const getFormattedDataForDownload = (dataResponse) => {
  const data = cloneDeep(dataResponse);
  let formattedData = agGridRowFormatter(data);
  formattedData = formattedData.map((obj) =>
    Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        typeof value === "string" ? replaceSpecialCharacter(value) : value,
      ])
    )
  );
  return formattedData;
};
