import { get } from "lodash";

const flattenColDefFunc = (columnDefResp = [], levels) => {
  const nonEditableColumnsLength = columnDefResp.filter(
    (colDef) => !get(colDef, "extra.isEditable")
  ).length;
  const planningLevels = levels - 2; // we are showing starting with month which is -2 level from week

  const updatedColDef = columnDefResp.slice(0, nonEditableColumnsLength);

  const level = planningLevels;
  const handleFlattenColDefFunc = (colDefs, parentColDef, currentDepth) => {
    if (currentDepth < level) {
      const parentColDefs = [];
      for (const element of colDefs) {
        const colDef = element;
        if (colDef.sub_headers) {
          handleFlattenColDefFunc(colDef.sub_headers, colDef, currentDepth + 1);
        } else {
          parentColDefs.push(colDef);
        }
      }
      if (parentColDefs.length > 0) {
        if (parentColDef.sub_headers) {
          delete parentColDef.sub_headers;
        }
        const isGrandTotal = parentColDefs.some((colDef) =>
          Boolean(get(colDef, "extra.isGrandTotal", false))
        );
        updatedColDef.push({
          ...parentColDef,
          sub_headers: [
            {
              ...parentColDef,
              label: parentColDef.label + (isGrandTotal ? "" : " Total"),
              sub_headers: parentColDefs.map((subColDef) => {
                if (
                  !subColDef.label?.includes("Total") &&
                  !subColDef.label?.includes("Omni")
                ) {
                  return {
                    columnGroupShow: "closed",
                    ...subColDef
                  };
                }
                return subColDef;
              })
            }
          ]
        });
      }
    } else if (currentDepth === level) {
      const withSubHeaders = [];
      const withoutSubHeaders = [];
      colDefs.forEach((colDef) => {
        if (!colDef.sub_headers) {
          withoutSubHeaders.push(colDef);
        } else {
          withSubHeaders.push(colDef);
        }
      });

      const updatedWithSubHeaders = withSubHeaders.reduce((acc, colDefObj) => {
        const withSub = colDefObj.sub_headers.filter(
          (subHeaderColDef) => subHeaderColDef.sub_headers
        );

        withSub.forEach((withSubColDef) => {
          if (
            !withSubColDef.label?.includes("Total") &&
            !withSubColDef.label?.includes("Omni")
          ) {
            withSubColDef.columnGroupShow = "closed";
          }
          withSubColDef.sub_headers.forEach((withSubHeaderColDef) => {
            if (
              !withSubHeaderColDef.label?.includes("Total") &&
              !withSubHeaderColDef.label?.includes("Omni")
            ) {
              withSubHeaderColDef.columnGroupShow = "closed";
            }
          });
        });

        const withOutSub = colDefObj.sub_headers.filter(
          (subHeaderColDef) => !subHeaderColDef.sub_headers
        );
        acc.push({
          ...colDefObj,
          sub_headers: [
            {
              ...colDefObj,
              label: `${colDefObj.label} Total`,
              sub_headers: withOutSub.map((colDefObj) => {
                if (
                  !colDefObj.label?.includes("Total") &&
                  !colDefObj.label?.includes("Omni")
                ) {
                  return {
                    columnGroupShow: "closed",
                    ...colDefObj
                  };
                }
                return colDefObj;
              })
            }
          ].concat(withSub)
        });
        return acc;
      }, []);

      updatedColDef.push(...updatedWithSubHeaders);

      if (parentColDef.sub_headers) {
        delete parentColDef.sub_headers;
      }
      updatedColDef.push({
        ...parentColDef,
        sub_headers: [
          {
            ...parentColDef,
            columnGroupShow: "closed",
            label: `${parentColDef.label} Total`,
            sub_headers: withoutSubHeaders.map((subColDef) => {
              if (
                !subColDef.label?.includes("Total") &&
                !subColDef.label?.includes("Omni")
              ) {
                return {
                  columnGroupShow: "closed",
                  ...subColDef
                };
              }
              return subColDef;
            })
          }
        ]
      });
    }
    return updatedColDef;
  };
  handleFlattenColDefFunc(columnDefResp.slice(nonEditableColumnsLength), {}, 0);
  return updatedColDef;
};

export default flattenColDefFunc;
