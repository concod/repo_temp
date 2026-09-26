import { forwardRef, useEffect, useState } from "react";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { addSnack } from "core/actions/snackbarActions";
import AgGridTable from "core/Utils/agGrid";
import { connect } from "react-redux";
import { fetchSelectAllStatus } from "./common-mapping-functions";

const StoreToProductTables = forwardRef((props, ref) => {
  const customOnClickFunction = (columns) => {
    return columns.map((item) => {
      if (item.column_name === "mapped_products_count") {
        item.onClick = (tableInfo) => {
          item.is_aggregated = false;
          props.setSelectedID(tableInfo.cellData.data);
          props.setShowMappedProduct(true);
        };
      }
      return item;
    });
  };
  /**
   * State variables
   */
  const [storeTableColumns, setstoreTableColumns] = useState([]);
  const [storeGroupTableColumns, setstoreGroupTableColumns] = useState([]);
  const { storeTableRef, storeGroupTableRef } = ref.current;
  /**
   * UseEffects
   */
  useEffect(() => {
    //On mount fetch the column config for the table
    const fetchColumnConfig = async () => {
      try {
        let cols = await getColumnsAg("table_name=store_product_stores")();
        let storeGroupColumns = await getColumnsAg(
          "table_name=store_group_product_stores"
        )();

        cols = customOnClickFunction(cols);
        storeGroupColumns = customOnClickFunction(storeGroupColumns);
        setstoreTableColumns(cols);
        setstoreGroupTableColumns(storeGroupColumns);
      } catch (error) {
        props.addSnack({
          message:
            error?.response?.data?.message || "Unable to fetch Table Configs",
          options: {
            variant: "error",
          },
        });
      }
    };
    fetchColumnConfig();
  }, []);

  //whenever there is change in filter dependency,
  //we add the state changes to table grid instance
  useEffect(() => {
    if (storeTableRef.current) {
      storeTableRef.current.api.filterDependency = props.filterDependency;
      storeTableRef.current.api.radioDimension = props.radioDimension;
      storeTableRef.current.api.storeStatusValues = props.storeStatusValues;
    }
    if (storeGroupTableRef.current) {
      storeGroupTableRef.current.api.filterDependency = props.filterDependency;
      storeGroupTableRef.current.api.radioDimension = props.radioDimension;
      storeGroupTableRef.current.api.storeStatusValues =
        props.storeStatusValues;
    }
  }, [props.filterDependency, props.radioDimension, props.storeStatusValues]);

  const onSelectionChanged = (event) => {
    const selectedRows = event.api.getSelectedRows();
    props.setSelectedRowsIDs(selectedRows);
  };
  return (
    <>
      {props.radioDimension === "store" && storeTableColumns.length > 0 && (
        <AgGridTable
          columns={storeTableColumns}
          selectAllHeaderComponent={true}
          sizeColumnsToFitFlag
          onGridChanged
          onRowSelected
          manualCallBack={(body, pageIndex, params) =>
            props.manualCallBack(body, pageIndex, params)
          }
          loadTableInstance={(gridInstance) => {
            storeTableRef.current = gridInstance;
          }}
          rowModelType="serverSide"
          serverSideStoreType="partial"
          cacheBlockSize={10}
          uniqueRowId={"store_code"}
          onSelectionChanged={onSelectionChanged}
          hideSelectAllRecords={fetchSelectAllStatus()}
        />
      )}{" "}
      {props.radioDimension === "store_groups" &&
        storeGroupTableColumns.length > 0 && (
          <AgGridTable
            columns={storeGroupTableColumns}
            selectAllHeaderComponent={true}
            sizeColumnsToFitFlag
            onGridChanged
            onRowSelected
            manualCallBack={(body, pageIndex, params) =>
              props.manualCallBack(body, pageIndex, params)
            }
            loadTableInstance={(gridInstance) => {
              storeGroupTableRef.current = gridInstance;
            }}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={10}
            uniqueRowId={"sg_code"}
            onSelectionChanged={onSelectionChanged}
            hideSelectAllRecords
          />
        )}
    </>
  );
});

const mapActionsToProps = {
  addSnack,
};
export default connect(null, mapActionsToProps, null, { forwardRef: true })(
  StoreToProductTables
);
