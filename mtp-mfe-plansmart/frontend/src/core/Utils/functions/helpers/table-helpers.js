import React from "react";
import { dataParser } from "core/Utils/formatter/index";

/**
 * Add table related helper function here
 */

//React table Footer function

export const getEmptyFooter = (isTotal) => {
  if (isTotal) {
    return {
      Footer: () => {
        return <b style={{ fontSize: "16px" }}>Total:</b>;
      },
    };
  }
  return { Footer: () => "" };
};

//React table footer for getting total / average
export const getTotalForFooter = (key, parserKey, formatter, isAvg) => {
  //parserKey is used to pass type to dataParser method
  //formatter is a method which return data in required format
  //isAvg is used to calculate average from total
  //It add the value of the key in all rows and return the total
  return {
    Footer: (info) => {
      const total = React.useMemo(() => {
        return info.rows
          .map((data) => {
            return dataParser(parserKey, data.values[key]);
          })
          .reduce((sum, current) => sum + current, 0);
      }, [info.rows]);

      return (
        <b style={{ fontSize: "16px" }}>
          {formatter
            ? formatter({ value: isAvg ? total / info.rows.length : total })
            : total}
        </b>
      );
    },
  };
};

// returns only parent rows when all rows, including child rows are in the list
export const getParentGroupingRow = (flatIds, groupByID) => {
  return flatIds
    .filter((item) => item.depth === 0 && item.groupByID === groupByID)
    .map((item) => item.values);
};

// returns boolean true,false based on if column is present in the columns list
export const isColumnPresent = (columnsList, columnName) => {
  return columnsList?.some((el) => el.column_name === columnName);
};
