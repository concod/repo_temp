import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { BottomSheet } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import {
  getOrderBatchingSummaryStyleTableData,
  getOrderBatchingSummaryStoreTableData,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-summary-services";
import {
  handleErrorMessage,
  displaySnackMessages,
} from "../../inventorysmart-utility";
import { getColumnsAg } from "core/actions/tableColumnActions";
import Loader from "core/Utils/Loader/loader";
import { isEmpty, isNil } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const NewOrderBatchingBottomSheetTableView = (props) => {
  const [columnDefs, setColumnDefs] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [tableLoader, setTableLoader] = useState(false);
  const [tableHeader, setTableHeader] = useState("");

  const getHeaderText = (title, rowData) => {
    const viewType = title === "Style" ? "style" : "store";
    const columns = props.bottomSheetConfig?.[viewType];
    if (columns?.length) {
      const columnParts = columns
        .map((col) => col.label + ": " + replaceSpecialCharacter(rowData[col.column] ?? ""))
        .join(" and ");
      const prefix = title === "Style" ? "Style Details for" : "Store Details for";
      return prefix + " " + columnParts;
    }
    // Fallback to default hardcoded headers
    if (title === "Style") {
      return "Style Details for Store: " + replaceSpecialCharacter(rowData.store);
    }
    return (
      "Store Details for Consumer: " +
      replaceSpecialCharacter(rowData.consumer) +
      " and Category: " +
      replaceSpecialCharacter(rowData.category)
    );
  };

  useEffect(() => {
    if (!isEmpty(props.rowData)) {
      setTableHeader(getHeaderText(props.title, props.rowData));
    }
  }, [props.title, props.rowData]);

  const setNonEditableIntColumn = (item) => {
    item.extra = {};
    item.type = "int";
    item.is_editable = false;
    item.cellRenderer = null;
    return item;
  };

  useEffect(() => {
    const fetchTableDetails = async () => {
      if (props.title === "Style") {
        setTableLoader(true);
        let col = await getColumnsAg(
          "table_name=inventorysmart_order_triaging_summary_style",
          {},
          {},
          false,
          true
        )();
        col = col.map((item) => {
          if (item.column_name === "store_count") {
            item = setNonEditableIntColumn(item);
          }
          return item;
        });
        setColumnDefs(col);
        fetchOrderBatchingSummaryStyleTableData();
      } else {
        setTableLoader(true);
        let col = await getColumnsAg(
          "table_name=inventorysmart_order_triaging_summary_store",
          {},
          {},
          false,
          true
        )();
        col = col.map((item) => {
          if (item.column_name === "style_count") {
            item = setNonEditableIntColumn(item);
          }
          return item;
        });
        setColumnDefs(col);
        fetchOrderBatchingSummaryStoreTableData();
      }
    };
    fetchTableDetails();
  }, [props.title]);

  const fetchOrderBatchingSummaryStoreTableData = async () => {
    try {
      setTableLoader(true);
      const storeColumns = props.bottomSheetConfig?.store;
      const filterMapping = storeColumns?.length
        ? storeColumns
            .filter((col) => col.filter_key)
            .map((col) => ({ attribute_name: col.filter_key, row_key: col.column }))
        : [
            { attribute_name: "l1_name", row_key: "consumer" },
            { attribute_name: "l3_name", row_key: "category" },
          ];
      let body = {
        filters: props.selectedFilters.map((item) => {
          const mapping = filterMapping.find(
            (m) => m.attribute_name === item.attribute_name
          );
          if (mapping) {
            return {
              ...item,
              values: [props.rowData[mapping.row_key]],
            };
          }
          return item;
        }),
        ...(props.createdAtDate && { created_at: props.createdAtDate }),
      };
      if (props.selectedOption === "edit") {
        body = {
          ...body,
          session_id: props.sessionId,
          is_update_mode: true,
        };
      }
      let response = await props.getOrderBatchingSummaryStoreTableData(body);
      if (response.data.show_message) {
        displaySnackMessages(response.data.message, "success", props);
      }
      if (response.data.status) {
        setTableData(response.data.data);
      } else {
        setTableData([]);
      }
    } catch (e) {
      handleErrorMessage(e, props);
    } finally {
      setTableLoader(false);
    }
  };

  const fetchOrderBatchingSummaryStyleTableData = async () => {
    try {
      setTableLoader(true);
      const filters = props.selectedFilters.filter(
        (item) => item.attribute_name !== "store_code"
      );
      if (!isNil(props.rowData?.store)) {
        filters.push({
          attribute_name: "store_code",
          operator: "in",
          dimension: "Store",
          values: [props.rowData.store],
        });
      }
      let body = {
        filters: filters,
        ...(props.createdAtDate && { created_at: props.createdAtDate }),
      };
      if (props.selectedOption === "edit") {
        body = {
          ...body,
          session_id: props.sessionId,
          is_update_mode: true,
        };
      }
      let response = await props.getOrderBatchingSummaryStyleTableData(body);
      if (response.data.show_message) {
        displaySnackMessages(response.data.message, "success", props);
      }
      if (response.data.status) {
        setTableData(response.data.data);
      } else {
        setTableData([]);
      }
    } catch (e) {
      handleErrorMessage(e, props);
    } finally {
      setTableLoader(false);
    }
  };

  return (
    <BottomSheet
      label="Default"
      onClose={() => props.onClose()}
      title={props.title}
      open={props.open}
      withExpandIcon = {false}
    >
      <Loader loader={tableLoader}>
        <AgGridComponent
          columns={columnDefs}
          rowdata={tableData}
          downloadAsExcel={tableData?.length ? true : false}
          uniqueRowId={props.title === "Style" ? "unique_key" : "store"}
          tableHeader={tableHeader}
          cardContainer={false}
          isInsideBottomSheet
          isBottomSheetExpanded={true}
        />
      </Loader>
    </BottomSheet>
  );
};

const mapStateToProps = (store) => {
  return {
    bottomSheetConfig:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.orderBatchingConfig?.bottomSheetConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOrderBatchingSummaryStyleTableData: (payload) =>
    dispatch(getOrderBatchingSummaryStyleTableData(payload)),
  getOrderBatchingSummaryStoreTableData: (payload) =>
    dispatch(getOrderBatchingSummaryStoreTableData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NewOrderBatchingBottomSheetTableView);
