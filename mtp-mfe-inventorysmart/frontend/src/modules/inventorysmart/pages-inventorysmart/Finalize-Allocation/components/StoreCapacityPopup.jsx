import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import React, { useEffect, useState, useRef } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { useStoreCapacityStyles } from "../../Common/components/table-style";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import LoadingOverlay from "core/Utils/Loader/loader";
import { getStoreCapacityTablePopupData } from "modules/inventorysmart/services-inventorysmart/Finalize/store-capacity-service";
import { getIgnoreAllocationCode } from "../../Create-Allocation/helperFunctions";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  bulkUpdateAllocatedUnits,
  setAllocationCode,
  setArticle,
  setOriginalAllocationCode,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { BottomSheet } from "impact-ui-v3";

const StoreCapacityPopup = (props) => {
  const [columns, setColumns] = useState([]);
  const classes = useStoreCapacityStyles();
  const [showloading, setShowloading] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);

  const initialAllocatedUnitsRef = useRef({});
  const editedRowsRef = useRef({});

  useEffect(() => {
    setShowloading(true);
    const setCols = async () => {
      let storeCols = await props.getColumnsAg(
        "table_name=size_level_allocation_popup"
      );
      fetchData();
      // setColumns(storeCols);
    };
    setCols();
  }, []);

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    props.setShowloading(false);
  };

  const fetchData = async () => {
    try {
      let reqBody = {
        article:
          props?.selectedRowData?.parent_article ||
          props.selectedRowData.article,
        plan_status: "Created",
        allocation_code: props.allocationCode,
        ignore_allocation_code: getIgnoreAllocationCode(
          props.originalAllocationCode,
          props.allocationCode
        ),
        plan_type: props.planType,
        store_code: props.selectedRowData.store_code || props.store,
        ...(props.selectedRowData.pack_type_id && {
          pack_type_id: props.selectedRowData.pack_type_id,
        }),
      };
      let { data: storeData } = await props.getStoreCapacityTablePopupData(
        reqBody
      );
      if (storeData.data?.table_config) {
        storeData.data.table_config = storeData.data?.table_config.map(
          (item) => {
            if (item.column_name === "allocated_header") {
              item.sub_headers = item.sub_headers.map((key) => {
                key.is_editable = true;
                return key;
              });
            }
            return item;
          }
        );
        let formattedColumns = agGridColumnFormatter(
          storeData.data?.table_config
        );
        setColumns(formattedColumns);
      }
      if (storeData.data?.table_data) {
        setSelectedArticle(
          props.selectedRowData?.parent_article || props.selectedRowData.article
        );
        setTableData(storeData.data?.table_data);
      }
      setShowloading(false);
    } catch (err) {
      handleErrorMessage(err);
    }
  };
  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        disableOnClose: true,
      },
    });
  };
  const onBlur = async (
    _e,
    _data,
    _column,
    _isChanged,
    _value,
    _initialValue,
    params
  ) => {
    // Store the original value for this cell if not already stored
    const cellKey = _data.size ? _data.size : _data.packs_allocated;

    const currentValue = initialAllocatedUnitsRef.current[cellKey];
    const isValueNotSet =
      currentValue == null || currentValue === false || currentValue === "";
    const hasValueChanged = _initialValue !== _value;

    if (isValueNotSet && hasValueChanged) {
      initialAllocatedUnitsRef.current[cellKey] = _initialValue;
    }
    /**
     * Validates the allocated quantity against various constraints
     * @returns {Object} validation result with status and message
     */
    const validateEditedQuantity = () => {
      // Check if allocated quantity exceeds total available
      const totalAvailable =
        Number(_data.dc_available) + initialAllocatedUnitsRef.current[cellKey];
      if (_data.packs_allocated_qty > totalAvailable) {
        return {
          isValid: false,
          message: "Allocated quantity should be less than total available",
          resetValue: null,
        };
      }

      // All validations passed
      return { isValid: true };
    };

    // Run validation
    const validationResult = validateEditedQuantity();

    /**
     * If validation fails, check if we need to reset the value to a maximum allowed value
     */
    if (!validationResult.isValid) {
      if (validationResult.resetValue !== null) {
        params.node.setDataValue(
          "packs_allocated_qty",
          validationResult.resetValue
        );
      }
      // Drop the invalid row so it is never included in the save payload
      // (cellValueChanged tracks edits independently of validation).
      delete editedRowsRef.current[getRowKey(_data)];
      setIsSaveDisabled(true);
      displaySnackMessages(validationResult.message, "info");
    } else {
      setIsSaveDisabled(false);
    }
  };

  const getRowKey = (row) => `${row.dc_code}__${row.packs_allocated}`;

  // AG Grid fires cellValueChanged on every setDataValue (i.e. every stepper click and every typed change)
  const handleCellValueChanged = (event) => {
    const row = event?.data;
    if (!row) return;
    editedRowsRef.current[getRowKey(row)] = row;
    setIsSaveDisabled(false);
  };

  const onCancel = () => {
    props.onCancel();
  };

  const saveRequest = async () => {
    setShowloading(true);
    try {
      let obj = {};
      Object.values(editedRowsRef.current).forEach((item) => {
        let l_size = item.size;
        let l_packId =
          Object.keys(item.pack_description || {}).find(
            (key) => item.pack_description[key] === l_size
          ) || null;
        let l_packOrSize = item.is_pack ? l_packId : l_size;
        let key = `${item.dc_code}__${item.packs_allocated}`;
        let value = item[`packs_allocated_qty`];
        obj[item.store_code] = {
          ...obj[item.store_code],
          [key]: value,
        };
      });
      let reqBody = {
        allocation_code: props.allocationCode,
        original_allocation_code: props.originalAllocationCode,
        allocation_row: {
          [selectedArticle]: obj,
        },
      };
      let l_response = await props.bulkUpdateAllocatedUnits(reqBody);
      if (l_response?.data?.status) {
        if (!props.originalAllocationCode) {
          props.setOriginalAllocationCode(props.allocationCode);
        }
        if (l_response?.data?.data?.allocation_code) {
          props.setAllocationCode(l_response?.data?.data?.allocation_code);
        } else {
          props.setAllocationCode(null);
          let l_allocationCodeCopy = props.allocationCode;
          props.setAllocationCode(l_allocationCodeCopy);
        }
        displaySnackMessages("Updated Successfully!!", "success");
      }
      setShowloading(false);
      editedRowsRef.current = {};
      props.onCancel();
    } catch (err) {
      handleErrorMessage(err);
    }
  };
  const getTableHeader = () => {
    // TAM-driven (inventorysmart_finalize_allocation): when a tenant configures
    // a field name here, show that field from the row for the header identifier.
    // Falls back to the existing article value when the config key is absent.
    const headerIdentifierField =
      props?.finalizeAllocationConfig?.storeCapacityHeaderIdentifierField;
    const configuredValue = headerIdentifierField
      ? props?.selectedRowData?.[headerIdentifierField]
      : undefined;
    const headerIdentifier =
      configuredValue !== undefined &&
      configuredValue !== null &&
      configuredValue !== ""
        ? configuredValue
        : selectedArticle;
    if (props.showNewStoreCapacityFlowHeader) {
      return "Details";
    }
    return (
      <div className={classes.headerWrapper}>
        <div className={classes.headerContainer}>
          <span>
            {dynamicLabelsBasedOnTenant("product", "inventory")}
            {" : "}
          </span>
          <Typography variant="h4">
            {replaceSpecialCharacter(headerIdentifier)}
          </Typography>
        </div>
        <span>{" | "}</span>
        <div className={classes.headerContainer}>
          <span> {"Net Avl Capacity : "}</span>
          <Typography variant="h4">
            {props.selectedRowData.remaining_available ||
              props.selectedRowData.net_capacity}
          </Typography>
        </div>
      </div>
    );
  };

  return (
    <BottomSheet
      title={
        props.showNewStoreCapacityFlowHeader
          ? "Review Recommendation"
          : "Review Size wise Allocation"
      }
      // size="medium"
      onClose={props.onCancel}
      open={true}
      fullWidth={true}
      primaryButtonLabel={"Save"}
      onPrimaryButtonClick={saveRequest}
      primaryButtonProps={{ disabled: isSaveDisabled }}
      secondaryButtonLabel={"Cancel"}
      onSecondaryButtonClick={onCancel}
    >
      <LoadingOverlay loader={showloading} minHeight={"400px"}>
        {columns.length > 0 && (
          <AgGridComponent
            columns={columns}
            rowdata={tableData}
            sizeColumnsToFitFlag
            onBlur={onBlur}
            cellValueChanged={handleCellValueChanged}
            tableHeader={getTableHeader()}
            disablePaginationForSinglePage
            cardContainer={false}
          />
        )}
      </LoadingOverlay>
    </BottomSheet>
  );
};
const mapStateToProps = (store) => {
  return {
    finalizeAllocationConfig:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartFinalizeAllocationConfig,
  };
};
const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  getColumnsAg: (payload) => dispatch(getColumnsAg(payload)),
  getStoreCapacityTablePopupData: (payload, isV3) =>
    dispatch(getStoreCapacityTablePopupData(payload, isV3)),
  bulkUpdateAllocatedUnits: (payload, isV3) =>
    dispatch(bulkUpdateAllocatedUnits(payload, isV3)),
  setOriginalAllocationCode: (payload) =>
    dispatch(setOriginalAllocationCode(payload)),
  setAllocationCode: (payload) => dispatch(setAllocationCode(payload)),
});
export default connect(mapStateToProps, mapDispatchToProps)(StoreCapacityPopup);
