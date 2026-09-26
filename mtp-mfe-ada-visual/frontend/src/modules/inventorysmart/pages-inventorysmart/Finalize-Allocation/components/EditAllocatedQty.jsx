import { Grid, Typography } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import globalStyles from "core/Styles/globalStyles";
import { isEmpty } from "lodash";
import {
  getpackageDetailsForEdit,
  setAllocationCode,
  setEditAllocatedQtyLoader,
  setOriginalAllocationCode,
  updateAllocatedUnits,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import EditModal from "./EditModal";
import { getDisplayableValueBasedOnTenant } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";

const EditAllocatedQty = (props) => {
  const globalClasses = globalStyles();

  const [editAllocatedQtyTableColumns, setEditAllocatedQtyTableColumns] =
    useState([]);
  const [editAllocatedQtyTableData, setEditAllocatedQtyTableData] = useState(
    []
  );
  const editAllocatedQtyApiResponse = useRef(null);
  const allocatedQtyGridInstance = useRef(null);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  useEffect(() => {
    props.allocationCode &&
      !isEmpty(props.storeRowData) &&
      (async () => {
        let columns = [],
          formattedColumns = [],
          data = [],
          l_responseData = [];
        try {
          props.setEditAllocatedQtyLoader(true);
          let l_response = await props.getpackageDetailsForEdit({
            allocation_code: props.allocationCode,
            article: props.selectedArticle,
            store_code: props.storeRowData.store_code,
            plan_status: props.planStatus,
            plan_type: props.planType,
          });
          if (l_response.data.status) {
            l_responseData = l_response.data.data;
            columns = l_responseData.table_config;
            formattedColumns = agGridColumnFormatter(columns, null);
            formattedColumns = formattedColumns.map((obj) => {
              if (l_responseData.pack_sizes.includes(obj.column_name)) {
                obj.disabled = setCellsToBeDisabled;
              }
              return obj;
            });
            data = l_responseData.table_data?.map((rowData) => {
              return {
                ...rowData,
                ...saveOriginalSizeSplit(rowData, l_responseData.pack_sizes),
              };
            });
          }
        } catch {
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setEditAllocatedQtyLoader(false);
          setEditAllocatedQtyTableColumns(formattedColumns);
          setEditAllocatedQtyTableData(data);
          editAllocatedQtyApiResponse.current = l_responseData;
        }
      })();
  }, [props.storeRowData, props.selectedArticle]);

  const saveOriginalSizeSplit = (p_rowData, p_sizes) => {
    let l_sizeSplit = {};
    p_sizes?.forEach((size) => {
      l_sizeSplit[`${size}_original`] = p_rowData[size];
    });
    return l_sizeSplit;
  };

  const setCellsToBeDisabled = (row) => {
    // string comparision has to removed, next version there will be a new key in api response using which we will perform comparision operation
    return row.pack_id !== "eaches" ? true : false;
  };

  const getUnitsSum = (p_rowData) => {
    let l_sizes = editAllocatedQtyApiResponse?.current?.pack_sizes;
    let l_sum = 0;
    l_sizes?.forEach((size) => {
      l_sum += p_rowData?.[size];
    });
    return l_sum;
  };

  const onCellValueChanged = async (params) => {
    const { colDef, data, newValue, rowIndex } = params;
    if (
      editAllocatedQtyApiResponse?.current?.pack_sizes?.includes(
        colDef.column_name
      )
    ) {
      let itemsToUpdate = [];
      allocatedQtyGridInstance.current.api.forEachNodeAfterFilterAndSort(
        function (rowNode, index) {
          const data = rowNode.data;
          if (index === +rowIndex) {
            data["allocated_units"] = getUnitsSum(data);
            data["units_available"] = "-";
          }
          if (index === +rowIndex + 1) {
            data[colDef.column_name] =
              // data[`${colDef.column_name}_original`] - +newValue;
              data[`units_available__${colDef.column_name}`] - +newValue;
            data["units_available"] = getUnitsSum(data);
            data["allocated_units"] = "-";
          }

          itemsToUpdate.push(data);
        }
      );
      itemsToUpdate.push(data);
      allocatedQtyGridInstance.current.api.refreshCells({
        update: itemsToUpdate,
      });
    }
  };

  const onCancel = () => {
    props.setShowSetAllModal(false);
  };

  const getSizeWiseDataForAllocatedAndAvailable = (p_rowData) => {
    // keys to be retained in object
    const l_filteredKeys = editAllocatedQtyApiResponse?.current?.pack_sizes;

    const l_filteredData = l_filteredKeys.reduce(
      (obj, key) => ({ ...obj, [key]: p_rowData[key] }),
      {}
    );
    return {
      [p_rowData.dc_code]: l_filteredData,
    };
  };

  const onSaveHandler = async () => {
    try {
      props.resetProductStoreDetailsState();

      props.setEditAllocatedQtyLoader(true);
      let l_editedTableData = [];
      allocatedQtyGridInstance?.current?.api.forEachNode((node) => {
        l_editedTableData.push(node.data);
      });
      let l_requestToUpdateAllocatedQty = {};
      l_editedTableData.forEach((rowData) => {
        if (rowData.pack_id === "eaches") {
          l_requestToUpdateAllocatedQty["updated_eaches"] = {
            ...l_requestToUpdateAllocatedQty["updated_eaches"],
            ...getSizeWiseDataForAllocatedAndAvailable(rowData),
          };
        } else {
          l_requestToUpdateAllocatedQty["available_eaches"] = {
            ...l_requestToUpdateAllocatedQty["available_eaches"],
            ...getSizeWiseDataForAllocatedAndAvailable(rowData),
          };
        }
      });
      l_requestToUpdateAllocatedQty["allocation_code"] = props.allocationCode;
      l_requestToUpdateAllocatedQty["original_allocation_code"] =
        props.originalAllocationCode;
      l_requestToUpdateAllocatedQty["store_code"] =
        props.storeRowData.store_code;
      l_requestToUpdateAllocatedQty["article"] = props.selectedArticle;
      let l_response = await props.updateAllocatedUnits(
        l_requestToUpdateAllocatedQty
      );
      if (l_response?.data?.status) {
        if (!props.originalAllocationCode) {
          props.setOriginalAllocationCode(props.allocationCode);
        }
        if (l_response?.data?.data?.allocation_code) {
          props.setAllocationCode(l_response?.data?.data?.allocation_code);
        } else {
          // TODO - to be revisited with setting allocated code
          props.setAllocationCode(null);
          let l_allocationCodeCopy = props.allocationCode;
          props.setAllocationCode(l_allocationCodeCopy);
        }
        props.setShowSetAllModal(false);
        displaySnackMessages("Updated Successfully!!", "success");
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setEditAllocatedQtyLoader(false);
    }
  };

  const loadTableInstance = (params) => {
    allocatedQtyGridInstance.current = params;
  };
  return (
    <EditModal
      onSaveHandler={onSaveHandler}
      onCancel={onCancel}
      saveButtonLabel={"Save Edit"}
      heading="Edit Allocated Quantity"
    >
      <div className={globalClasses.contentBody}>
        <Loader loader={props.editAllocatedQtyLoader}>
          <Grid container justifyContent="center" alignItems="center">
            <Typography variant="h5" className={globalClasses.paperHeader}>
              Store Number-{" "}
              {getDisplayableValueBasedOnTenant(
                props.storeRowData,
                "store_code",
                props.displayInfoMapping
              )}
            </Typography>
            <Typography variant="h5" className={globalClasses.paperHeader}>
              {dynamicLabelsBasedOnTenant("style_color")} -{" "}
              {props.selectedArticle}
            </Typography>
          </Grid>
          <AgGridComponent
            columns={editAllocatedQtyTableColumns}
            rowdata={editAllocatedQtyTableData}
            onCellValueChanged={onCellValueChanged}
            //   uniqueRowId={"pack_id"}
            loadTableInstance={loadTableInstance}
            suppressFieldDotNotation
          />
        </Loader>
      </div>
    </EditModal>
  );
};

const mapStateToProps = (store) => {
  return {
    editAllocatedQtyLoader:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .editAllocatedQtyLoader,
    allocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .allocationCode,
    originalAllocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .originalAllocationCode,
    planStatus:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planStatus,
    planType:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planType,
    displayInfoMapping:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig.displayInfoMapping,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
  setEditAllocatedQtyLoader: (payload) =>
    dispatch(setEditAllocatedQtyLoader(payload)),
  getpackageDetailsForEdit: (payload) =>
    dispatch(getpackageDetailsForEdit(payload)),
  updateAllocatedUnits: (payload) => dispatch(updateAllocatedUnits(payload)),
  setAllocationCode: (payload) => dispatch(setAllocationCode(payload)),
  setOriginalAllocationCode: (payload) =>
    dispatch(setOriginalAllocationCode(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(EditAllocatedQty);
