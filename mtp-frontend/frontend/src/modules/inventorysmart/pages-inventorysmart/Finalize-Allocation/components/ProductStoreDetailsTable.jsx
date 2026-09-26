import { Button, Grid, Paper, Typography } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { connect } from "react-redux";
import {
  bulkUpdateAllocatedUnits,
  getProductStoreView,
  setAllocationCode,
  setOriginalAllocationCode,
  setProductStoreViewLoader,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { addSnack } from "core/actions/snackbarActions";
import {
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  CASE_PACK_ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import EditAllocatedQty from "./EditAllocatedQty";
import BulkEditAllocatedQty from "./BulkEditAllocatedQty";
import ProductStoreSizeDetailsTable from "./ProductStoreSizeDetails";
import {
  getIgnoreAllocationCode,
  shouldDisplayFinalizeButtons,
  shouldDisplayGridBulkEditButtons,
  shouldDisplaySelectComponent,
} from "../../Create-Allocation/helperFunctions";
import { cloneDeep, isEmpty, isNumber } from "lodash";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import moment from "moment";
import StoreSizeModal from "./StoreSizeModal";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { setVCPQErrorData } from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";

const ProductStoreDetailsTable = (props) => {
  const flowType = new URLSearchParams(window.location.search).get("flow");

  const globalClasses = globalStyles();
  const classes = useStyles();
  
  const [
    productStoreDetailsTableColumns,
    setProductStoreDetailsTableColumns,
  ] = useState([]);
  const [prePackData, setPrePackData] = useState([]);
  const [
    productStoreDetailsTableData,
    setProductStoreDetailsTableData,
  ] = useState([]);
  const [
    productStoreDetailsTableDataCopy,
    setProductStoreDetailsTableDataCopy,
  ] = useState([]);
  const [editAllocatedQty, setEditAllocatedQty] = useState(false);
  const [bulkEditAllocatedQty, setBulkEditAllocatedQty] = useState(false);
  const [storeRowData, setStoreRowData] = useState({});
  const [selectedRowsForBulkEdit, setSelectedRowsForBulkEdit] = useState([]);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [
    availableProductStoreDetailsTableColumns,
    setavailableProductStoreDetailsTableColumns,
  ] = useState([]);
  const [
    availableproductStoreDetailsTableData,
    setavailableProductStoreDetailsTableData,
  ] = useState([]);
  const [
    availableproductStoreDetailsTableDataCopy,
    setavailableProductStoreDetailsTableDataCopy,
  ] = useState([]);
  const [userEdits, setUserEdits] = useState({});
  const [userEditsForAllEdits, setUserEditsForAllEdits] = useState({});
  const [disabledForViewOnlyAccess, setDisabledForViewOnlyAccess] = useState(
    false
  );
  const [reMount, setReMount] = useState(true);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [
    downloadFormatChipsDependency,
    setDownloadFormatChipsDependency,
  ] = useState({});
  const [openPopup, setOpenPopup] = useState(false);
  const [columnSelected, setColumnSelected] = useState(null);
  const [modalColumns, setModalColumns] = useState([]);
  const [modalRows, setModalRows] = useState([]);
  const [dcs, setDcs] = useState([]);
  const [viewStoreDistributionTable, setViewStoreDistributionTable] = useState(
    false
  );
  const casePackErr = useRef(false);

  const productStoreDetailsTableInstance = useRef(null);
  const availableproductStoreDetailsTableInstance = useRef(null);

  useEffect(() => {
    !isEmpty(productStoreDetailsTableData) &&
      setProductStoreDetailsTableDataCopy(
        cloneDeep(productStoreDetailsTableData)
      );
  }, [productStoreDetailsTableData]);

  useEffect(() => {
    !isEmpty(availableproductStoreDetailsTableData) &&
      setavailableProductStoreDetailsTableDataCopy(
        cloneDeep(availableproductStoreDetailsTableData)
      );
  }, [availableproductStoreDetailsTableData]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const shoulDisable = (p_inventorysmartModulesPermission) => {
    return isActionAllowedOnSubModule(
      p_inventorysmartModulesPermission,
      "inventorysmart_create_allocation",
      INVENTORY_SUBMODULES_NAMES.INVENTORY_FINALIZE_PRODUCT_STORE_TABLE,
      "create"
    );
  };

  const onClickHandlerForLink = (p_data, p_column) => {
    setColumnSelected(p_column);
    setModalRows([p_data]);
    ["store_id"]?.includes(p_column)
      ? setViewStoreDistributionTable(true)
      : setOpenPopup(true);
  };

  const getActionColumns = (p_columns) => {
    let linkTypeCols = [];
    p_columns.forEach((item) => {
      if (item.type === "link") linkTypeCols.push(item);
    });
    let linkTypeColNames = linkTypeCols.map((obj) => obj.column_name);
    let actionObject = linkTypeColNames.map((colNames) => {
      return {
        [colNames]: onClickHandlerForLink,
      };
    });
    return Object.assign({}, ...actionObject);
  };

  // to unmount and remount aggrid instance as we are reverting the table data into original data after faulty(allocates more than available) edits.
  // this would be required to flush out initial data saved in cell renderer component, without un mount and remount aggrid gets updated with original data but cell renderer will still persist previously edited values
  useEffect(() => {
    !reMount && setReMount(true);
  }, [reMount]);

  useEffect(() => {
    if (
      reMount &&
      isEmpty(productStoreDetailsTableData) &&
      isEmpty(availableproductStoreDetailsTableData) &&
      !isEmpty(productStoreDetailsTableDataCopy) &&
      !isEmpty(availableproductStoreDetailsTableDataCopy)
    ) {
      setProductStoreDetailsTableData(
        cloneDeep(productStoreDetailsTableDataCopy)
      );
      setavailableProductStoreDetailsTableData(
        cloneDeep(availableproductStoreDetailsTableDataCopy)
      );
    }
  }, [
    reMount,
    productStoreDetailsTableData,
    availableproductStoreDetailsTableData,
  ]);

  useEffect(() => {
    if (!isEmpty(props.inventorysmartModulesPermission)) {
      let l_roleWithCreateAccess = shoulDisable(
        props.inventorysmartModulesPermission
      );
      setDisabledForViewOnlyAccess(!l_roleWithCreateAccess);
    }
  }, [props.inventorysmartModulesPermission]);

  const setCellsToBeDisabled = (row, item) => {

    // If the Column value dose not exist/null disable it.
    return (row?.[item?.column_name] === null || row?.[item?.column_name] === undefined) ? true : false;
  };

  const setDropDownToBeDisabled = (row, item) => {
    return row?.[item?.column_name] !== null ? false : true;
  };

  const getLastIsPrePackObject = (node) => {
    // If the current node has no more sub_headers, return its sub_headers array
    if (!node.sub_headers?.length) {
      return null; // No sub_headers at this level
    }

    let deepestSubHeaders =
      node.sub_headers;

    // Traverse the child sub_headers recursively
    for (const child of node.sub_headers) {
      const childResult = getLastIsPrePackObject(
        child
      );
      if (childResult) {
        deepestSubHeaders = childResult;
      }
    }
    return deepestSubHeaders;
  };

  useEffect(() => {
    props.allocationCode &&
      props.selectedArticle &&
      (async () => {
        setavailableProductStoreDetailsTableData([]);
        let columns = [],
          data = [],
          availblecolumns = [],
          availbledata = [];
        try {
          props.setProductStoreViewLoader(true);
          let l_response = await props.getProductStoreView(
            {
              allocation_code: props.allocationCode,
              article: props.articles,
              ignore_allocation_code: getIgnoreAllocationCode(
                props.originalAllocationCode,
                props.allocationCode
              ),
              article: props.selectedArticle,
              plan_status: props.planStatus,
              plan_type: props.planType ? props?.planType : "",
              ...(props.selectedStores && { store_code: props.selectedStores }),
            },
            props.isV3?.includes("productStoreDetails")
          );
          if (l_response.data.status) {
            let l_responseData = l_response.data.data;
            setDcs(l_responseData?.dc_dict);
            setModalColumns(l_responseData);
            columns = getActionColumns(cloneDeep(l_responseData.table_config));
            // l_responseData.table_config;
            // to be handled from BE in future, making cell as non editable for finalized plan.
            try {
              if (
                shouldDisplayGridBulkEditButtons(
                  props.planStatus,
                  props.planType,
                  props?.inventorysmartScreenConfig?.finalize?.subComponent
                ) ||
                disabledForViewOnlyAccess
              ) {
                let l_replaceableSubHeaders = columns
                  ?.filter(
                    (val) => val?.column_name === "size_value_allocated_eaches"
                  )[0]
                  ?.sub_headers?.map((val) => {
                    return {
                      ...val,
                      is_editable: false,
                    };
                  });
                columns.filter(
                  (val) => val?.column_name === "size_value_allocated_eaches"
                )[0].sub_headers = l_replaceableSubHeaders;
              }
            } catch {
              columns = columns;
            }
            data = l_responseData.table_data;
            availblecolumns = l_responseData.grid_table;
            availbledata = l_responseData.grid_data;
            let formattedColumns = agGridColumnFormatter(
              l_responseData.table_config,
              null,
              columns
            );
            let formattedColumnsWithDisableKey = formattedColumns.map((obj) => {
              if (obj.accessor == "size_value_allocated_eaches" || obj.accessor == "size_value_allocated") {
                obj.sub_headers = obj?.sub_headers?.map((val) => {
                  val.sub_headers = val?.sub_headers?.map((val2) => {
                    val2.disabled = setCellsToBeDisabled;
                    return val2;
                  });
                  return val;
                });
              }
              return obj;
            });
            let l_columnsWithDisablekey = formattedColumnsWithDisableKey?.map(
              (obj) => {
                if (obj?.extra?.disableSubHeader && obj.sub_headers?.length) {
                  obj.sub_headers = obj?.sub_headers?.map((val) => {
                    val.disabled = setDropDownToBeDisabled;
                    return val;
                  });
                }
                return obj;
              }
            );
           
            const result = l_columnsWithDisablekey
              .filter(item => item.extra?.isPrePack)
              .map(item => getLastIsPrePackObject(item)).flat();

            setPrePackData(result);
            setProductStoreDetailsTableColumns(l_columnsWithDisablekey);
            // let formattedColumns = agGridColumnFormatter(columns);
          }
        } catch {
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          setAvailableColumns(availblecolumns);
          props.setProductStoreViewLoader(false);
          let l_sizes = data[0]?.size;
          // let formattedColumns = agGridColumnFormatter(columns);
          let formattedColumnsAvailableData = agGridColumnFormatter(
            availblecolumns
          );
          // setProductStoreDetailsTableColumns(formattedColumns);
          setProductStoreDetailsTableData(
            data?.map((val) => {
              return {
                ...val,
                ...getSizes(
                  l_sizes,
                  val,
                  "size_value_allocated_eaches__",
                  "original_size_value_allocated__"
                ),
              };
            })
          );
         setReMount(false)
          setavailableProductStoreDetailsTableColumns(
            formattedColumnsAvailableData
          );
          setavailableProductStoreDetailsTableData(
            availbledata?.map((val) => {
              return {
                ...val,
                ...getSizes(l_sizes, val, "", "original_"),
              };
            })
          );
        }
      })();
  }, [props.allocationCode, props.selectedArticle, props.selectedStores,bulkEditAllocatedQty]);

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    // props.setSelectedStores(selections);
    setButtonEnabled(selections?.length);
  };

  const showValidationOnUserEdits = () => {
    try {
      resetProductStoreDetailsState();
      let l_availableEaches = {},
        l_availableData = [],
        l_sizes = productStoreDetailsTableData[0].size;
      availableproductStoreDetailsTableInstance?.current?.api?.forEachNode(
        (node) => {
          l_availableData.push(node.data);
        }
      );
      l_availableData.forEach((availableData) => {
        l_availableEaches[availableData.dc_code] = {
          ...getSizes(l_sizes, availableData),
        };
      });
      for (const [key, value] of Object.entries(l_availableEaches)) {
        if (Object.values(value).some((sizesValue) => sizesValue < 0)) {
          // setReMount(false);
          // setProductStoreDetailsTableData([]);
          // setavailableProductStoreDetailsTableData([]);
          displaySnackMessages(
            "The allocated eaches for atleast one of the sizes are more than the available units!!",
            "error"
          );
          return {
            l_shouldDisplayValidationError: true,
          };
        }
      }
      return {
        l_shouldDisplayValidationError: false,
        l_availableEaches,
        l_sizes,
      };
    } catch {
      return {
        l_shouldDisplayValidationError: true,
      };
    }
  };
  const editAllocatedQtyHandler = (type, tableData) => {
    if (props.isV3?.includes("bulkEditPopUp")) {
      let l_instance = availableproductStoreDetailsTableInstance?.current,
        l_rowData = [];
      l_instance?.api?.forEachNode((node) => {
        if (node.data) l_rowData.push(node.data);
      });
      if (Object.values(l_rowData[0])?.some((el) => el < 0)) {
        // setReMount(false);
        // setProductStoreDetailsTableData([]);
        // setavailableProductStoreDetailsTableData([]);
        displaySnackMessages(
          "The allocated eaches for atleast one of the sizes are more than the available units!!",
          "error"
        );
        setButtonEnabled(0);
        return;
      }
      setBulkEditAllocatedQty(true);
      setSelectedRowsForBulkEdit(
        productStoreDetailsTableInstance.current.api.getSelectedRows()
      );
    } else {
      if (type === "bulk") {
        if (showValidationOnUserEdits()?.l_shouldDisplayValidationError) {
          setButtonEnabled(0);
          return;
        }
        setBulkEditAllocatedQty(true);
        setSelectedRowsForBulkEdit(
          productStoreDetailsTableInstance.current.api.getSelectedRows()
        );
      } else {
        setStoreRowData(tableData?.data);
        setEditAllocatedQty(true);
      }
    }
  };

  const loadTableInstance = (params) => {
    productStoreDetailsTableInstance.current = params;
  };

  const availableLoadTableInstance = (params) => {
    availableproductStoreDetailsTableInstance.current = params;
  };
  
  const checkCasePackMultiple = (p_value, column)=>{
    const isPrepack = column?.colDef?.extra?.isPrepack;
    if (isPrepack) return;
    if(p_value % props.selectedData?.vendor_case_pack != 0){
      casePackErr.current=true;
      displaySnackMessages(
        CASE_PACK_ERROR_MESSAGE,
        "error"
      );
      return;
    }
    casePackErr.current = false;
  }

  const onBlur = async (_e, data, column, _, value, initialValue) => {
    if (props.isV3?.includes("productStoreDetails")) {
      let l_column = column.colId;
      setUserEditsForAllEdits((old) => {
        return {
          ...old,
          [data.store_code]: {
            ...old[data.store_code],
            [l_column]: data?.[l_column],
          },
        };
      });
      let l_delta = +value - +initialValue;
      let l_instance = availableproductStoreDetailsTableInstance?.current;
      let rowNode = l_instance?.api.getRenderedNodes()[0];
      let l_value = +rowNode?.data?.[l_column] - l_delta;
      rowNode.setDataValue(l_column, l_value);
      if(l_value>=0 && props?.selectedData?.vendor_case_pack && props?.planType !== "PO"){
          checkCasePackMultiple(value, column)
      }
    } else {
      if (column?.colDef?.extra?.enableEditOnBlur) {
        let l_column = column.colId;
        setUserEdits((old) => {
          return {
            ...old,
            [data.store_code]: data,
          };
        });
        // assuming key remians unchanged from BE "size_value_allocated_eaches__" this should be made dynamic once we have packs edit
        // extracting One_Size from "size_value_allocated_eaches__One_Size"
        let l_availabecolumn = l_column.slice(29);
        let l_delta = +value - +initialValue;
        let l_instance = availableproductStoreDetailsTableInstance?.current;
        let rowNode = l_instance?.api.getRowNode([data.dc]);
        let l_value = +rowNode?.data?.[l_availabecolumn] - l_delta;
        rowNode.setDataValue(l_availabecolumn, l_value);
      }
    }
  };

  const getSizes = (
    p_sizes,
    p_rowData,
    p_staticprefixValue = "",
    p_staticprefixKey = ""
  ) => {
    try {
      let l_sizesValue = {};
      p_sizes.forEach((size) => {
        l_sizesValue[`${p_staticprefixKey}${size}`] =
          p_rowData[`${p_staticprefixValue}${size}`];
      });
      return l_sizesValue;
    } catch {
      return {};
    }
  };

  const checkAllValues = (p_values, isPO = false) => {
    let prePackColumns = prePackData.map(item => item.column_name);
    for (let ls_value of Object.values(p_values)) {
      for (let qty in ls_value) {
        if (prePackColumns.length > 0 && prePackColumns.includes(qty)) {
          return false
        } 
        if (!(qty.includes('priority_code') || qty.includes('shipping_date') || qty.includes('dcs'))) {
          if (!isNumber(ls_value[qty]) || ls_value[qty] % props.selectedData?.vendor_case_pack != 0) {
            if (isPO) {
              const errorData = { [props.selectedData.article]: true}
              props.setVCPQErrorData(errorData)
            }
          return true;
          }
        }
      }
    }
  }

  const saveHandler = async () => {
    if (props.isV3?.includes("bulkEdit")) {
      try {
        let l_instance = availableproductStoreDetailsTableInstance?.current;
        let l_userEdits = cloneDeep(userEditsForAllEdits);
        let l_requestToUpdateAllocatedQty = {},
          l_rowData = [];
        l_instance?.api?.forEachNode((node) => {
          if (node.data) l_rowData.push(node.data);
          });
        if (Object.values(l_rowData[0])?.some((el) => el < 0)) {
          // setReMount(false);
          // setProductStoreDetailsTableData([]);
          // setavailableProductStoreDetailsTableData([]);
          displaySnackMessages(
            "The allocated eaches for atleast one of the sizes are more than the available units!!",
            "error"
          );
          setButtonEnabled(0);
          return;
        }

        if (props.selectedData?.vendor_case_pack && props?.planType !== "PO") {
          let isValueCasePackErr = checkAllValues(l_userEdits);
          casePackErr.current = isValueCasePackErr;
          if (isValueCasePackErr) {
            displaySnackMessages(
              CASE_PACK_ERROR_MESSAGE,
              "error"
            );
            return;
          }
        }
        if (props?.planType === "PO") {
          checkAllValues(l_userEdits, true);
        }

        props.setProductStoreViewLoader(true);
        l_requestToUpdateAllocatedQty["allocation_code"] =
          props.originalAllocationCode || props.allocationCode;
        l_requestToUpdateAllocatedQty[
          "edited_allocation_code"
        ] = !props.originalAllocationCode ? null : props.allocationCode;
        l_requestToUpdateAllocatedQty["allocation_row"] = {
          [props.selectedArticle]: l_userEdits,
        };
        let l_response = await props.bulkUpdateAllocatedUnits(
          l_requestToUpdateAllocatedQty,
          props.isV3?.includes("bulkEdit")
        );
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
      } catch (err) {
        props.setProductStoreViewLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      } finally {
        resetProductStoreDetailsState();
      }
    } else {
      try {
        let l_storesDcAllocation = [],
          l_requestToUpdateAllocatedQty = {},
          l_userEdits = Object.values(userEdits),
          {
            l_shouldDisplayValidationError,
            l_sizes,
            l_availableEaches,
          } = showValidationOnUserEdits();
        if (l_shouldDisplayValidationError) {
          setButtonEnabled(0);
          return;
        }
        props.setProductStoreViewLoader(true);
        if (props.isV3?.includes("bulkEdit")) {
          l_requestToUpdateAllocatedQty["allocation_code"] =
            props.originalAllocationCode || props.allocationCode;
          l_requestToUpdateAllocatedQty[
            "edited_allocation_code"
          ] = !props.originalAllocationCode ? null : props.allocationCode;
          l_userEdits.forEach((val) => {
            l_storesDcAllocation.push({
              store_code: val.store_code,
              article: props.selectedArticle,
              updated_packs: {},
              updated_eaches: {
                [val.dc_code]: {
                  ...getSizes(l_sizes, val, "size_value_allocated_eaches__"),
                },
              },
            });
          });
          l_requestToUpdateAllocatedQty[
            "allocation_row"
          ] = l_storesDcAllocation;
        } else {
          l_requestToUpdateAllocatedQty["allocation_code"] =
            props.allocationCode;
          l_requestToUpdateAllocatedQty["original_allocation_code"] =
            props.originalAllocationCode;
          l_requestToUpdateAllocatedQty["article"] = props.selectedArticle;
          l_requestToUpdateAllocatedQty["available_eaches"] = l_availableEaches;
          l_userEdits.forEach((val) => {
            l_storesDcAllocation.push({
              store_code: val.store_code,
              updated_eaches: {
                [val.dc_code]: {
                  ...getSizes(l_sizes, val, "size_value_allocated_eaches__"),
                },
              },
              delivery_dt: val?.delivery_dt
                ? moment(val.delivery_dt).format("MM/DD/YYYY")
                : null,
              order_type: val.order_type ? val.order_type : null,
            });
          });
          l_requestToUpdateAllocatedQty[
            "stores_dc_allocation"
          ] = l_storesDcAllocation;
        }
        let l_response = await props.bulkUpdateAllocatedUnits(
          l_requestToUpdateAllocatedQty,
          props.isV3?.includes("bulkEdit")
        );
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
      } catch (err) {
        props.setProductStoreViewLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      } finally {
          resetProductStoreDetailsState();
      }
    }
  };

  const resetProductStoreDetailsState = () => {
    if(!casePackErr.current){
      setUserEdits({});
      setUserEditsForAllEdits({});
    }
  };

  const onCellValueChanged = (params) => {
    if (props.isV3?.includes("productStoreDetails")) {
      if (params?.colDef?.extra?.enableEditOnChange) {
        let {
          column: { colId, colDef },
          data,
        } = params;
        let l_editedData = colDef?.extra?.format
          ? moment(data?.[colId]).format(colDef.extra.format)
          : data?.[colId];
        setUserEditsForAllEdits((old) => {
          return {
            ...old,
            [params.data.store_code]: {
              ...old[params.data.store_code],
              [colId]: l_editedData,
            },
          };
        });
      }
    } else {
      if (params?.colDef?.extra?.enableEditOnChange) {
        setUserEdits((old) => {
          return {
            ...old,
            [params.data.store_code]: params.data,
          };
        });
      }
    }
  };

  const prependData = () => {
    if (!isEmpty(downloadFormatChipsDependency)) {
      let l_downloadFormatChipsDependency = cloneDeep(downloadFormatChipsDependency);
      l_downloadFormatChipsDependency.product.value = downloadFormatChipsDependency.product.value.map((str)=> replaceSpecialCharacter(str ));
      let prependContentReq = prependExtraData(l_downloadFormatChipsDependency);
      return appendExcelDownloadData(prependContentReq);
    }
  };

  useEffect(() => {
    if (props.filterDashboardConfiguration?.dependencyData?.length) {
      let filterChips = fetchFilterChipsToDownload(
        props.filterDashboardConfiguration?.dependencyData
      );
      setDownloadFormatChipsDependency(filterChips);
    }
  }, [props.filterDashboardConfiguration]);

  return (
    <>
      <Loader loader={props.productStoreTableLoader}>
        {openPopup && (
          <StoreSizeModal
            columns={agGridColumnFormatter(modalColumns?.[columnSelected])}
            storeSizeData={modalRows}
            setOpenPopup={setOpenPopup}
          />
        )}
        {!isEmpty(availableproductStoreDetailsTableData) && (
          <AgGridComponent
            columns={availableProductStoreDetailsTableColumns}
            rowdata={availableproductStoreDetailsTableData}
            loadTableInstance={availableLoadTableInstance} // to make use of available grid api's
            downloadAsExcel={
              availableproductStoreDetailsTableData?.length ? true : false
            }
            uniqueRowId={"dc_name"}
            suppressFieldDotNotation
            toPrependContent={props.excelDownloadMetaData}
            prependedContentDetails={prependData()}
          />
        )}
        {reMount && (
          <AgGridComponent
            selectAllHeaderComponent={
              props?.inventorysmartScreenConfig?.finalize
                ?.hideSelectAllForFinalized
                ? shouldDisplaySelectComponent(
                    props.finalized,
                    props.planStatus,
                    props.planType,
                    flowType
                  )
                  ? false
                  : true
                : true
            }
            columns={productStoreDetailsTableColumns}
            rowdata={productStoreDetailsTableData}
            getRowStyle={(params) => {
              if (+params?.data?.min_net_available < 0) {
                return {
                  background: "rgb(255,255,0.5)",
                };
              }
            }}
            onSelectionChanged={onSelectionChanged}
            onBlur={onBlur}
            onCellValueChanged={onCellValueChanged}
            rowSelection="multiple"
            onEditClick={(tableInfo) =>
              editAllocatedQtyHandler("action", tableInfo)
            }
            loadTableInstance={loadTableInstance} // to make use of available grid api's
            uniqueRowId={"store_code"}
            downloadAsExcel
            suppressFieldDotNotation
            pagination={false}
            hideSelectCurrentPageRecords
            isEditDisabled={() =>
              !shoulDisable(props.inventorysmartModulesPermission)
            }
            toPrependContent={props.excelDownloadMetaData}
            prependedContentDetails={prependData()}
          />
        )}
        {editAllocatedQty && (
          <EditAllocatedQty
            storeRowData={storeRowData}
            allocationCode={props.allocationCode}
            selectedArticle={props.selectedArticle}
            selectedData={props.selectedData}
            setShowSetAllModal={(showModal) => setEditAllocatedQty(showModal)}
            resetProductStoreDetailsState={resetProductStoreDetailsState}
          />
        )}
        {bulkEditAllocatedQty && (
          <BulkEditAllocatedQty
            availableColumns={availableColumns}
            setButtonEnabled={setButtonEnabled}
            availableproductStoreDetailsTableData={
              availableproductStoreDetailsTableData
            }
            columns={productStoreDetailsTableColumns}
            selectedRowsForBulkEdit={selectedRowsForBulkEdit}
            productStoreDetailsTableInstance={
              productStoreDetailsTableInstance.current
            }
            allocationCode={props.allocationCode}
            selectedArticle={props.selectedArticle}
            selectedData={props.selectedData}
            setShowSetAllModal={(showModal) =>
              setBulkEditAllocatedQty(showModal)
            }
            resetProductStoreDetailsState={resetProductStoreDetailsState}
            dcs={dcs}
            casePackValue={props.selectedData?.vendor_case_pack}
          />
        )}
        {!shouldDisplayGridBulkEditButtons(
          props.planStatus,
          props.planType,
          props?.inventorysmartScreenConfig?.finalize?.subComponent
        ) && (
          <Grid
            container
            direction="row"
            justifyContent="center"
            alignItems="center"
            className={globalClasses.marginAround}
          >
            <Button
              variant="contained"
              color="primary"
              className={classes.button}
              disabled={
                disabledForViewOnlyAccess || !buttonEnabled || props.finalized
              }
              id="bulkEditEachesBtn"
              onClick={() => editAllocatedQtyHandler("bulk")}
            >
              Bulk Edit
            </Button>
            <Button
              variant="contained"
              color="primary"
              id="productSetAllBtn"
              disabled={
                disabledForViewOnlyAccess ||
                (isEmpty(userEdits) && isEmpty(userEditsForAllEdits)) ||
                props.finalized
              }
              className={classes.button}
              onClick={() => saveHandler()}
            >
              Save Grid Edit
            </Button>
          </Grid>
        )}
      </Loader>
      {props.showSetDateActions && (
        <Grid
          container
          direction="row"
          justifyContent="center"
          alignItems="center"
          className={globalClasses.marginAround}
        >
          <Button
            variant="contained"
            color="primary"
            id="productSetAllBtn"
            className={classes.button}
            disabled={disabledForViewOnlyAccess}
            onClick={() => props.onSetDates()}
          >
            Set Dates
          </Button>
        </Grid>
      )}
      {viewStoreDistributionTable && (
        <div className={globalClasses.marginTop}>
          <Paper className={globalClasses.paperWrapper}>
            <Typography
              style={{ flex: 1 }}
              variant="h6"
              className={globalClasses.marginBottom}
              gutterBottom
            >
              {props.selectedArticle} {" - "} {modalRows?.[0]?.store_id}{" "}
              {" - Size Details"}
            </Typography>
            <ProductStoreSizeDetailsTable
              selectedArticle={props.selectedArticle}
              selectedStoreCode={modalRows?.[0]?.store_code}
            />
          </Paper>
        </div>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    finalized:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .finalized,
    productStoreTableLoader:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .productStoreTableLoader,
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
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    isV3:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isV3,
    articles:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .articles,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "viewPastAllocationFilterConfiguration"
      ]?.appliedFilterData,
    excelDownloadMetaData:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.excelDownloadMetaData,
  };
};

const mapDispatchToProps = (dispatch) => ({
  bulkUpdateAllocatedUnits: (payload, isV3) =>
    dispatch(bulkUpdateAllocatedUnits(payload, isV3)),
  setProductStoreViewLoader: (payload) =>
    dispatch(setProductStoreViewLoader(payload)),
  getProductStoreView: (payload, isV3) =>
    dispatch(getProductStoreView(payload, isV3)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  setOriginalAllocationCode: (payload) =>
    dispatch(setOriginalAllocationCode(payload)),
  setAllocationCode: (payload) => dispatch(setAllocationCode(payload)),
  setVCPQErrorData: (payload) => dispatch(setVCPQErrorData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductStoreDetailsTable);
