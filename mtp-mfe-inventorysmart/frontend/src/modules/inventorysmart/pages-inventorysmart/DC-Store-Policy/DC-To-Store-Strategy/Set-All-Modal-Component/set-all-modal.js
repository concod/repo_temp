import PropTypes from "prop-types";
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  clone,
  cloneDeep,
  isEmpty,
  isNull,
  isUndefined,
  isEqual,
  set,
} from "lodash";
import { Grid, IconButton } from "@mui/material";
import { Button } from "impact-ui-v3";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import moment from "moment";
import { isDateRangeConflict } from "core/Utils/functions/helpers/validation-helpers";
import { displaySnackMessages } from "modules/inventorysmart/pages-inventorysmart/inventorysmart-utility";
import AgGridTable from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import ProductRulePopUp from "../ProductRulePopUp";
import { setSetAllModalLoader } from "modules/inventorysmart/services-inventorysmart/DC-Store-Policy/dc-store-strategy";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";

const SetAllModal = (props) => {
  const isManageRclFlow = props?.isManageRclFlow;
  const [coldDefs, setColDefs] = useState([]);

  const agGridInstance = useRef(null);
  const { rowData, setRowData, setError } = props;

  const [clickedRowData, setClickedRowData] = useState("");
  const [parentNode, setParentNode] = useState(null);
  const [currentNode, setCurrentNode] = useState(null);
  const [popUpColumnData, setPopUpColumnData] = useState([]);
  const [parentData, setParentData] = useState([]);
  const [showPopUp, setShowPopUp] = useState(false);

  const newRow = {
    end_date: null,
    start_date: null,
    id: 0,
    // Names
    store_store_groups_mapped: "0/0",
    product_profile: "-",
    dc_store_rule_name: "-",
    auto_allocation_rule_name: "-",
    auto_allocation_schedular_name: "-",
    // IDs
    default_store_groups: [],
    default_product_profile: null,
    dc_store_rule: null,
    auto_allocation_rule: null,
    auto_allocation_schedular: null,
  };

  const onAddRow = (params) => {
    let isAllDatePresent = true;
    rowData.forEach((row) => {
      if (isNull(row["start_date"]) || isNull(row["end_date"])) {
        isAllDatePresent = false;
      }
    });
    if (!isAllDatePresent) {
      displaySnackMessages(
        "Please provide start dates and end dates before adding new",
        "error",
        props
      );
      return;
    }
    // Rule name is entered once at the grid level; newly added rows inherit the
    // same rule name so the (+) icon cannot create multiple rule names for the
    // same rule/hierarchy. Read the current value from the grid (source of
    // truth) so an unsynced, freshly typed name is still picked up.
    const firstRowNode = agGridInstance.current?.api?.getDisplayedRowAtIndex(0);
    const inheritedRuleName =
      firstRowNode?.data?.rule_name ?? rowData?.[0]?.rule_name ?? null;
    const rowToAdd = {
      ...newRow,
      id: rowData.length,
      rule_name: inheritedRuleName,
    };
    agGridInstance.current.api.applyTransaction({
      add: [rowToAdd],
      addIndex: rowData.length,
    });
    setRowData([...cloneDeep(rowData), rowToAdd]);
  };
  const onDeleteRow = (params) => {
    const { node, rowIndex } = params;
    let deleteID = node.data.id;
    let updated_data = [];
    agGridInstance.current.api.forEachNode((node) => {
      if (node.data.id !== deleteID) {
        updated_data.push({
          ...node.data,
          id: updated_data.length,
        });
      }
    });
    errorAcrossRows(updated_data);
    setRowData(updated_data);
  };

  const errorAcrossRows = (rowData) => {
    let start_end_list = rowData.map((item) => {
      return {
        start_time: item[`start_date`],
        end_time: item[`end_date`],
      };
    });
    if (isDateRangeConflict(start_end_list, "YYYY-MM-DD", "[]")) {
      // Conflict Exists
      displaySnackMessages("Conflicting Dates", "error", props);
      setError("Conflicting Dates");
      return true;
    }
    let smallerToDateCheck = false;
    start_end_list.forEach((thisDate) => {
      if (moment(thisDate.end_time).isBefore(moment(thisDate.start_time))) {
        smallerToDateCheck = true;
      }
    });
    if (smallerToDateCheck) {
      displaySnackMessages("To date should be after From Date", "error", props);
      setError("To date should be after From Date");
      return true;
    }
    setError(false);
    return false;
  };
  const onCellValueChanged = (params) => {
    let isInputValueSame = false;
    if (moment.isMoment(params.newValue)) {
      isInputValueSame = moment(params.newValue).isSame(params.oldValue);
    } else {
      isInputValueSame = isEqual(params.oldValue, params.newValue);
    }
    if (!isInputValueSame) {
      // Rule name is edited only in the first row; keep every row in sync so the
      // grid always carries a single rule name for the rule/hierarchy.
      if (params?.colDef?.field === "rule_name") {
        const updatedRuleName = params.newValue;
        let synced_data = [];
        agGridInstance.current.api.forEachNode((node) => {
          synced_data.push({ ...node.data, rule_name: updatedRuleName });
        });
        setRowData(synced_data);
        agGridInstance.current.api.applyTransaction({ update: synced_data });
        setError(false);
        return;
      }
      let start_date = params.node.data.start_date;
      let end_date = params.node.data.end_date;
      if (start_date && end_date) {
        if (moment(end_date).isBefore(moment(start_date))) {
          displaySnackMessages(
            "To date should be after From Date",
            "error",
            props
          );
          setError("To date should be after From Date");
          return;
        }
        // Check Date range conflicts in the Rule list
        // Check From > To in the Rules list
        if (errorAcrossRows(rowData)) {
          return;
        }
      }
      setError(false);
    }
  };

  useEffect(() => {
    const getColumns = async () => {
      props.setSetAllModalLoader(true);
      let tableName = "rcl_dc_store_policy_set_all";
      let dcStoresColDef = [];
      try {
        dcStoresColDef = await getColumnsAg(`table_name=${tableName}`)();
        if (props.redirectedFromNetworkTab) {
          dcStoresColDef = props.redirectedFromNetworkTab
            ? dcStoresColDef.filter(
                (item) =>
                  item.column_name === "start_date" ||
                  item.column_name === "end_date"
              )
            : dcStoresColDef;
          let networkCol = {
            sub_headers: [],
            tc_code: 302,
            label: "Supply Network",
            column_name: "supply_network_id",
            dimension: "Inventory",
            type: "list",
            is_frozen: false,
            is_editable: true,
            is_aggregated: false,
            order_of_display: 22,
            is_hidden: false,
            is_required: false,
            tc_mapping_code: "336022",
            aggregate_type: null,
            formatter: null,
            is_row_span: false,
            footer: null,
            is_searchable: false,
            extra: {},
            is_sortable: false,
            width: 200,
            is_deleted: false,
            is_master_group: false,
          };
          networkCol.options = props.networkOptions;
          dcStoresColDef = [...dcStoresColDef, networkCol];
          dcStoresColDef = agGridColumnFormatter(dcStoresColDef);
        }

        if (props?.isPartialSetAll) {
          dcStoresColDef = dcStoresColDef.filter((thisCol) => {
            return !["start_date", "end_date"].includes(thisCol?.field);
          });
        }
      } catch (e) {
        displaySnackMessages("Error in API call", "error", props);
        props.setSetAllModalLoader(false);
        return;
      }
      dcStoresColDef = dcStoresColDef.map((item) => {
        if (item.type === "link") {
          item.is_aggregated = false;
          item.is_editable = true;
          item.cellRenderer = (cellProps, extraProps) => {
            return (
              <CellRenderers
                cellData={cellProps}
                column={item}
                extraProps={extraProps}
              ></CellRenderers>
            );
          };

          item.onClick = (tableInfo) => {
            setClickedRowData(tableInfo.cellData.data);
            setPopUpColumnData(tableInfo?.cellData?.colDef || {});
            setParentData(tableInfo?.cellData?.node?.parent?.data);
            setParentNode(tableInfo?.cellData?.node?.parent);
            setCurrentNode(tableInfo?.cellData?.node);
            setShowPopUp(true);
          };
        }
        // Allow entering the rule name only once (in the first row). Rows added
        // via the (+) icon inherit the same rule name and are non-editable, so a
        // single rule/hierarchy can never end up with multiple rule names.
        // Using the column-level `disabled` callback (honoured by the shared
        // cell renderer) keeps this contained to this column without touching
        // core.
        if (item.field === "rule_name") {
          item.disabled = (data) => data?.id !== 0;
        }
        return item;
      });
      if (!props?.isPartialSetAll) {
        dcStoresColDef.push({
          headerName: "",
          disableSortBy: true,
          isFixed: true,
          minWidth: 56,
          width: 56,
          sticky: "right",
          isFrozen: true,
          pinned: "right",
          cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" },
          cellRenderer: (params, extraProps) => {
            return (
              <div>
                <DeleteActionButton
                  title="Delete"
                  size="large"
                  onClick={() => onDeleteRow(params)}
                  disabled={params.api.getDisplayedRowCount() === 1}
                />
              </div>
            );
          },
          suppressMenu: true,
        });
      }
      setColDefs(dcStoresColDef);
      props.setSetAllModalLoader(false);
    };
    getColumns();
    setRowData([{ ...newRow }]);
  }, [props?.isPartialSetAll]);

  // Re-fit columns to the grid width after the column set changes (e.g. toggling
  // between Set All / Partial Set All), otherwise new columns fall back to their
  // fixed width and stop filling the modal.
  useEffect(() => {
    if (isEmpty(coldDefs)) return;
    const timer = setTimeout(() => {
      agGridInstance.current?.api?.sizeColumnsToFit();
    }, 0);
    return () => clearTimeout(timer);
  }, [coldDefs]);

  const getTopRightOptions = () => {
    let options = [];
    if (!props?.isPartialSetAll) {
      options.push(
        <Button
          id="set-all-exception"
          variant="primary"
          size="large"
          onClick={() => onAddRow()}
          disabled={rowData.length > 2}
        >
          Add
        </Button>
      );
    }
    return options;
  };
  return (
    <div>
      {showPopUp && (
        <ProductRulePopUp
          active={showPopUp}
          openModal={() => setShowPopUp(true)}
          closeModal={() => setShowPopUp(false)}
          filterDependencies={props.filterDependencies}
          popUpColumnData={popUpColumnData}
          parentData={parentData}
          clickedRowData={clickedRowData}
          agGridInstance={agGridInstance} // instance of the main table to update the mappings.
          parentNode={parentNode}
          isManageRclFlow={isManageRclFlow}
          isSetAllPopUp={true}
          currentNode={currentNode}
          setRowData={setRowData}
          rowData={rowData}
        />
      )}
      <Loader loader={props.setAllModalLoader}>
        <AgGridTable
          topCenterOptions={props?.Options}
          topRightOptions={getTopRightOptions()}
          columns={coldDefs}
          hideSelectAllRecords={true}
          onGridChanged
          loadTableInstance={(gridInstance) => {
            agGridInstance.current = gridInstance;
          }}
          cacheBlockSize={10}
          uniqueRowId={"id"}
          rowdata={rowData || []}
          onCellValueChanged={(params) => {
            onCellValueChanged(params);
          }}
          sizeColumnsToFitFlag
          wrapCellText
          autoCellHeight
          autoHeaderHeight
          wrapHeaderText
          skipAutoSizeColumn={false}
          disablePaginationForSinglePage
        />
      </Loader>
    </div>
  );
};

SetAllModal.propTypes = {
  filterDependencies: PropTypes.shape({
    current: PropTypes.shape({
      filters: PropTypes.any,
    }),
  }),
  inventorysmartScreenConfig: PropTypes.shape({
    inventorysmart_constraints: PropTypes.shape({
      drillDown: PropTypes.shape({
        showSingleMergedRows: PropTypes.any,
      }),
    }),
  }),
  setAllModalLoader: PropTypes.any,
  selectedDependencyValue: PropTypes.func,
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    setAllModalLoader:
      inventorysmartReducer?.dcStoreStrategyReducer?.setAllModalLoader,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
    setSetAllModalLoader: (body) => dispatch(setSetAllModalLoader(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(SetAllModal);
