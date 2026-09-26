import { Grid, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";

import React, { useEffect, useRef, useState } from "react";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import {
  ERROR_MESSAGE,
  FILL_MANDATORY_FIELDS,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import globalStyles from "core/Styles/globalStyles";
import { find, isEmpty } from "lodash";
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
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { setFetchArticleSummary, setFetchProductDetails } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { setProductStoreViewSummaryLoader } from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import { setProductViewLoader } from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import { setProductStoreViewLoader } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { getNearestMultiple } from "../../../utils-inventorysmart/utilityFunctions";

const useStyles = makeStyles(() => ({
  contentBody: {
    margin: "2rem 0rem",
  },
}));

const BulkEditAllocatedQty = (props) => {
  const globalClasses = globalStyles();

  const [
    editAllocatedQtyTableColumns,
    setEditAllocatedQtyTableColumns,
  ] = useState([]);
  const [editAllocatedQtyTableData, setEditAllocatedQtyTableData] = useState(
    []
  );
  const [formData, setFormData] = useState({});
  const [userEditsForAllEdits, setUserEditsForAllEdits] = useState({});

  const bulkEditAllocatedQtyApiResponse = useRef(null);
  const allocatedQtyGridInstance = useRef(null);
  const saveButtonPressedRef = useRef(false);
  const blockSaveDueToValueAdjustment = useRef(false);

  const classes = useStyles();

  // function adds few specific properties/attributes based on type of column config
  // ex: disablePast for type - DateTimeField and options for type - list etc...
  const getRestOfThePropertiesBasedOnType = (p_editableColumn) => {
    let l_columnProperties = {};

    switch (p_editableColumn.type) {
      case "datetime":
        l_columnProperties["field_type"] = "DateTimeField";

        l_columnProperties["disablePast"] = true;

        break;
      case "list":
        l_columnProperties["field_type"] = "dropdown";
        l_columnProperties["isMulti"] = p_editableColumn.extra.isMulti
          ? true
          : false;
        l_columnProperties["options"] = p_editableColumn.extra.options
          ? p_editableColumn.extra.options
          : props?.[p_editableColumn.extra.optionsColumn];
        l_columnProperties["required"] = p_editableColumn.extra.required
          ? true
          : false;
        break;
      case "dynamic-list":
        l_columnProperties["field_type"] = "dropdown";
        l_columnProperties["isMulti"] = p_editableColumn.extra.isMulti
          ? true
          : false;
        l_columnProperties["options"] =
          props.selectedRowsForBulkEdit[0][
            `${p_editableColumn.column_name}_options`
          ];
        l_columnProperties["required"] = p_editableColumn.extra.required
          ? true
          : false;
        break;
      default:
        l_columnProperties["field_type"] = "str";
        break;
    }
    return l_columnProperties;
  };

  const PRODUCT_STORE_DETAILS_SET_ALL_FIELDS = props.columns
    ?.filter(
      (column) =>
        column.column_name === "delivery_dt" ||
        column.column_name === "ticket_type" ||
        column.column_name === "store_start_date" ||
        column.column_name === "store_end_date" ||
        column.column_name === "shipping_date"
    )
    ?.map((editableColumn) => {
      return {
        label: editableColumn.headerName,
        is_disabled: false,
        accessor: editableColumn.accessor,
        shouldDisableDate: (date) => {
          if (props.calendarDayShippingDateDefaults === true) return null;
          let dayNumber = moment(date).day();
          if (
            editableColumn.column_name === "store_start_date" ||
            editableColumn.column_name === "store_end_date"
          ) {
            return null;
          } else {
            return dayNumber === 0 || dayNumber === 6;
          }
        },
        ...getRestOfThePropertiesBasedOnType(editableColumn),
      };
    });
  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        disableOnClose: true,
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

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
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
                      obj.sub_headers[i].sub_headers[
                        j
                      ].disabled = setCellsToBeDisabled;
                    }
                  }
                }
                return obj;
              });
            }
          } catch (e) {
            handleErrorMessage(e);
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
            props.setEditAllocatedQtyLoader(true);
            let staticCol = {
              column_name: "type",
              label: "",
              is_editable: false,
              type: "str",
            };
            let editablecols = props.columns.filter(
              (item) => item.column_name === "allocated_qty_by_pack_dc_level"
            );
            editablecols = editablecols.map((item) => {
              if (item.sub_headers?.length > 0) {
                item.sub_headers = item.sub_headers.map((sub) => {
                  if (sub.sub_headers?.length > 0) {
                    sub.sub_headers = sub.sub_headers
                      .filter(
                        (item) =>
                          !item.column_name.includes("packs_rounding_factor__")
                      )
                      .map((col) => {
                        col.disabled = setCellsToBeDisabled;

                        return col;
                      });
                    return sub;
                  }
                });
              }
              item.disabled = setCellsToBeDisabled;
              return item;
            });
            editablecols = [staticCol, ...editablecols];
            formattedColumns = agGridColumnFormatter(editablecols, null);
            formattedColumns = formattedColumns.map((obj) => {
              obj.disabled = setCellsToBeDisabled;
              return obj;
            });
            let table_data = [
              {
                type: "Total Allocated Quantity",
              },
              {
                type: "Total Available Quantity Per Store",
                disable: true,
              },
            ];
            let alreadyAllocatedValues = {};
            let finalValues = {};

            // Build per-DC store count based on dc_codes of each selected store
            let dcStoreCount = {};
            props.selectedRowsForBulkEdit.forEach((item) => {
              const storeDcCodes = (item.dc_codes || "")
                .split(",")
                .map((code) => code.trim())
                .filter(Boolean);
              storeDcCodes.forEach((dcCode) => {
                dcStoreCount[dcCode] = (dcStoreCount[dcCode] || 0) + 1;
              });

              Object.keys(item).map((key) => {
                if (key.includes("allocated_quantity__dc__")) {
                  alreadyAllocatedValues[key] = alreadyAllocatedValues[key]
                    ? alreadyAllocatedValues[key]
                    : 0;
                  alreadyAllocatedValues[key] =
                    alreadyAllocatedValues[key] + item[key];
                }
              });
            });
            Object.keys(props.selectedRowsForBulkEdit[0]).map((key) => {
              if (
                key.includes("net_dc_available__") &&
                !key.includes("bulk_edit")
              ) {
                let allocatedkey = key.split("net_dc_available__");
                let dcallocatedkey = `allocated_quantity__dc__${allocatedkey[1]}`;

                // Match DC code from the key against known DCs in dcStoreCount
                const dcCode = Object.keys(dcStoreCount).find((dc) =>
                  key.includes(`__${dc}__`) || key.endsWith(`__${dc}`)
                );
                const storesWithThisDc = (dcCode && dcStoreCount[dcCode]) || props.selectedRowsForBulkEdit.length;

                if (!dcCode) {
                  finalValues[dcallocatedkey] = 0;
                } else if (props.selectAll) {
                  finalValues[dcallocatedkey] =
                    (props.availableproductStoreDetailsTableData[0][`bulk_edit_${key}`] || 0) /
                    storesWithThisDc;
                } else {
                  finalValues[dcallocatedkey] =
                    (alreadyAllocatedValues[dcallocatedkey] || 0) +
                    (props.availableproductStoreDetailsTableData[0][key] || 0);
                  finalValues[dcallocatedkey] =
                    finalValues[dcallocatedkey] /
                    storesWithThisDc;
                }
              }
            });

            table_data[1] = { ...table_data[1], ...finalValues };
            setEditAllocatedQtyTableData(table_data);
          } catch (e) {
            handleErrorMessage(e);
          } finally {
            props.setEditAllocatedQtyLoader(false);

            setEditAllocatedQtyTableColumns(formattedColumns);
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
  const onSaveMouseDown = () => {
    saveButtonPressedRef.current = true;
  };

  const onSaveHandler = async () => {
    const shouldBlockSave = blockSaveDueToValueAdjustment.current;
    saveButtonPressedRef.current = false;
    blockSaveDueToValueAdjustment.current = false;

    if (shouldBlockSave) {
      return;
    }

    props.setEditAllocatedQtyLoader(true);
    try {
      let l_requestToUpdateAllocatedQty = {};
      l_requestToUpdateAllocatedQty["allocation_code"] = props.allocationCode;
      l_requestToUpdateAllocatedQty["original_allocation_code"] =
        props.originalAllocationCode;
      let allocatedValues = {};
      let allocated_rows = {};
      Object.keys(userEditsForAllEdits).forEach((key) => {
        let data = userEditsForAllEdits[key];
        let l_column = key;
        const baseColumnName = l_column.replace("allocated_quantity__dc__", "");
        const columnNameForPayload =
          props.sendEditLabel && data.columnLabel
            ? baseColumnName.split("__")[0] + "__" + data.columnLabel
            : baseColumnName;
        allocated_rows[columnNameForPayload] = data.value;
      });
      props?.selectedRowsForBulkEdit?.forEach((selectedRow) => {
        let obj = {
          [selectedRow.store_code]: {
            ...allocated_rows,
        }
      }
        if(formData.delivery_dt || selectedRow.delivery_dt) {
          obj[selectedRow.store_code] = {
             ...obj[selectedRow.store_code],
            delivery_dt: formData?.delivery_dt
              ? moment(formData.delivery_dt).format("MM/DD/YYYY")
              : moment(selectedRow.delivery_dt).format("MM/DD/YYYY"),
        };
        }
        if (formData.ticket_type) {
          obj[selectedRow.store_code] = {
            ...obj[selectedRow.store_code],
            ticket_type:
              formData?.ticket_type?.length > 0 ? formData?.ticket_type : "",
          };
        }
        if (formData.store_end_date) {
          obj[selectedRow.store_code] = {
            ...obj[selectedRow.store_code],
            store_end_date: formData?.store_end_date
              ? moment(formData.store_end_date).format("MM/DD/YYYY")
              : moment(selectedRow.store_end_date).format("MM/DD/YYYY"),
          };
        }
        if (formData.store_start_date) {
          obj[selectedRow.store_code] = {
            ...obj[selectedRow.store_code],
            store_start_date: formData?.store_start_date
              ? moment(formData.store_start_date).format("MM/DD/YYYY")
              : moment(selectedRow.store_start_date).format("MM/DD/YYYY"),
          };
        }
         if (formData.shipping_date) {
          obj[selectedRow.store_code] = {
            ...obj[selectedRow.store_code],
            shipping_date: formData?.shipping_date
              ? moment(formData.shipping_date).format("MM/DD/YYYY")
              : moment(selectedRow.shipping_date).format("MM/DD/YYYY"),
          };
        }

        allocatedValues = { ...allocatedValues, ...obj };
      });
      l_requestToUpdateAllocatedQty["allocation_row"] = {
        [props.selectedArticle]: allocatedValues,
      };
      l_requestToUpdateAllocatedQty["edit_type"] = "bulk";
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
        props.setButtonEnabled(0);
        if (!props.originalAllocationCode) {
          props.setOriginalAllocationCode(props.allocationCode);
        }
        if (l_response?.data?.data?.allocation_code) {
          props.setAllocationCode(l_response?.data?.data?.allocation_code);
        } else {
          // TODO - to be revisited with setting allocated code
          let l_allocationCodeCopy = props.allocationCode;
          props.setAllocationCode(l_allocationCodeCopy);
        }
        props.setFetchArticleSummary(true);
        props.setProductStoreViewSummaryLoader(true);
        props.setProductViewLoader(true);
        props.setProductStoreViewLoader(true);
        props.setShowSetAllModal(false);
        displaySnackMessages("Updated Successfully!!", "success");
      }
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      props.setEditAllocatedQtyLoader(false);
    }
  };

  const onBlur = async (_e, data, column, _, value, initialValue) => {
    let l_column = column.colId;
    const tempValue = getNearestMultiple(
      value,
      props?.selectedData?.inner_pack_units || 1,
      editAllocatedQtyTableData[1]?.[l_column]
    );
    if (tempValue !== value) {
      value = tempValue;
      let rowNode = allocatedQtyGridInstance.current?.api.getRenderedNodes()[0];
      rowNode.setDataValue(l_column, value);
      if (saveButtonPressedRef.current) {
        blockSaveDueToValueAdjustment.current = true;
      }
      displaySnackMessages(
        "The entered value is not a multiple of the inner pack units so it has been adjusted to the nearest multiple",
        "error"
      );
    }
    setUserEditsForAllEdits((old) => {
      return {
        ...old,
        [l_column]: {
          value: value,
          columnLabel: column?.colDef?.originalLabel || old[l_column]?.columnLabel,
        },
      };
    });
    saveButtonPressedRef.current = false;
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
      onSaveMouseDown={onSaveMouseDown}
      onCancel={onCancel}
      saveButtonLabel={"Save Bulk Edit"}
      heading="Bulk Edit"
      size="large"
      isApplyDisabled={props.editAllocatedQtyLoader}
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
              {dynamicLabelsBasedOnTenant("Article")} -{" "}
              {replaceSpecialCharacter(
                props.displayArticle || props.selectedArticle
              )}
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
            uniqueRowId={"type"}
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
    isV3:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isV3,
    showStyleDescription:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.showStyleDescription,
    calendarDayShippingDateDefaults:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartCreateAllocationConfig
        ?.calendar_day_shipping_date_defaults
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
  setFetchArticleSummary: (payload) =>
    dispatch(setFetchArticleSummary(payload)),
  setProductStoreViewSummaryLoader: (payload) =>
    dispatch(setProductStoreViewSummaryLoader(payload)),
  setProductViewLoader: (payload) => dispatch(setProductViewLoader(payload)),
  setProductStoreViewLoader: (payload) =>
    dispatch(setProductStoreViewLoader(payload)),
  setOriginalAllocationCode: (payload) =>
    dispatch(setOriginalAllocationCode(payload)),
  setFetchProductDetails: (payload) =>
    dispatch(setFetchProductDetails(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(BulkEditAllocatedQty);
