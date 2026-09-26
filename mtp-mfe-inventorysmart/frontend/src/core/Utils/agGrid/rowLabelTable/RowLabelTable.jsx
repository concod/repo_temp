import { AgGridReact } from "ag-grid-react";
import classNames from "classnames";
import _, { cloneDeep, isEmpty, isNull } from "lodash";
import { useEffect, useState } from "react";
import "../ag-theme-mtp.scss";
import agGridColumnFormatter from "../column-formatter";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles(() => ({
  container: { height: 600, width: "100%" },
}));

const RowLabelTable = (props) => {
  const {
    tableId,
    customClass = "",
    parentGridInstance,
    rowFields,
    applied,
    setApplied,
    filtersExcludedValues,
  } = props;
  const [gridColumns, setGridColumns] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [instance, setInstance] = useState({});
  const classes = useStyles();


  let gridOptions = {
    onGridReady: (params) => {
      setInstance(params);
    },
  };

  /**
   * activateRowLabel function will mainly
   * be responsible for rendering row label
   * view in the table
   * @param {Array} rowFields
   */
  const activateRowLabel = (rowFields) => {
    try {
          let rowFieldNames = [];
          let rowFieldVisited = {};
          rowFields.forEach((row) => {
            rowFieldNames.push(row.value);
            rowFieldVisited[row.value] = false;
          });

          let isMultipleRowFields = rowFields.length > 1 ? true : false;

          let currentColumnDefs = instance?.api?.getColumnDefs();

          let updatedColumnDefs = [];

          // making columnData for rowLabel through updatedColumnDefs
          currentColumnDefs.forEach((col) => {
            let colFieldIndex = rowFieldNames.indexOf(col.column_name);
            if (colFieldIndex > -1) {
              updatedColumnDefs[colFieldIndex] = {
                column_name: col?.column_name,
                label: col?.label,
                level: isMultipleRowFields ? colFieldIndex : null,
                rowGroup: isMultipleRowFields ? true : false,
                rowGroupIndex: isMultipleRowFields
                  ? rowFieldNames.indexOf(col?.column_name)
                  : null,
              };
            }
          });

          let aggColumnDefs = [
            {
              column_name: "agg_label",
              label: "Values",
            },
            {
              column_name: "agg_value",
              label: "",
            },
          ];

          updatedColumnDefs = [...updatedColumnDefs, ...aggColumnDefs];

          let rowDataTemplate = {};

          updatedColumnDefs.forEach((col) => {
            rowDataTemplate[col?.column_name] = null;
          });

          let colAggTypeInfo = {};
          currentColumnDefs.forEach((col) => {
            if (!isNull(col.aggFunc) && typeof col.aggFunc === "function") {
              colAggTypeInfo[col.column_name] = col.aggLabel;
            } else if (!isNull(col.aggFunc)) {
              colAggTypeInfo[col.column_name] = col.aggFunc;
            }
          });

          let rowInfo = [];

          /**
           * getAllParentsKeyAndField function will
           * add all the parents key of the current
           * node to the data object by calling the function
           * recursively
           * @param {object} row
           * @param {object} data
           * @returns
           */
          let getAllParentsKeyAndField = (row, data) => {
            let parent = row?.parent;
            if (parent.level !== -1) {
              data[parent.field] = parent.key;
              return getAllParentsKeyAndField(parent, data);
            } else {
              return data;
            }
          };

          //making row data for rowLabel through below code
          instance.api.forEachNode((row) => {
            if (!isNull(row?.key)) {
              let newRowData = cloneDeep(rowDataTemplate);

              newRowData[row.field] = row.key;

              if (!rowFieldVisited[row.field]) {
                rowFieldVisited[row.field] = true;
              }

              newRowData.level = isMultipleRowFields ? row.level : null;

              newRowData.rowIndex = isMultipleRowFields
                ? rowFieldNames.indexOf(row.field)
                : null;

              if (!isEmpty(row.aggData)) {
                let aggData = cloneDeep(row.aggData);
                let initialAssign = true;
                let aggDataKeys = Object.keys(aggData);

                for (let property in aggData) {
                  if (aggDataKeys.indexOf(property) > 0) {
                    initialAssign = false;
                  }
                  let newData = cloneDeep(newRowData);
                  newData.agg_label = `${_.capitalize(
                    colAggTypeInfo[property]
                  )} of ${property}`;
                  if (typeof aggData[property] === "object"){
                    newData.agg_value = aggData[property]?.value;
                  } else {
                    newData.agg_value = aggData[property];
                  }
                  newData[row.field] = row.key;
                  newData.unique_id = Math.random();
                  let data = getAllParentsKeyAndField(row, newData);
                  rowInfo.push(data);
                }
              }
            }
          });

          /**
           * If there is no row data or selected rowField's data is not present in row data then return
           */
          if (
            isEmpty(rowInfo) ||
            Object.values(rowFieldVisited).indexOf(false) > -1
          ) {
            return;
          }

          //formatting columns before setting it to grid
          let formattedNewColumns = agGridColumnFormatter(
            updatedColumnDefs,
            {},
            {},
            false,
            null,
            false
          );
          const filteredRowData = rowInfo.filter(
            (rowNode) =>
              !Object.values(rowNode).some((value) =>
                filtersExcludedValues.includes(value)
              )
          );
          setGridColumns(formattedNewColumns);
          setRowData(filteredRowData);
          setApplied(false);
        } catch (error) {
      console.error("activateRowLabel error:", error);
    }
  };

  useEffect(() => {
    if (!isEmpty(parentGridInstance)) {
      setInstance(parentGridInstance);
    }
  }, [parentGridInstance, rowFields]);

  useEffect(() => {
    if (!isEmpty(instance) && applied) {
      activateRowLabel(rowFields);
    }
  }, [instance, applied]);

  return (
    <div
      id={tableId ? tableId : "myGrid"}
      className={`${classNames("ag-theme-alpine", customClass)}`}
    >
      <AgGridReact
        columnDefs={gridColumns}
        rowData={rowData}
        gridOptions={gridOptions}
        pagination={true} // Enable pagination
        paginationPageSize={10} // Number of rows per page
        domLayout={"autoHeight"}
      />
    </div>
  );
};

export default RowLabelTable;
