import { get } from "lodash";

const getColumnMaps = (columnMaps, removeFunctions) => {
  const newColumnMaps = {};
  Object.keys(columnMaps).forEach((columnKey) => {
    const userProvidedColDef = get(
      columnMaps,
      [columnKey, "userProvidedColDef"],
      {}
    );
    if (Array.isArray(userProvidedColDef?.extra)) {
      userProvidedColDef.extra = get(userProvidedColDef, "extra[0]", {});
    }
    newColumnMaps[columnKey] = userProvidedColDef;
  });
  if (removeFunctions) {
    const convertToString = JSON.stringify(newColumnMaps);
    return JSON.parse(convertToString);
  }
  return newColumnMaps;
};

export default getColumnMaps;
