import globalStyles from "core/Styles/globalStyles";
import React, { useState, useRef, useEffect } from "react";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { cloneDeep, isEmpty, isNil, sortBy } from "lodash";
import TableViewColumnMenu from "./tableViewColumnMenu/TableViewColumnMenu";
import Loader from "core/Utils/Loader/loader";
import {
  getColumnSettingsRowConfig,
  flattenWithPaths,
} from "./table-view-functions";
import { COLUMN_SETTINGS_TABLE } from "./constants";

const TableViewColumnSetting = (props) => {
  const { selectedViewData, setColumnSettingGridInstance } = props;
  const agInstance = useRef(null);
  const globalClasses = globalStyles();
  const [rowData, setRowData] = useState([]);
  const [showloader, setloader] = useState(true);

  useEffect(() => {
    if (
      !isNil(selectedViewData) &&
      !isEmpty(selectedViewData?.[0]?.preference)
    ) {
      setloader(true);
      const columnPreference = selectedViewData?.[0]?.preference;
      let formattedRowData = Object.keys(columnPreference).map((uniqueId) => {
        const columnData = columnPreference[uniqueId];
        return {
          column_name: uniqueId,
          ...columnData,
        };
      });
      debugger;
      formattedRowData = sortBy(formattedRowData, "order_of_display");
      formattedRowData = flattenWithPaths(formattedRowData);
      formattedRowData = formattedRowData.map((item) => {
        item.is_selected = !item.is_hidden;

        return item;
      });
      setRowData(formattedRowData);
      agInstance?.current?.api.setRowData(formattedRowData);
      agInstance?.current?.api.redrawRows();
      setloader(false);
    }
  }, [selectedViewData]);

  const loadTableInstance = (params) => {
    agInstance.current = params;
  };

  const onSelectionChanged = (event) => {
    setColumnSettingGridInstance(agInstance.current);
  };

  const onColumnMenuAction = (action, columnAttributes) => {
    let currentGridRowData = cloneDeep(
      getColumnSettingsRowConfig(agInstance.current)
    );
    setloader(true);
    switch (action) {
      case "is_frozen":
        currentGridRowData[columnAttributes?.column_name][
          "is_frozen"
        ] = !columnAttributes["is_frozen"];
        break;
      case "custom_column":
        currentGridRowData[columnAttributes?.column_name].extra.width = 300;
        break;
      case "auto_column":
        delete currentGridRowData[columnAttributes?.column_name].extra.width;
        break;
      default:
        break;
    }

    let updatedRowData = Object.keys(currentGridRowData).map((colName) => {
      return { ...currentGridRowData[colName], column_name: colName };
    });
    setRowData(updatedRowData);
    agInstance?.current?.api.setRowData(updatedRowData);
    setColumnSettingGridInstance(agInstance.current);
    setloader(false);
  };

  const getColDef = () => {
    let colDef = agGridColumnFormatter(COLUMN_SETTINGS_TABLE);
    colDef[0].cellRenderer = (params) => {
      if (params?.node?.allLeafChildren?.length === 1) {
        return (
          <>
            <TableViewColumnMenu
              columnAttributes={params.data}
              onColumnMenuAction={onColumnMenuAction}
            />
          </>
        );
      } else {
        return "";
      }
    };
    return colDef;
  };

  const getRowStyle = () => {
    return { border: "none" };
  };

  return (
    <div className={globalClasses.marginTop}>
      <Loader loader={showloader || isEmpty(rowData)}>
        <AgGridComponent
          rowdata={rowData}
          columns={getColDef()}
          pagination={false}
          sideBar={false}
          rowDragManaged={true}
          animateRows={true}
          onCellValueChanged={() => {}}
          // onRowDragMove={onRowDragMove}
          loadTableInstance={loadTableInstance}
          uniqueRowId="column_name"
          selectAllHeaderComponent={true}
          onSelectionChanged={onSelectionChanged}
          customStyles={{
            headerHeight: 0, // Set headerHeight to zero to hide column headers
          }}
          minWidth={100}
          // skipAutoSizeColumn
          // skipHeaderOnAutoSize
          getRowStyle={getRowStyle}
          customClass={"ag-theme-alpine-white"}
          getRowHeight={() => {
            return 30;
          }}
          sizeColumnsToFitFlag={true}
          autoGroupColumnDef={{
            rowDrag: true,
            cellRendererParams: {
              suppressCount: true,
            },
          }}
          treeData={true}
          getDataPath={(data) => {
            return data?.path || [];
          }}
        />
      </Loader>
    </div>
  );
};

export default TableViewColumnSetting;
