import { dataParser } from "core/Utils/formatter";

export const getComparePlanTableFooter = (tableData, columnData) => {
  let totalObj = {},
    tot_receipt = 0,
    result = 0,
    tot_attr = 0;
  columnData.forEach((col) => {
    if (col.sub_headers) {
      col.sub_headers.forEach((sub_col) => {
        let planIndex = sub_col.column_name.split("_plan");
        let columnName = sub_col.column_name;
        if (sub_col.footer === "formula") {
          let rcptsKey =
            planIndex?.length > 1
              ? "receipt_plan" + planIndex[1]
              : "receipt_ly";
          tot_receipt = 0;
          tableData.forEach((data) => {
            tot_receipt += dataParser("float", data[rcptsKey]);
          });
          tot_attr = 0;
          tableData.forEach((data) => {
            tot_attr +=
              dataParser("float", data[columnName]) *
              dataParser("float", data[rcptsKey]);
          });
          tot_attr = tot_attr / tot_receipt;
          totalObj[sub_col.column_name] = tot_attr;
        } else if (sub_col.footer === "sum") {
          result = 0;
          tableData.forEach((data) => {
            result += data[sub_col.column_name];
          });
          totalObj[sub_col.column_name] = result;
        }
      });
    }
  });
  return totalObj;
};
