import React from "react";
import { CSVLink } from "react-csv";
import { cloneDeep } from "lodash";

export const downloadExcelLink = (
  data,
  name,
  link,
  headerList,
  getHeadersForExcel,
  getDataForExcel,
  shouldParseValue = false,
  shouldEscapeCharacterReplace = false
) => {
  let dataClone = getDataForExcel ? getDataForExcel(data) : cloneDeep(data),
    //if data mapping function is there call the fuction else take the data
    headers = getHeadersForExcel ? getHeadersForExcel() : headerList;
  //if getHeadersForExcel fuction is there call the function else take the headerList

  // To avoid 'E' in case of Long Integer in Excel sheet
  dataClone?.forEach((data) => {
    data &&
      Object.keys(data)?.map((key) => {
        if (typeof data[key] === "string" && shouldParseValue) {
          data[key] = `=""${data[key]}""`;
        }
      });
  });

  // Removing undefined or null object
  dataClone = dataClone.filter((data) => data);

  // To check if there is \" present in data
  function replaceEscapeCharacter(data) {
    if (data.includes('"')) {
      return data.replace(/"/g, '""');
    }
    return data;
  }
  if (shouldEscapeCharacterReplace) {
    dataClone?.forEach((data) => {
      data &&
        Object.keys(data)?.map((key) => {
          if (typeof data[key] === "string") {
            let updatedData = replaceEscapeCharacter(data[key]);
            if (updatedData !== data[key]) data[key] = updatedData;
          }
        });
    });
  }

  return (
    <CSVLink
      data={dataClone}
      headers={headers}
      filename={`${name}.csv`}
      className="hidden"
      ref={link}
    />
  );
};
