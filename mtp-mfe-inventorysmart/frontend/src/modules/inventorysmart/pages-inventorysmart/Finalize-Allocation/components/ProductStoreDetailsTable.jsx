import { Grid, Paper, Typography } from "@mui/material";
import { Button, Tooltip } from "impact-ui-v3";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { connect } from "react-redux";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

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
import { cloneDeep, isEmpty, isNull } from "lodash";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import moment from "moment";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";
import StoreSizeModal from "./StoreSizeModal";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import {
  setFetchProductStoreDetails,
  setFetchProductDetails,
  setFetchArticleSummary,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { getNearestMultiple } from "../../../utils-inventorysmart/utilityFunctions";
import ExpandableDetails from "./KPI-Card/ExpandableDetails";
import { useStyles as titleStyles } from "./KPI-Card/ExpandableDetails";
import { setProductViewLoader } from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import { setStoreViewLoader } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import AiIcon from "../../../../../assets/IS_icons/IS_AI.svg";
import AlanSummaryPanel from "../../Decision-Dashboard/AISummaryData/AlanSummaryPanel";
import SizeViewDetailsTable from "./FinalizeRecommandation/SizeViewDetailsTable";
import { applyAbsentKeyHyphen } from "../utils/columnUtils";

const ProductStoreDetailsTable = (props) => {
  const flowType = new URLSearchParams(window.location.search).get("flow");

  const globalClasses = globalStyles();
  const classes = useStyles();
  const titleClasses = titleStyles();

  const articleKey = dynamicLabelsBasedOnTenant("article_unique_id");

  const [
    productStoreDetailsTableColumns,
    setProductStoreDetailsTableColumns,
  ] = useState([]);
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
  const [selectedRowsCount, setSelectedRowsCount] = useState(0);
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
  const editedDataList = useRef({});
  const previousValues = useRef({});
  const [isTableValueChanged, setIsTableValueChanged] = useState(false);
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
  const [isStoreBand, setIsStoreBand] = useState(false);
  const [isTicketType, setIsTicketType] = useState(false);
  const [alanSummaryPanelStatus, setAlanSummaryPanelStatus] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);

  const [dcs, setDcs] = useState([]);
  const [viewStoreDistributionTable, setViewStoreDistributionTable] = useState(
    false
  );
  const [selectedStoreArticle, setSelectedStoreArticle] = useState();
  const [showViewSizeDetailsTable, setShowViewSizeDetailsTable] = useState(false);

  const productStoreDetailsTableInstance = useRef(null);
  const availableproductStoreDetailsTableInstance = useRef(null);
  const originalColumnsRef = useRef(null); // Store original column configuration
  const debounceTimerRef = useRef(null);
  const pendingInputRef = useRef(null); // Holds the latest debounced cell edit awaiting processing
  // Reference to the ExpandableDetails component
  const expandableDetailsRef = useRef(null);
  // Track the latest requested article to prevent race conditions
  const latestRequestedArticleRef = useRef(null);

  const styleConfig = {
    rowStyles: [
      {
        styleFunction: (params) => {
          return (
            props?.finalizeAllocationConfig?.conditionalFormatting &&
            params.data?.target_allocation > params.data?.allocated_quantity
          );
        },
        style: {
          backgroundColor: "#FFE2E2",
        },
      },
    ],
  };

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
        disableOnClose: true,
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
    ["psa_name"]?.includes(p_column)
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
  // useEffect(() => {
  //   console.log("coming", reMount);
  //   !reMount && setReMount(true);
  // }, [reMount]);

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
    return row?.[item?.column_name] === null ? true : false;
  };

  const setDropDownToBeDisabled = (row, item) => {
    return row?.[item?.column_name] !== null ? false : true;
  };
  useEffect(() => {
    setViewStoreDistributionTable(false);
    previousValues.current = {};
    editedDataList.current = {};
    
    // Clear any pending debounce timers when article changes
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingInputRef.current = null;
  }, [props.selectedArticle]);
  const shouldDisableDate = (date) => {
    if (props.calendarDayShippingDateDefaults === true) return false;
    let dayNumber = moment(date).day();
    return dayNumber === 0 || dayNumber === 6;
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    props.setProductStoreViewLoader(false);
  };
  
    const makeUnusedDcsNonEditable = (cols = []) => {

    const target = cols.find(
      (col) => col.column_name === "allocated_qty_by_pack_dc_level"
    );
    if (!target || !target.sub_headers?.length) return cols;

    target.sub_headers = target.sub_headers.map((group) => {

      group.sub_headers = group.sub_headers.map((leaf) => {
        if (leaf.column_name?.includes("allocated_quantity__dc")) {
          leaf = {
            ...leaf,
            orig_is_editable: leaf.is_editable,
            is_editable: function (params) {
              const dcCodes = (params.data.dc_codes || "")
                .split(",")
                .map((code) => code.trim())
                .filter(Boolean);
              return dcCodes.some((dcCode) =>
                leaf.column_name.includes(`__${dcCode}__`)
              );
            },
          };
        }
        return leaf;
      });
      return group;
    });

    return cols;
  };
  

  const getProductStoreViewWithRetry = async (
    paylaod,
    productStoreDetails,
    maxRetries = 3
  ) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Create a promise that rejects after 30 seconds
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("Request timed out after 30 seconds")),
            30000
          );
        });

        // Race between the actual API call and the timeout
        const response = await Promise.race([
          props.getProductStoreView(paylaod, productStoreDetails),
          timeoutPromise,
        ]);

        return response;
      } catch (error) {
        if (attempt === maxRetries) {
          throw new Error(
            `getSummary failed after ${maxRetries} attempts: ${error.message}`
          );
        }

        // Wait 1 second before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  };
  // Helper function to make a column non-editable
  const makeColumnNonEditable = (column) => {
    const { nonEditableCell } = require('core/Utils/agGrid/table-functions');
    column.is_editable = false;
    column.editable = false;
    if (column.cellRenderer) {
      column.cellRenderer = (cellProps) => nonEditableCell(column, null, true)(cellProps);
      if (column.column_name === 'store_code' && props.finalizeAllocationConfig?.showSizeDetails && !props.isStoreView) {
        column.cellRenderer = "agGroupCellRenderer";
      }
    }
  };

  // Helper function to recursively apply non-editable state to columns and sub-headers
  const applyNonEditableState = (columns) => {
    columns.forEach((obj) => {
      makeColumnNonEditable(obj);
      if (obj.sub_headers?.length) {
        obj.sub_headers.forEach((subHeader) => {
          makeColumnNonEditable(subHeader);
          if (subHeader.sub_headers?.length > 0) {
            subHeader.sub_headers.forEach(makeColumnNonEditable);
          }
        });
      }
    });
  };

  const formatColumns = () => {
    const isViewMode = (props.finalizeAllocationConfig.showSizeDetails && !props.disabledEditDuetoChildEdit && props.selectedOption === 'edit') || (props.renderToggleSummary && props.selectedOption === "view") || props.disableEditDueToParentEdit;

    if (originalColumnsRef.current?.editableColumns) {
      // Use stored editable columns
      const columns = cloneDeep(originalColumnsRef.current.editableColumns);
      
      if (isViewMode ) {
        applyNonEditableState(columns);
      }
      
      setProductStoreDetailsTableColumns(columns);
    } else {
      // Fallback to original logic if editableColumns not available
      let formattedColumns = agGridColumnFormatter(
        originalColumnsRef.current.table_config,
        null,
        originalColumnsRef.current.columns,
        false,
        false,
        isViewMode,
        false,
        false,
        false,
        false
      );

      // Apply disable key logic
      let l_columnsWithDisablekey = formattedColumns
        .map((obj) => {
          if (obj.accessor === "size_value_allocated_eaches") {
            obj.sub_headers = obj?.sub_headers?.map((val) => ({
              ...val,
              sub_headers: val?.sub_headers?.map((val2) => ({
                ...val2,
                disabled: setCellsToBeDisabled
              }))
            }));
          }
          return obj;
        })
        .map((obj) => {
          if (obj?.extra?.disableSubHeader && obj.sub_headers?.length) {
            obj.sub_headers = obj.sub_headers.map((val) => ({
              ...val,
              disabled: setDropDownToBeDisabled
            }));
          }
          return obj;
        });
      
      if (isViewMode) {
        applyNonEditableState(l_columnsWithDisablekey);
      }
      
      setProductStoreDetailsTableColumns(l_columnsWithDisablekey);
    }
  }
  const getProductStoreDetailsData = async () => {
    // Capture the article being requested to prevent race conditions
    const requestedArticle = props.selectedArticle;
    latestRequestedArticleRef.current = requestedArticle;
    
    setavailableProductStoreDetailsTableData([]);
    setavailableProductStoreDetailsTableDataCopy([]);
    setReMount(false);
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
      
      // Ignore this response if a newer request has been made
      if (latestRequestedArticleRef.current !== requestedArticle) {
        return;
      }
      
      if (l_response.data.status) {
        let l_responseData = l_response.data.data;
        if (l_response.data.data) setDcs(l_responseData?.dc_dict);
        setModalColumns(l_responseData);
        columns = getActionColumns(cloneDeep(l_responseData.table_config));
        // l_responseData.table_config;
        // to be handled from BE in future, making cell as non editable for finalized plan.
        try {
          if (
            shouldDisplayGridBulkEditButtons(
              props.planStatus,
              props.planType,
              props?.finalizeAllocationConfig?.subComponent
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
        let isStoreBand = l_responseData.table_config.some(
          (item) => item.column_name === "psa_name"
        );
        let ticketTypeCol = l_responseData.table_config.some(
          (item) => item.column_name === "ticket_type"
        );
        data = l_responseData.table_data;
        l_responseData.table_config = l_responseData.table_config.map(
          (item) => {
            if (item.column_name === "allocated_qty_by_pack_dc_level") {
              item.sub_headers = item.sub_headers.map((x) => {
                x.sub_headers = x.sub_headers.map((y) => {
                  y.type = "int";
                  return y;
                });
                x.type = "int";
                return x;
              });
              item.type = "int";
            }
            return item;
          }
        );

        if (!isStoreBand) {
          let gridCols = JSON.parse(
            JSON.stringify(l_responseData.table_config)
          );
          l_responseData.grid_table = gridCols
            .filter((item) => item.column_name === "available_qty_by_pack")
            .map((item) => {
              item.is_hidden = false;
              item.sub_headers = item?.sub_headers?.map((val) => {
                val.is_hidden = false;
                val.sub_headers = val?.sub_headers?.map((val2) => {
                  val2.is_hidden = false;
                  return val2;
                });
                return val;
              });
              return item;
            });
        }
        let grid_data = {};
        const isValidAvailableValue = (val) => val != null && val !== 0;
        Object.keys(data[0]).forEach((key) => {
          if (key.includes("net_dc_available__")) {
            const rowWithValue = data.find((row) =>
              isValidAvailableValue(row[key])
            );
            grid_data[key] = rowWithValue ? rowWithValue[key] : 0;
          }
        });
        availbledata = [grid_data];
        availblecolumns = l_responseData.grid_table;
        // CB-Generic case to collect all the available quantity columns
        const collectChildmostColumnNames = (headers) => {
          const leafColumnNames = [];
          const stack = Array.isArray(headers) ? [...headers] : [];
          while (stack.length) {
            const currentHeader = stack.pop();
            const childHeaders = currentHeader?.sub_headers;
            if (Array.isArray(childHeaders) && childHeaders.length) {
              for (let index = 0; index < childHeaders.length; index++) {
                stack.push(childHeaders[index]);
              }
            } else if (currentHeader?.column_name) {
              leafColumnNames.push(currentHeader.column_name);
            }
          }
          return leafColumnNames;
        };
        const availableQntyColumConfig =
          collectChildmostColumnNames(availblecolumns?.[0]?.sub_headers) ?? [];
        // CB case to fill remaining available quantity columns by scanning rows until all are found
        const fillAvailableQtyColumns = ({
          existingGridData,
          rows,
          requiredColumns,
        }) => {
          const updated = { ...existingGridData };
          const remaining = new Set(
            (requiredColumns || []).filter((col) => !(col in updated))
          );
          if (!rows?.length || remaining.size === 0) return updated;
          for (const row of rows) {
            for (const colName of Array.from(remaining)) {
              if (Object.prototype.hasOwnProperty.call(row, colName)) {
                updated[colName] = row[colName];
                remaining.delete(colName);
                if (remaining.size === 0) return updated;
              }
            }
          }
          return updated;
        };
        grid_data = fillAvailableQtyColumns({
          existingGridData: grid_data,
          rows: data,
          requiredColumns: availableQntyColumConfig,
        });
        availbledata = [JSON.parse(JSON.stringify(grid_data))];
        l_responseData.table_config = l_responseData.table_config.map(
          (item) => {
            if (
              item.column_name === "delivery_dt" ||
              item.column_name === "store_end_date" ||
              item.column_name === "store_end_date"
            ) {
              item.type = "datetime";
              item.is_editable = true;
              item.extra = { disablePast: true };
              if (item.column_name === "delivery_dt") {
                item.shouldDisableDate = shouldDisableDate;
              }
            }
            return item;
          }
        );
        let productStoreColsModified = l_responseData.table_config
        if(props?.finalizeAllocationConfig?.makeUnusedDcsNonEditable) {
          productStoreColsModified = makeUnusedDcsNonEditable(l_responseData.table_config)
        }
        // Store original column configuration before any modifications
        // Always store the original editable state, regardless of current props
        originalColumnsRef.current = {
          columns,
          table_config: cloneDeep(productStoreColsModified),
        };

        // Format columns with editable state first, then apply view mode if needed
        const editableFormattedColumns = agGridColumnFormatter(
          productStoreColsModified,
          null,
          columns,
          false,
          false,
          false, // Always format as editable first
          false,
          false,
          false,
          false
        );

        // Apply disable key logic
        let l_columnsWithDisablekey = editableFormattedColumns
          .map((obj) => {
            if (obj.accessor === "size_value_allocated_eaches") {
              obj.sub_headers = obj?.sub_headers?.map((val) => ({
                ...val,
                sub_headers: val?.sub_headers?.map((val2) => ({
                  ...val2,
                  disabled: setCellsToBeDisabled,
                })),
              }));
            }
            return obj;
          })
          .map((obj) => {
            if (obj?.extra?.disableSubHeader && obj.sub_headers?.length) {
              obj.sub_headers = obj.sub_headers.map((val) => ({
                ...val,
                disabled: setDropDownToBeDisabled,
              }));
            }
            return obj;
          });

        applyAbsentKeyHyphen(l_columnsWithDisablekey);

        // Store the fully editable version for restoration
        originalColumnsRef.current.editableColumns = cloneDeep(
          l_columnsWithDisablekey
        );

        // Now use formatColumns to apply the current state
        formatColumns();
        setIsStoreBand(isStoreBand);
        setIsTicketType(ticketTypeCol);
        // let formattedColumns = agGridColumnFormatter(columns);
      }
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      // Only update UI if this is still the latest request
      if (latestRequestedArticleRef.current === requestedArticle) {
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
        setSelectedRowsCount(0);

        setavailableProductStoreDetailsTableColumns(
          formattedColumnsAvailableData
        );
        setReMount(true);
        // Process data with proper deep cloning to avoid reference issues
        const processedData = availbledata?.map((val) => {
          return {
            ...val,
            ...getSizes(l_sizes, val, "", "original_"),
          };
        });

        // Update both the main data and the copy
        setavailableProductStoreDetailsTableData(processedData);
        setavailableProductStoreDetailsTableDataCopy(
          JSON.parse(JSON.stringify(processedData))
        );

        // Ensure expandable details gets updated with new data
        if (
          expandableDetailsRef.current &&
          expandableDetailsRef.current.updateData
        ) {
          setTimeout(() => {
            expandableDetailsRef.current.updateData();
          }, 100);
        }
      }
    }
  };

  useEffect(() => {
    if (
      props.allocationCode &&
      props.selectedArticle &&
      props.fetchProductStoreDetails === null
    ) {
      getProductStoreDetailsData();
    }
  }, [
    props.selectedArticle,
    props.selectedStores,
    props.fetchProductStoreDetails,
  ]);

  useEffect(() => {
    if (props.fetchProductStoreDetails) {
      getProductStoreDetailsData()
        .then(() => {
          props.setFetchProductStoreDetails(false);
        })
        .catch((error) => {
          props.setFetchProductStoreDetails(false);
        });
    }
  }, [props.fetchProductStoreDetails]);

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    // props.setSelectedStores(selections);
    setSelectedRowsCount(selections?.length)
    setSelectedRows(selections);
    if (selections?.length > 0) {
      setButtonEnabled(true);
    } else {
      setButtonEnabled(false);
    }
  };

  const showValidationOnUserEdit = () => {
    let l_availableData = [];
    availableproductStoreDetailsTableInstance?.current?.api?.forEachNode(
      (node) => {
        l_availableData.push(node.data);
      }
    );
    let validation = false;
    l_availableData.forEach((item) => {
      Object.keys(item).forEach((key) => {
        if (item[key] < 0) {
          validation = true;
        }
      });
    });
    return validation;
  };
  const showValidationOnUserEdits = () => {
    try {
      // resetProductStoreDetailsState();
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
        let store_codes = productStoreDetailsTableInstance.current.api
          .getSelectedRows()
          .map((item) => item.store_code);
        let selectedRows = productStoreDetailsTableDataCopy.filter(
          (item) => store_codes.indexOf(item.store_code) > -1
        );
        setBulkEditAllocatedQty(true);
        setSelectedRowsForBulkEdit(selectedRows);
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
    // When grid is initialized, make sure ExpandableDetails gets updated
    if (expandableDetailsRef.current && params?.api) {
        expandableDetailsRef.current.updateData();
    }
  };

  const onBlur = async (_e, data, column, isChanged, value, initialValue) => {
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
  // Flush any pending debounced allocated-quantity edit synchronously.
  // Without this, clicking Save within the 500ms debounce window would build
  // the payload before the edit is committed to editedDataList, causing the
  // first save attempt to silently persist nothing.
  const flushPendingAllocatedInput = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      if (pendingInputRef.current) {
        processAllocatedQuantityInput(pendingInputRef.current);
        previousValues.current[pendingInputRef.current.cellKey] = null;
        pendingInputRef.current = null;
      }
    }
  };

  const saveHandler = async () => {
    // Ensure the latest quantity edit is committed before building the payload
    flushPendingAllocatedInput();
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
            props.setFetchArticleSummary(true);
            let l_allocationCodeCopy = props.allocationCode;
            props.setAllocationCode(l_allocationCodeCopy);
          }
          previousValues.current = {};
          editedDataList.current = {};
          displaySnackMessages("Updated Successfully!!", "success");
        }
      } catch (err) {
        handleErrorMessage(err);
      } finally {
        resetProductStoreDetailsState();
      }
    } else {
      try {
        let l_storesDcAllocation = [],
          l_requestToUpdateAllocatedQty = {},
          l_userEdits = Object.values(editedDataList.current);

        let validationResult = showValidationOnUserEdits();
        if (validationResult.l_shouldDisplayValidationError) {
          displaySnackMessages(
            "The allocated eaches for atleast one of the sizes are more than the available units!!",
            "error"
          );
          setButtonEnabled(0);
          return;
        }
        let l_sizes = validationResult.l_sizes;
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
          l_requestToUpdateAllocatedQty["allocation_row"] = {
            [props.selectedArticle]: editedDataList.current,
          };
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
          props.setFetchArticleSummary(true);
          props.setProductViewLoader(true);
          props.isStoreView && props.setStoreViewLoader(true);
          previousValues.current = {};
          editedDataList.current = {};
          displaySnackMessages("Updated Successfully!!", "success");
        }
      } catch (err) {
        handleErrorMessage(err);
      } finally {
        resetProductStoreDetailsState();
      }
    }
  };

  const processAllocatedQuantityInput = useCallback((inputData) => {
    const {
      storeCode,
      columnNameForPayload,
      l_column,
      l_availabecolumn,
      currentAvailable,
      inputValue,
      initialAllocated,
      data,
      rowNode,
      firstValue
    } = inputData;
    editedDataList.current[storeCode][columnNameForPayload] = inputValue;
    
    // Edge case: if net_dc_available__ is negative
    if (currentAvailable < 0) {
      displaySnackMessages(
        "Available quantity is negative. Cannot allocate more than current allocation.",
        "error"
      );
      // Use the first value from the edit sequence
      const valueToRestore = firstValue || initialAllocated;
      productStoreDetailsTableInstance.current.api.applyTransaction({
        update: [{
          store_code: data.store_code,
          ...data,
          [l_column]: valueToRestore,
        }]
      });
      
      editedDataList.current[storeCode][columnNameForPayload] = valueToRestore;
      if (expandableDetailsRef.current) {
        expandableDetailsRef.current.updateData();
      }
      return;
    } else if (currentAvailable === 0 && inputValue > initialAllocated) {
      displaySnackMessages(
        "Available quantity is 0. Cannot allocate more than current allocation.",
        "error"
      );
      // Use the first value from the edit sequence
      const valueToRestore = firstValue || initialAllocated;
      productStoreDetailsTableInstance.current.api.applyTransaction({
        update: [{
          store_code: data.store_code,
          ...data,
          [l_column]: valueToRestore,
        }]
      });
      
      // Update editedDataList with the first value
      editedDataList.current[storeCode][columnNameForPayload] = valueToRestore;
      rowNode.setDataValue(l_column, valueToRestore);
      if (expandableDetailsRef.current) {
        expandableDetailsRef.current.updateData();
      }
      return;
    } else {
      //available quantity is not negative
      // use the first value to properly calculate restored available quantity
      const originalValue = firstValue || initialAllocated;
      let restoredAvailable = currentAvailable + originalValue;
      let tempValue = getNearestMultiple(inputValue, props?.selectedData?.inner_pack_units || 1, restoredAvailable);
      editedDataList.current[storeCode][columnNameForPayload] = tempValue;
      
      let finalInputValue = tempValue;
      
      if (tempValue !== inputValue) {
        displaySnackMessages(
          "The entered value is not a multiple of the inner pack units/packs so it has been adjusted to the nearest multiple",
          "error"
        );
      }

      let newAvailable = restoredAvailable - tempValue;

      rowNode.setDataValue(l_availabecolumn, newAvailable);
      productStoreDetailsTableInstance.current.api.applyTransaction({
        update: [{
          store_code: data.store_code,
          ...data,
          [l_column]: finalInputValue,
          [l_availabecolumn]: newAvailable,
        }]
      });
      if (expandableDetailsRef.current) {
        expandableDetailsRef.current.updateData();
      }
    }
  }, [props?.selectedData?.inner_pack_units]);

  const resetProductStoreDetailsState = () => {
    // setUserEdits({});
    editedDataList.current = {};
    previousValues.current = {};
    setIsTableValueChanged(false);
    setUserEditsForAllEdits({});
    
    // Clear any pending debounce timers
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
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
      let {
        column: { colId, colDef },
        data,
        value,
        oldValue,
      } = params;
      let storeCode = data.store_code;
      if (!editedDataList.current[storeCode]) {
        editedDataList.current[storeCode] = {};
      }
      if (colId === "delivery_dt") {
        let deliveryDt = data[colId]
          ? moment(data[colId]).format("YYYY-MM-DD")
          : null;
        editedDataList.current[data.store_code][colId] = deliveryDt;
        setIsTableValueChanged(true);
      }

      if (colId.includes("allocated_quantity__dc__")) {
        setIsTableValueChanged(true);
        let l_column = colId;
        
        // Use colDef.originalLabel - stored in column-formatter.js before any modifications
        // This contains the exact label from API response without special character replacements
        let columnNameForPayload = props?.finalizeAllocationConfig?.sendEditLabel && colDef?.originalLabel
          ? l_column.replace("allocated_quantity__dc__", "").split("__")[0] + "__" + colDef.originalLabel
          : l_column.replace("allocated_quantity__dc__", "");
        let l_availabecolumn = l_column.replace(
          "allocated_quantity__dc__",
          "net_dc_available__"
        );
        let l_instance = availableproductStoreDetailsTableInstance?.current;
        let rowNode = l_instance?.api.getRenderedNodes()[0];

        // create a unique key for this cell to keep previous value
        const cellKey = `${data.store_code}_${l_column}`;

        // Store the very first value when a user starts editing the field
        // Only set the initial value if this is the first change in a sequence
        if (
          previousValues.current[cellKey] === null ||
          previousValues.current[cellKey] === undefined
        ) {
          previousValues.current[cellKey] = oldValue;
        }

        let actualPreviousValue = previousValues.current[cellKey];

        // Check if available quantity is negative
        let currentAvailable = Number(rowNode?.data?.[l_availabecolumn] || 0);
        let inputValue = Number(value || 0);
        let initialAllocated = Number(actualPreviousValue || 0);

        //store the input temporarily and clear any existing timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
          // The debounce is only meant to coalesce rapid edits to the SAME cell.
          // If a different cell's edit is still pending, flush it now so switching
          // rows/columns before the timer fires does not silently drop it.
          if (
            pendingInputRef.current &&
            pendingInputRef.current.cellKey !== cellKey
          ) {
            processAllocatedQuantityInput(pendingInputRef.current);
            previousValues.current[pendingInputRef.current.cellKey] = null;
            pendingInputRef.current = null;
          }
        }

        const inputData = {
          storeCode,
          columnNameForPayload,
          l_column,
          l_availabecolumn,
          cellKey,
          currentAvailable,
          inputValue,
          initialAllocated,
          data,
          rowNode,
          firstValue: actualPreviousValue, // Pass the first value to the processing function
        };

        // Keep a reference to the latest pending edit so it can be flushed
        // synchronously if the user clicks Save before the debounce fires.
        pendingInputRef.current = inputData;

        debounceTimerRef.current = setTimeout(() => {
          processAllocatedQuantityInput(inputData);
          debounceTimerRef.current = null;
          pendingInputRef.current = null;
          // Reset the previous value after processing is complete
          // This allows capturing the initial value for the next edit sequence
          previousValues.current[cellKey] = null;
        }, 200);
      } else {
        if (oldValue !== value) {
          setIsTableValueChanged(true);
          data[colId] = value;
          if (colId === "ticket_type") {
            editedDataList.current[storeCode][colId] =
              value?.length > 0 ? value[0]?.value : value;
          } else {
            editedDataList.current[storeCode][colId] = value;
          }
          availableproductStoreDetailsTableInstance.current.api.refreshCells({
            columns: [colId],
          });
        }
      }
    }
  };

  const prependData = () => {
    if (!isEmpty(downloadFormatChipsDependency)) {
      let prependContentReq = prependExtraData(downloadFormatChipsDependency);
      return appendExcelDownloadData(prependContentReq);
    }
  };

  useEffect(() => {
    if (!isEmpty(originalColumnsRef.current) && originalColumnsRef.current.editableColumns) {
      const isViewMode =(props.finalizeAllocationConfig.showSizeDetails && !props.disabledEditDuetoChildEdit && props.selectedOption === 'edit') || (props.renderToggleSummary && props.selectedOption === "view") || props.disableEditDueToParentEdit;
      
     if (isViewMode) {
        // Clone current columns and disable editing
        const updatedColumns = cloneDeep(productStoreDetailsTableColumns);
        applyNonEditableState(updatedColumns);
        setProductStoreDetailsTableColumns(updatedColumns);
      } else {
        // Restore to the original editable state
        const editableColumns = cloneDeep(originalColumnsRef.current.editableColumns);
        setProductStoreDetailsTableColumns(editableColumns);
      }
    }
  }, [props.disableEditDueToParentEdit, props.selectedOption, props.disabledEditDuetoChildEdit]);

  useEffect(() => {
    if (props.filterDashboardConfiguration?.dependencyData?.length) {
      let filterChips = fetchFilterChipsToDownload(
        props.filterDashboardConfiguration?.dependencyData
      );
      setDownloadFormatChipsDependency(filterChips);
    }
  }, [props.filterDashboardConfiguration]);
  const setTitle = () => {
    const articleToDisplay = props?.displayArticle || props.selectedArticle;
    let str = `${dynamicLabelsBasedOnTenant("article")} Store Details of 
    ${articleToDisplay} - Net DC Available`;
    str = replaceSpecialCharacter(str);
    if (isStoreBand) {
      return "Store Band Details";
    } else {
      return str;
    }
  };
  const getTopRightOptions = () => {
    let rightBtns = [];
    
    // Alan Explainatory Button - Show if alanExplainability is true and exactly one row is selected
    if (props?.alanExplainability === true && selectedRowsCount === 1) {
      rightBtns.push(
        <div className={classes.inventoryDetailsBtnContainer}>
          <Tooltip title="" variant="tertiary">
            <div
              onClick={() => setAlanSummaryPanelStatus(true)}
              className={`inventory-details-btn`}
            >
              <AiIcon />
              Iris Explainatory
            </div>
          </Tooltip>
        </div>
      );
    }
    // Show buttons if in edit mode OR if parent edit is enabled (to show disabled buttons)
    if (
      (props.selectedOption === "edit" || props.disableEditDueToParentEdit || !props.renderToggleSummary) &&
      !isStoreBand &&
      !shouldDisplayGridBulkEditButtons(
        props.planStatus,
        props.planType,
        props?.finalizeAllocationConfig?.subComponent
      ) 
    ) {
      if (props?.finalizeAllocationConfig?.finalizeBulkEdit && selectedRowsCount > 1) {
        rightBtns = [
          ...rightBtns,
          <Button
            variant="tertiary"
            disabled={
              props.disableEditDueToParentEdit ||
              (props.renderToggleSummary && props.selectedOption !== "edit") ||
              disabledForViewOnlyAccess || 
              !buttonEnabled || 
              props.finalized
            }
            id="bulkEditEachesBtn"
            onClick={() => editAllocatedQtyHandler("bulk")}
          >
            Bulk Edit
          </Button>,
        ];
      }
      if(!props.finalizeAllocationConfig.showSizeDetails && !(props.disableEditDueToParentEdit ||
        (props.renderToggleSummary && props.selectedOption !== "edit") ||
        disabledForViewOnlyAccess ||
        (isEmpty(userEditsForAllEdits) && !isTableValueChanged) ||
        props.finalized)){
          rightBtns = [
            ...rightBtns,
            <Button
              variant="primary"
              id="productSetAllBtn"
              // disabled={
              //   props.disableEditDueToParentEdit ||
              //   (props.renderToggleSummary && props.selectedOption !== "edit") ||
              //   disabledForViewOnlyAccess ||
              //   (isEmpty(userEditsForAllEdits) && !isTableValueChanged) ||
              //   props.finalized
              // }
              onClick={() => saveHandler()}
            >
              Save Grid Edit
            </Button>,
          ];
        }

        if (props.finalizeAllocationConfig.showSizeDetails) {
          rightBtns = [
            ...rightBtns,
            <Button
              variant={
                props.disableEditDueToParentEdit || !props.disabledEditDuetoChildEdit
                  ? "primary"
                  : "secondary"
              }
              id="productSetAllBtn"
              disabled={
                props.disableEditDueToParentEdit ||
                (props.renderToggleSummary && props.selectedOption !== "edit") ||
                disabledForViewOnlyAccess ||
                props.finalized
              }
              onClick={() => {
                props.setDisableEditDuetoChildEdit(!props.disabledEditDuetoChildEdit)
                resetProductStoreDetailsState()
              }}
            >
              Edit
            </Button>,
          ];
          {!props.disableEditDueToParentEdit && (
            rightBtns = [
              ...rightBtns,
              <Button
                variant="primary"
                id="productSetAllBtn"
                disabled={isEmpty(userEditsForAllEdits) && !isTableValueChanged}
                onClick={() => saveHandler()}
              >
                Save
              </Button>
            ]
          )}
        }
      return rightBtns;
    } else {
      return rightBtns.length > 0 ? rightBtns : null;
    }
  };

  const productStoreTableHeader = useMemo(() => {
    const title = props.ProductStoreDetailsTableHeader
      ? props.ProductStoreDetailsTableHeader
      : `Product-Store${isStoreBand ? " Band" : ""} Details`;

    const articleLabel =
      props.productDetailsTableColumns?.find(
        (column) => column.column_name === articleKey
      )?.label || "Article ID";

    return (
      <div className={titleClasses.titleContainer}>
        <span className={titleClasses.title}>{title}</span>
        <div className={titleClasses.dividerLine}></div>
        <span className={titleClasses.titleSubTitle}>{articleLabel}</span>
        <span className={titleClasses.titleSubTitleValue}>
          {replaceSpecialCharacter(props.displayArticle || props.selectedArticle) ||
            "N/A"}
        </span>
      </div>
    );
  }, [
    articleKey,
    isStoreBand,
    props.ProductStoreDetailsTableHeader,
    props.displayArticle,
    props.productDetailsTableColumns,
    props.selectedArticle
  ]);

  // Memoize the columns array so its reference stays stable across the
  // re-renders triggered by cell edits. Recreating this array inline on every
  // render made AG Grid re-process the column defs and reset the horizontal
  // scroll position to the left after each edit.
  const memoizedProductStoreColumns = useMemo(
    () => [
      { ...productStoreDetailsTableColumns[0] },
      ...productStoreDetailsTableColumns.slice(1),
    ],
    [productStoreDetailsTableColumns]
  );

  const SizeViewDetailsTableWrapper = (innerProps) => {
    return (
      <div className={classes.masterDetailPadding}>
        <SizeViewDetailsTable  
          {...innerProps}
          selectedArticle={props.selectedArticle}
          displayArticle={props.displayArticle}
          singleSize={true}
        />
      </div>
    )
  }

  return (
    <div className={`${globalClasses.contentBody} ${classes.borderContainer}`}>
      <Loader loader={props.productStoreTableLoader}>
        {openPopup && (
          <StoreSizeModal
            columns={agGridColumnFormatter(modalColumns?.[columnSelected])}
            storeSizeData={modalRows}
            setOpenPopup={setOpenPopup}
          />
        )}
        <div className={globalClasses.contentBody}>
          {!isEmpty(availableProductStoreDetailsTableColumns) &&
            !props.hideProductSizeTable && (
              <div>
                <ExpandableDetails
                  ref={expandableDetailsRef}
                  title="Net DC Available"
                  selectedArticle={props.displayArticle || props.selectedArticle}
                  rowData={availableproductStoreDetailsTableData}
                  columns={availableProductStoreDetailsTableColumns}
                  productDetailsTableColumns={props.productDetailsTableColumns}
                  gridApi={
                    availableproductStoreDetailsTableInstance?.current?.api
                  }
                  articleKey={articleKey}
                  handleCloseButtonClick={() => {
                    props.setViewStoreDetailsTable(false);
                  }}
                  viewPackConfiguration={!!(props.finalizeAllocationConfig?.showSizeDetails && !props.isStoreView)}
                />
                <div style={{ display: "none" }}>
                  <AgGridComponent
                    columns={availableProductStoreDetailsTableColumns}
                    rowdata={availableproductStoreDetailsTableData}
                    loadTableInstance={availableLoadTableInstance} // to make use of available grid api's
                    downloadAsExcel={
                      availableproductStoreDetailsTableData?.length
                        ? true
                        : false
                    }
                    uniqueRowId={"dc_name"}
                    tableHeader={setTitle()}
                    suppressFieldDotNotation
                    sizeColumnsToFitFlag
                    toPrependContent={props.excelDownloadMetaData}
                    prependedContentDetails={prependData()}
                    closeButton={true}
                    handleCloseButtonClick={() => {
                      props.setViewStoreDetailsTable(false);
                    }}
                  />
                </div>
              </div>
            )}
            {props.finalizeAllocationConfig?.showSizeDetails && props.isStoreView && (
              <SizeViewDetailsTable
                selectedArticle={props.selectedArticle}
                displayArticle={props.displayArticle}
                isStoreView={props.isStoreView}
              />
            )}
          {reMount && (
            <div className={globalClasses.marginVertical1rem}>
              <AgGridComponent
                selectAllHeaderComponent={
                  props?.finalizeAllocationConfig
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
                tableHeader={productStoreTableHeader}
                columns={memoizedProductStoreColumns}
                rowdata={productStoreDetailsTableData}
                // getRowStyle={(params) => {
                //   if (+params?.data?.min_net_available < 0) {
                //     return {
                //       background: "rgb(255,255,0.5)",
                //     };
                //   }
                // }}
                onSelectionChanged={onSelectionChanged}
                onBlur={onBlur}
                onCellValueChanged={onCellValueChanged}
                rowSelection={isStoreBand ? false : "multiple"}
                onEditClick={(tableInfo) =>
                  editAllocatedQtyHandler("action", tableInfo)
                }
                loadTableInstance={loadTableInstance} // to make use of available grid api's
                uniqueRowId={isStoreBand ? "psa_name" : "store_code"}
                downloadAsExcel={
                  productStoreDetailsTableData?.length ? true : false
                }
                showDownloadTooltip={true}
                suppressFieldDotNotation
                pagination={false}
                hideSelectCurrentPageRecords
                topRightOptions={getTopRightOptions()}
                isEditDisabled={() =>
                  !shoulDisable(props.inventorysmartModulesPermission)
                }
                toPrependContent={props.excelDownloadMetaData}
                prependedContentDetails={prependData()}
                styleConfig={styleConfig}
                {...(props.finalizeAllocationConfig?.showSizeDetails && !props.isStoreView ? {
                  masterDetail: true,
                  detailRowAutoHeight: true,
                  detailCellRenderer: SizeViewDetailsTableWrapper,
                } : {})}
              />
            </div>
          )}
        </div>
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
            availableproductStoreDetailsTableData={
              availableproductStoreDetailsTableDataCopy
            }
            setButtonEnabled={setButtonEnabled}
            columns={productStoreDetailsTableColumns}
            selectedRowsForBulkEdit={selectedRowsForBulkEdit}
            selectAll={
              selectedRowsForBulkEdit?.length ===
              productStoreDetailsTableData?.length
                ? true
                : false
            }
            productStoreDetailsTableInstance={
              productStoreDetailsTableInstance.current
            }
            allocationCode={props.allocationCode}
            selectedArticle={props.selectedArticle}
            displayArticle={props.displayArticle}
            selectedData={props.selectedData}
            setShowSetAllModal={(showModal) =>
              setBulkEditAllocatedQty(showModal)
            }
            resetProductStoreDetailsState={resetProductStoreDetailsState}
            dcs={dcs}
            sendEditLabel={props?.finalizeAllocationConfig?.sendEditLabel}
            // isHLE={true}
          />
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
              Product - Store Details
            </Typography>
            <ProductStoreSizeDetailsTable
              selectedArticle={props.selectedArticle}
              selectedStoreCode={modalRows?.[0]?.psa_name}
              resetProductStoreDetailsState={resetProductStoreDetailsState}
              disabledForViewOnlyAccess={disabledForViewOnlyAccess}
              isStoreBand={isStoreBand}
              setReMount={setReMount}
              selectedData={props.selectedData}
            />
          </Paper>
        </div>
      )}

      {props.finalizeAllocationConfig?.showSizeDetails && !props.isStoreView && (
        <SizeViewDetailsTable
          selectedArticle={props.selectedArticle}
          displayArticle={props.displayArticle}
          isStoreView={props.isStoreView}
        />
      )}
      {alanSummaryPanelStatus && (
        <AlanSummaryPanel
          open={alanSummaryPanelStatus}
          onClose={setAlanSummaryPanelStatus}
          selectedRows={selectedRows}
          explainatoryAllocationCode={props?.allocationCode}
          selectedStoreColorId={props?.selectedArticle}
          setStoreCode={selectedRows?.[0]?.store_code}
          alanExplainability={props?.alanExplainability}
        />
      )}
    </div>
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
    hideProductSizeTable:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.hideProductTable,
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
    finalizeAllocationConfig:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartFinalizeAllocationConfig,
    fetchProductStoreDetails:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .fetchProductStoreDetails,
    fetchProductDetails:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .fetchProductDetails,
    ProductStoreDetailsTableHeader:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig
        ?.ProductStoreDetailsTableHeader,
    alanExplainability:
      store.inventorysmartReducer.inventorySmartDashboardService?.alanExplainability,
    calendarDayShippingDateDefaults:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartCreateAllocationConfig
        ?.calendar_day_shipping_date_defaults
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
  setFetchProductStoreDetails: (payload) =>
    dispatch(setFetchProductStoreDetails(payload)),
  setFetchArticleSummary: (payload) =>
    dispatch(setFetchArticleSummary(payload)),
  setFetchProductDetails: (payload) =>
    dispatch(setFetchProductDetails(payload)),
  setProductViewLoader: (payload) => dispatch(setProductViewLoader(payload)),
  setStoreViewLoader: (payload) => dispatch(setStoreViewLoader(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductStoreDetailsTable);