import { Grid, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";

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
  getpackageDetailsForBulkEdit,
  setAllocationCode,
  setEditAllocatedQtyLoader,
  setOriginalAllocationCode,
  bulkUpdateAllocatedUnits,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import EditModal from "./EditModal";
import Form from "core/Utils/form";
import moment from "moment";

const useStyles = makeStyles(() => ({
  contentBody: {
    margin: "2rem 0rem",
  },
}));

const BulkEditAllocatedQty = (props) => {
  const globalClasses = globalStyles();

  const [editAllocatedQtyTableColumns, setEditAllocatedQtyTableColumns] =
    useState([]);
  const [editAllocatedQtyTableData, setEditAllocatedQtyTableData] = useState(
    []
  );
  const [formData, setFormData] = useState({});
  const [userEditsForAllEdits, setUserEditsForAllEdits] = useState({});

  const bulkEditAllocatedQtyApiResponse = useRef(null);
  const allocatedQtyGridInstance = useRef(null);

  const classes = useStyles();

  // function adds few specific properties/attributes based on type of column config
  // ex: disablePast for type - DateTimeField and options for type - list etc...
  const getRestOfThePropertiesBasedOnType = (p_editableColumn) => {
    let l_columnProperties = {};

    switch (p_editableColumn.type) {
      case "datetime":
        l_columnProperties["field_type"] = "DateTimeField";
        l_columnProperties["disablePast"] = p_editableColumn.extra.disablePast
          ? true
          : false;
        break;
      case "list":
        l_columnProperties["field_type"] = "dropdown";
        l_columnProperties["isMulti"] = p_editableColumn.extra.isMulti
          ? true
          : false;
        l_columnProperties["options"] = p_editableColumn.extra.options;
        break;
      default:
        l_columnProperties["field_type"] = "str";
        break;
    }
    return l_columnProperties;
  };

  const PRODUCT_STORE_DETAILS_SET_ALL_FIELDS = props.columns
    ?.filter((column) => column?.extra?.bulkEdit)
    ?.map((editableColumn) => {
      return {
        label: editableColumn.headerName,
        is_disabled: false,
        accessor: editableColumn.accessor,
        ...getRestOfThePropertiesBasedOnType(editableColumn),
      };
    });

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const getSizeLevelAvailableInventory = (
    p_rowData,
    p_dcSizeAllocatedQtyMapping
  ) => {
    let l_sizes = p_rowData["size"],
      l_sizeAvailableMapping = {};

    l_sizes.forEach((val, index) => {
      l_sizeAvailableMapping[val] =
        p_rowData["size_dc_available_value"][index] +
        p_dcSizeAllocatedQtyMapping[val][p_rowData["dc_code"]];
    });
    return l_sizeAvailableMapping;
  };

  const groupByDcAndGetSumOfAllocatedAtSizeLevel = (
    p_array,
    p_groupByKey,
    p_sumKey
  ) => {
    // returns dc and allocated qty mapping
    // sample : {"dc1": 90,"dc2": 89}
    return p_array.reduce(
      (acc, item) => (
        (acc[item[p_groupByKey]] =
          (acc[item[p_groupByKey]] || 0) + item[p_sumKey]),
        acc
      ),
      {}
    );
  };

  useEffect(() => {
    if (!isEmpty(props.selectedRowsForBulkEdit)) {
      if (props.isV3?.includes("bulkEditPopUp")) {
        (async () => {
          let columns = [],
            formattedColumns = [],
            l_responseData = [];
          try {
            props.setEditAllocatedQtyLoader(true);
            let l_response = await props.getpackageDetailsForBulkEdit(
              {
                allocated: props.selectedRowsForBulkEdit,
                available: props.availableproductStoreDetailsTableData[0],
                table_config: props.availableColumns,
              },
              props.isV3?.includes("bulkEditPopUp")
            );
            if (l_response.data.status) {
              l_responseData = l_response.data.data;
              columns = l_responseData.table_config;
              formattedColumns = agGridColumnFormatter(columns, null);
              formattedColumns = formattedColumns.map((obj) => {
                if (obj.column_name === "sizes_dynamic") {
                  for (let i = 0; i < obj.sub_headers.length; i++) {
                    for (
                      let j = 0;
                      j < obj.sub_headers[i].sub_headers.length;
                      j++
                    ) {
                      obj.sub_headers[i].sub_headers[j].disabled =
                        setCellsToBeDisabled;
                    }
                  }
                }
                return obj;
              });
            }
          } catch {
            displaySnackMessages(ERROR_MESSAGE, "error");
          } finally {
            props.setEditAllocatedQtyLoader(false);
            setEditAllocatedQtyTableColumns(formattedColumns);
            setEditAllocatedQtyTableData(l_responseData.table_data);
            bulkEditAllocatedQtyApiResponse.current = l_responseData;
          }
        })();
      } else {
        (async () => {
          let columns = [],
            formattedColumns = [],
            l_responseData = [];
          try {
            // size, dc and allocated qty mapping
            // sample : {"size1": {"dc1": 90,"dc2": 89}, "size2": {"dc1": 70,"dc2": 69}}
            let l_dcSizeAllocatedQtyMapping = {},
              l_selectedRows = props.selectedRowsForBulkEdit;
            l_selectedRows[0]["size"].forEach((size) => {
              l_dcSizeAllocatedQtyMapping[size] =
                groupByDcAndGetSumOfAllocatedAtSizeLevel(
                  l_selectedRows,
                  "dc_code",
                  `size_value_allocated_eaches__${size}`
                );
            });
            let l_uniqueRows = [
              ...new Map(
                l_selectedRows.map((item) => [item["dc_code"], item])
              ).values(),
            ];
            props.setEditAllocatedQtyLoader(true);
            let l_dcDetailsInReq = [];
            l_uniqueRows?.forEach((val) => {
              l_dcDetailsInReq.push({
                dc_code: val.dc_code,
                dc_name: val.dc,
                ...getSizeLevelAvailableInventory(
                  val,
                  l_dcSizeAllocatedQtyMapping
                ),
              });
            });
            let l_response = await props.getpackageDetailsForBulkEdit({
              article: props.selectedArticle,
              no_of_stores_selected: l_selectedRows?.length,
              dcs: l_dcDetailsInReq,
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
            }
          } catch {
            displaySnackMessages(ERROR_MESSAGE, "error");
          } finally {
            props.setEditAllocatedQtyLoader(false);
            setEditAllocatedQtyTableColumns(formattedColumns);
            setEditAllocatedQtyTableData(l_responseData.table_data);
            bulkEditAllocatedQtyApiResponse.current = l_responseData;
          }
        })();
      }
    }
  }, [props.selectedRowsForBulkEdit, props.selectedArticle]);

  const setCellsToBeDisabled = (row) => {
    return row.disable ? true : false;
  };

  const onCellValueChanged = async (params) => {
    const { colDef, data, newValue, rowIndex } = params;
    if (
      bulkEditAllocatedQtyApiResponse?.current?.pack_sizes?.includes(
        colDef.column_name
      )
    ) {
      let itemsToUpdate = [];
      allocatedQtyGridInstance.current.api.forEachNodeAfterFilterAndSort(
        function (rowNode, index) {
          const data = rowNode.data;
          if (index === +rowIndex + 1) {
            data[colDef.column_name] =
              data[`units_available__${colDef.column_name}`] - +newValue;
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
    const l_filteredKeys = bulkEditAllocatedQtyApiResponse?.current?.pack_sizes;

    const l_filteredData = l_filteredKeys.reduce(
      (obj, key) => ({ ...obj, [key]: p_rowData[key] }),
      {}
    );
    return {
      [p_rowData.dc_code]: l_filteredData,
    };
  };

  const onSaveHandler = async () => {
    if (props.isV3?.includes("bulkEdit")) {
      try {
        props.resetProductStoreDetailsState();
        props.setEditAllocatedQtyLoader(true);
        let l_selectedStores = props.selectedRowsForBulkEdit?.map(
          (storeDetails) => storeDetails.store_code
        );
        let l_editedValuesForAllStores = {},
          l_requestToUpdateAllocatedQty = {};

        l_selectedStores.forEach((val) => {
          l_editedValuesForAllStores[val] = {
            ...userEditsForAllEdits,
            ...(formData?.delivery_dt
              ? {
                  delivery_dt: moment(formData.delivery_dt).format(
                    "MM/DD/YYYY"
                  ),
                }
              : {}),
            ...(formData.order_type ? { order_type: formData.order_type } : {}),
          };
        });
        l_requestToUpdateAllocatedQty["allocation_code"] =
          props.originalAllocationCode || props.allocationCode;
        l_requestToUpdateAllocatedQty["edited_allocation_code"] =
          !props.originalAllocationCode ? null : props.allocationCode;
        l_requestToUpdateAllocatedQty["allocation_row"] = {
          [props.selectedArticle]: l_editedValuesForAllStores,
        };
        let l_response = await props.bulkUpdateAllocatedUnits(
          l_requestToUpdateAllocatedQty,
          props.isV3?.includes("bulkEdit")
        );
        if (l_response?.data?.status) {
          let l_productStoreDetailsTableInstance =
            props.productStoreDetailsTableInstance;
          l_productStoreDetailsTableInstance?.api?.deselectAll();
          l_productStoreDetailsTableInstance.api.refreshServerSideStore({
            purge: true,
          });

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
      } catch (err) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      } finally {
        props.setEditAllocatedQtyLoader(false);
      }
    } else {
      try {
        props.resetProductStoreDetailsState();
        props.setEditAllocatedQtyLoader(true);
        let l_editedTableData = [];
        allocatedQtyGridInstance?.current?.api.forEachNode((node) => {
          l_editedTableData.push(node.data);
        });
        let l_requestToUpdateAllocatedQty = {};
        l_editedTableData.forEach((rowData) => {
          if (rowData.pack_id === "Eaches per store") {
            l_requestToUpdateAllocatedQty["updated_eaches"] = {
              ...l_requestToUpdateAllocatedQty["updated_eaches"],
              ...getSizeWiseDataForAllocatedAndAvailable(rowData),
            };
          }
          //TODO: refactoring after implementing generic logic for original and edited allocation code logic in BE for all edit apis
          else if (!props.isV3?.includes("bulkEdit")) {
            l_requestToUpdateAllocatedQty["available_eaches"] = {
              ...l_requestToUpdateAllocatedQty["available_eaches"],
              ...getSizeWiseDataForAllocatedAndAvailable(rowData),
            };
          }
        });
        if (props.isV3?.includes("bulkEdit")) {
          l_requestToUpdateAllocatedQty["allocation_code"] =
            props.originalAllocationCode || props.allocationCode;
          l_requestToUpdateAllocatedQty["edited_allocation_code"] =
            !props.originalAllocationCode ? null : props.allocationCode;
          l_requestToUpdateAllocatedQty["allocation_code"] =
            props.originalAllocationCode || props.allocationCode;
          l_requestToUpdateAllocatedQty["edited_allocation_code"] =
            !props.originalAllocationCode ? null : props.allocationCode;
          l_requestToUpdateAllocatedQty["allocation_row"] =
            props?.selectedRowsForBulkEdit?.map((selectedRow) => {
              return {
                store_code: selectedRow.store_code,
                article: props.selectedArticle,
                updated_packs: {},
                updated_eaches: l_requestToUpdateAllocatedQty["updated_eaches"],
              };
            });
        } else {
          l_requestToUpdateAllocatedQty["allocation_code"] =
            props.allocationCode;
          l_requestToUpdateAllocatedQty["original_allocation_code"] =
            props.originalAllocationCode;
          l_requestToUpdateAllocatedQty["article"] = props.selectedArticle;
          l_requestToUpdateAllocatedQty["stores_dc_allocation"] =
            props?.selectedRowsForBulkEdit?.map((selectedRow) => {
              return {
                store_code: selectedRow.store_code,
                updated_eaches: l_requestToUpdateAllocatedQty["updated_eaches"],
                delivery_dt: formData?.delivery_dt
                  ? moment(formData.delivery_dt).format("MM/DD/YYYY")
                  : null,
                order_type: formData.order_type ? formData.order_type : null,
              };
            });
        }
        delete l_requestToUpdateAllocatedQty["updated_eaches"];
        let l_response = await props.bulkUpdateAllocatedUnits(
          l_requestToUpdateAllocatedQty,
          props.isV3?.includes("bulkEdit")
        );
        if (l_response?.data?.status) {
          let l_productStoreDetailsTableInstance =
            props.productStoreDetailsTableInstance;
          l_productStoreDetailsTableInstance?.api?.deselectAll();
          l_productStoreDetailsTableInstance.api.refreshServerSideStore({
            purge: true,
          });

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
      } catch (err) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      } finally {
        props.setEditAllocatedQtyLoader(false);
      }
    }
  };

  const onBlur = async (_e, data, column, _, value, initialValue) => {
    if (props.isV3?.includes("productStoreDetails")) {
      let l_column = column.colId;
      setUserEditsForAllEdits((old) => {
        return {
          ...old,
          [l_column]: data?.[l_column],
        };
      });
    }
  };

  const loadTableInstance = (params) => {
    allocatedQtyGridInstance.current = params;
  };

  const handleChange = (data) => {
    setFormData(data);
  };
  return (
    <EditModal
      onSaveHandler={onSaveHandler}
      onCancel={onCancel}
      saveButtonLabel={"Save Bulk Edit"}
      heading="Bulk Edit"
    >
      <div className={globalClasses.contentBody}>
        <Loader loader={props.editAllocatedQtyLoader}>
          <Grid container justifyContent="center" alignItems="center">
            {props.showStyleDescription && (
              <Typography variant="h5" className={globalClasses.paperHeader}>
                Style Description- {props?.selectedData?.description}
              </Typography>
            )}
            <Typography variant="h5" className={globalClasses.paperHeader}>
              {dynamicLabelsBasedOnTenant("style_color")} -{" "}
              {props.selectedArticle}
            </Typography>
          </Grid>
          <div className={classes.contentBody}>
            <Form
              maxFieldsInRow={3}
              layout={"vertical"}
              handleChange={handleChange}
              fields={PRODUCT_STORE_DETAILS_SET_ALL_FIELDS}
              updateDefaultValue={true}
              defaultValues={{}}
            ></Form>
          </div>
          <AgGridComponent
            columns={editAllocatedQtyTableColumns}
            rowdata={editAllocatedQtyTableData}
            onCellValueChanged={onCellValueChanged}
            onBlur={onBlur}
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
    isV3: store?.inventorysmartReducer?.inventorySmartCommonService
      ?.inventorysmartScreenConfig?.isV3,
    showStyleDescription:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.showStyleDescription,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
  setEditAllocatedQtyLoader: (payload) =>
    dispatch(setEditAllocatedQtyLoader(payload)),
  getpackageDetailsForBulkEdit: (payload, isV3) =>
    dispatch(getpackageDetailsForBulkEdit(payload, isV3)),
  bulkUpdateAllocatedUnits: (payload, isV3) =>
    dispatch(bulkUpdateAllocatedUnits(payload, isV3)),
  setAllocationCode: (payload) => dispatch(setAllocationCode(payload)),
  setOriginalAllocationCode: (payload) =>
    dispatch(setOriginalAllocationCode(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(BulkEditAllocatedQty);
