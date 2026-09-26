import { Button } from "@mui/material";
import {DownloadOutlined }from '@mui/icons-material';
import makeStyles from "@mui/styles/makeStyles";
import SetAll from "core/Utils/agGrid/setall-form";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import {
  setLastSearchType,
  setTableSearchConfig,
} from "core/actions/tableColumnActions";
import { LicenseManager } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import classNames from "classnames";
import {
  cloneDeep,
  isEmpty,
  isNil,
  isObject,
  debounce,
  throttle,
} from "lodash";
import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connect, useDispatch } from "react-redux";
import "./ag-theme-mtp.scss";
import FormatColumns from "./column-component/formatColumns";
import SelectAllComponent from "./column-component/selectAllComponent";
import TableActions from "./column-component/tableActions";
import {
  ascendingOrderLabel,
  descendingOrderLabel,
  groupContractedIcon,
  groupExpandedIcon,
  PINNED_VIEWPORT_THRESHOLD,
  AUTO_TRIGGERED_SOURCES,
} from "./constants";
import { checkAllHandler, checkRowHandler } from "./select-rows-functions";
import {
  autoSizeGridColumns,
  customCompare,
  defaultToolPanelFormat,
  formatNumber,
  getAllColumnsWidth,
  getGridWidth,
  getTypeCastInfoForSearchAndSort,
  nonFormattingCoulumnHeaders,
  numberFormattingDataTypes,
  onColMenuAutoAdjustClick,
  onColMenuFreezeClick,
  onColumnWidthDrag,
  parseRangeBody,
  sortFunc,
  updateFontSizeOnToolPanel,
  freezeColumn,
} from "./table-functions";
// import { dummyrule1, dummyColoumnRule1 } from "./table-functions";
import { filterAccessibleTableData } from "core/Utils/filter-accessible-data";
import { isNonPrimitiveArray } from "modules/inventorysmart/pages-inventorysmart/Create-Allocation/helperFunctions";
import moment from "moment";
import CustomHeader from "./CustomHeader";
import { fetchDynamicConfigFromTenantReducer } from "core/Utils/DynamicLabels";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";
import CustomNoRowOverlay from "./custom-no-row-overlay";
import DownloadIcon from "@mui/icons-material/Download";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";

const NoCheckBox = () => {
  return null;
};

LicenseManager.setLicenseKey(
  "CompanyName=Impact Analytics,LicensedGroup=31Jan22 Purchase,LicenseType=MultipleApplications,LicensedConcurrentDeveloperCount=1,LicensedProductionInstancesCount=0,AssetReference=AG-025014,ExpiryDate=31_January_2023_[v2]_MTY3NTEyMzIwMDAwMA==e4f58ef1fe10261cf66aa1e5a5cb2da6"
);

const useStyles = makeStyles((theme) => ({
  setAllButton: {
    marginTop: "1rem",
    textAlign: "right",
    marginBottom: "1rem",
  },
  alignRight: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "3px",
    marginBottom:"12px"
  },
}));

/*  Important keys and their function 
_hideSelection  :: pass this key in your rowData at row level it will disable the selection for that row.
hideChildSelection :: to hide selection for all the child rows 
childKey   ::  if you are using server side Model and have client side grouping or tree data. then pass use this key which has child rows data.
*/

const AgGridComponent = (props) => {
  const [gridColumns, setGridColumns] = useState([]);
  const [agGrid, setAgGrid] = useState({});
  const [prevAction, setPrevAction] = useState("");
  const [checkConfiguration, setCheckConfiguration] = useState([]);
  const selectedRowIds = useRef(new Map());
  const [showSetAll, setShowSetAll] = useState(false);
  const [isSelectAllRecords, setIsSelectAllRecords] = useState(false);
  const [clientSideTableData, setClientSideTableData] = useState([]);
  const selectAllRecordsState = useRef(null);
  const [tableFontSize, setTableFontSize] = useState(
    defaultToolPanelFormat.DEFAULT_FONT_SIZE
  );
  const [numericFormat, setNumericFormat] = useState(
    defaultToolPanelFormat.DEFAULT_NUMBER_FORMAT
  );
  const hasSearchElement = useRef(null);
  const classes = useStyles();
  const globalClasses = globalStyles();
  const dispatch = useDispatch();
  let {
    hideHeaderCheckboxComponent = false,
    selectAllHeaderComponent,
    updateData,
    rowSelection,
    rowMultiSelectWithClick,
    onSelectionChanged, // event fired when click on checkboxes for row selection, returns columnapi and api
    onRowSelected, // event fired on row selection returns node(row) data
    autoSizeColumnsFlag,
    onEditClick,
    isEditDisabled,
    callDeleteApi,
    isDeleteDisabled,
    onChartClick,
    onReviewClick,
    onImageClick,
    onBlur,
    suppressAggFuncInHeader,
    customizeRowGroupingIcon, // to render diff icons for row expanding and collapsing instead of '>'
    manualCallBack,
    rowModelType,
    cacheOverflowSize,
    cacheBlockSize, // number of rows returned per req(for BE pagination start index:0, end index:10, default:100 )
    serverSideStoreType, //values - partial or full
    uniqueRowId,
    loadTableInstance,
    hideSelectCurrentPageRecords = false,
    hideSelectAllRecords = false,
    groupSelectsChildren,
    groupIncludeTotalFooter,
    onGridChanged,
    onApplyCalendarDates, //On Calendar add icon
    autoGroupColumnDef,
    getGroupRowAgg,
    groupHideOpenParents,
    pagination = true,
    domLayout = "autoHeight",
    rowClassRules,
    selectedRows,
    callBackToSetCheckConfig,
    alignedGrids,
    headerHeight,
    masterDetail,
    isRowMaster,
    keepDetailRows,
    tableRef,
    detailCellRenderer,
    detailRowHeight,
    purgeClosedRowNodes,
    customSetAllFields,
    getSubRowsRequest,
    suppressClickEdit,
    getRowStyle,
    uncheckRows,
    lockCellApi,
    lockCellCustomConditionFn,
    lockCellIfNoValue = false,
    customSideBar = [],
    isExternalFilterPresent,
    doesExternalFilterPass,
    showColumnPanel = true,
    customCellRenderer,
    budgetTableChangeFunc,
    handleValidation,
    onToggleChange,
    onCheckBoxChange,
    downloadAsExcel,
    suppressFieldDotNotation = false,
    tableId,
    onDownloadClick,
    isRowSelectable,
    detailRowAutoHeight = false, //to have the detail grid dynamically change it's height to fit it's rows (Master Detail),
    rowGroupPanelShow,
    minWidth = 100,
    hideRangeFilter = false,
    noEditableCustomCellRender,
    customClass = "",
    optionsForContextMenu,
    groupDefaultExpanded,
    groupRowRendererParams,
    showSaveTableConfig = true,
    showSearchModalBtn = fetchDynamicConfigFromTenantReducer(
      "core",
      "showSearchModalBtn"
    ),
    isGroupOpenByDefault,
    customAggFunction,
    cellValueChanged,
    callBackOnChangeCustomFunction,
    enableRowSpan,
    rowSpanColumn,
    getRowData,
    onCellFocused,
    onColumnVisible,
    enableRangeSelection = false,
    processDataFromClipboard,
    processCellForClipboard,
    processHeaderForClipboard,
    processCellCallbackForExcel,
    skipAutoSizeColumn = false,
    isServerSideGroupOpenByDefault,
    // to enable sorting of table columns on click of column header
    sortable = false,
    allowCustomStyling = false,
    menuTabs = ["generalMenuTab"],
    skipHeaderOnAutoSize = false,
    enableCustomRowHeight,
    toPrependContent, // used in excel download to prepend or append extra content along with table data
    prependedContentDetails,
    toAppendContent,
    appendContentDetails,
    onPaginationChanged,
    adjustTableHeightServerSide, //used to remove double scroll
    groupHeaderHeight,
    applyFormatOnfocus,
    valueCache = false,
    customTabFunction,
    applyBudgetTableFormatting,
    metrics_with_formatter, // plansmart metric formatter config
    disableTableUam = false,
    onRangeSliderChange,
    disableExcelDownload,
    disablesaveConfig,
    sizeColumnsToFitFlag = false,
    PaginationComponent,
    statusBar = false,
    showPaginationPageSize = false,
    downloadStyle,
    btnVariant,
    noRowOverlayMessage = "",
    skipAutoSizeColumnOnSideBarAction = false,
    setIsFilterChanged, // NOTE: To check If the filter is changed as it is required to recalculate Total row inside table
    suppressColumnMoveAnimation = true,
  } = props;
  // allowCustomStyling -> only custom styling from component

  const { tableConfig } = props.inventorysmartScreenConfig || {};
  const { clientTable } = tableConfig || {};
  const {
    ignoreTableFiltersOnDownload, // Ignore client-side table column filters on download
  } = clientTable || {};

  const autoSizeManualClick = useRef(false);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const noRowsOverlayComponent = useMemo(() => {
    return CustomNoRowOverlay;
  }, []);
  const noRowsOverlayComponentParams = useMemo(() => {
    return {
      noRowsMessageFunc: () => {
        if (
          props.filterReducer?.isFilterApplied &&
          isEmpty(noRowOverlayMessage)
        ) {
          return "No data applicable for selected filters";
        } else if (!isEmpty(noRowOverlayMessage)) {
          return noRowOverlayMessage;
        } else {
          return "Please select filter(s) to view data";
        }
      },
    };
  }, [props.filterReducer?.isFilterApplied]);

  useEffect(() => {
    return () => {
      props.setLastSearchType(null);
    };
  }, []);

  useEffect(() => {
    return () => {
      props.setLastSearchType(null);
    };
  }, []);

  useEffect(() => {
    return () => {
      props.setLastSearchType(null);
    };
  }, []);

  useEffect(() => {
    return () => {
      props.setLastSearchType(null);
    };
  }, []);

  useEffect(() => {
    return () => {
      props.setLastSearchType(null);
    };
  }, []);

  useEffect(() => {
    if (!isEmpty(agGrid)) {
      resizeGridColumns(agGrid);
    }
  }, [gridColumns]);

  const resizeGridColumns = (params) => {
    if (!skipAutoSizeColumn) {
      setGridColumnWidth(params, false, sizeColumnsToFitFlag);
    }
  };

  const getSubRowsData = async (params) => {
    let childRowsKey = props.childKey ? props.childKey : "subRows";
    if (getSubRowsRequest) {
      return await getSubRowsRequest(params);
    } else {
      let subRows =
        params.parentNode.data[childRowsKey]?.slice(
          params.request.startRow,
          params.request.endRow
        ) || null;
      return {
        data: subRows,
        totalCount: params.parentNode.data[childRowsKey]?.length || 0,
      };
    }
  };

  useEffect(() => {
    if (!isNil(props.rowdata)) {
      if (!disableTableUam && props.tenantTableUamConfig) {
        setClientSideTableData(
          filterAccessibleTableData(props.rowdata, props.userAccessList)
        );
      } else {
        setClientSideTableData(props.rowdata);
      }
    }
  }, [props.rowdata]);

  const deSelectAllRows = (value, instance, hideSelectAllIcon) => {
    if (hideSelectAllIcon) {
      instance.api.deselectAll(value);
      selectAllRecordsState.current(true, instance);
    } else {
      instance.api.deselectAll(value);
    }
  };

  /**
   * @func
   * @desc Updating Object with required searchable parameters
   * @param {Object} columns
   * @param {String} parentLabel
   */
  const defineSearchableParams = (columns, parentLabel) => {
    columns.forEach((column) => {
      if (column.is_searchable) {
        column.floatingFilter = false;
      }
      if (column.sub_headers?.length) {
        defineSearchableParams(column.sub_headers, column.label);
      } else {
        column.searchableLabel = parentLabel + "-" + column.label;
      }
    });
  };

  useEffect(() => {
    if (!isEmpty(agGrid)) {
      // to fetch filters applied on table
      let filtersModal = agGrid.api.getFilterModel();
      // Setting a prop - checkAll to indicate if select all records check is active or not
      agGrid.api.prevAction = prevAction;
      agGrid.api.checkConfiguration = checkConfiguration;
      agGrid.api.ignoreClearSelectionOnSearchandSort =
        props.ignoreClearSelectionOnSearchandSort;
      agGrid.api.filteredCheckAll = Object.keys(filtersModal).length
        ? true
        : false;
      let agGridCopy = agGrid;
      setAgGrid(agGridCopy);
      agGrid.api.isSelectAllRecords = isSelectAllRecords;
      agGrid.api.reConciledSelectedRowIds = selectedRowIds?.current;
    }
  }, [agGrid, prevAction, checkConfiguration, isSelectAllRecords]);
  useEffect(() => {
    // resetting the table format to default on component unmount
    return resetActions();
  }, []);
  const resetActions = () => {
    setTableFontSize(defaultToolPanelFormat.DEFAULT_FONT_SIZE);
    setNumericFormat(defaultToolPanelFormat.DEFAULT_NUMBER_FORMAT);
  };

  const prepareMetaPayload = (params, api) => {
    const { filterModel, sortModel } = params;
    let toSearchKeys = [],
      toSortKey = [],
      toRangeKey = [];
    if (!isEmpty(filterModel)) {
      // Append tp-active to handle hight of active sideBar action.
      api?.sideBarComp?.sideBarButtonsComp?.buttonComps?.forEach((button) => {
        if (button.toolPanelDef.id === "table-actions") {
          button.eGui?.classList.add("tp-active");
        }
      });
      let keyList = Object.keys(filterModel);
      keyList.forEach((filterKey) => {
        //If the filterColumnType is number, we parse the filterBody into range field
        if (
          filterModel[filterKey].filterType === "number" ||
          filterModel[filterKey].filterType === "date"
        ) {
          toRangeKey.push(
            parseRangeBody(filterKey, filterModel, showSearchModalBtn)
          );
        } else {
          //Else we parse the filterBody into search field
          // trimming for trailing comma (",") and blank space
          let patternText = filterModel[filterKey].filter?.replace(
            /[,\s]*$/,
            ""
          );
          let listType = api.columnModel.columnDefs.some(
            (col) => "list" == col.type && col.accessor == filterKey
          );
          if (filterModel[filterKey].filterType === "set") {
            patternText = filterModel[filterKey].values;
          }
          if (filterModel[filterKey].filterType === "text") {
            patternText =
              patternText.indexOf(",") < 0
                ? replaceSpecialCharToCharCode(patternText)
                : patternText
                    .split(",")
                    .map((pattern) => replaceSpecialCharToCharCode(pattern))
                    .join(",");
          }
          toSearchKeys.push({
            column: filterKey,
            pattern: patternText,
            ...(showSearchModalBtn &&
              api.isAdvSearch && {
                search_type: filterModel[filterKey].type,
              }),
            ...(listType && {
              type: "list",
            }),
          });
        }
      });
    } else {
      api?.sideBarComp?.sideBarButtonsComp?.buttonComps?.forEach((button) => {
        if (button.toolPanelDef.id === "table-actions") {
          button.eGui?.classList.remove("tp-active");
        }
      });
    }
    if (sortModel.length) {
      toSortKey = [
        {
          column: sortModel[0]?.colId,
          order: sortModel[0]?.sort || [],
        },
      ];
    }

    //commented as for now, casting property is needed only on sort

    // toSearchKeys = toSearchKeys.map((searchKey) => {
    //   return {
    //     ...searchKey,
    //     column: getTypeCastInfoForSearchAndSort(
    //       params?.columnApi?.columnModel?.columnDefs || [],
    //       searchKey["column"]
    //     ),
    //   };
    // });
    // toRangeKey = toRangeKey.map((rangeKey) => {
    //   return {
    //     ...rangeKey,
    //     column: getTypeCastInfoForSearchAndSort(
    //       params?.columnApi?.columnModel?.columnDefs || [],
    //       rangeKey["column"]
    //     ),
    //   };
    // });

    toSortKey = toSortKey.map((sortKey) => {
      return {
        ...sortKey,
        column: getTypeCastInfoForSearchAndSort(
          api?.columnModel?.columnDefs || [],
          sortKey["column"]
        ),
      };
    });
    return {
      search: toSearchKeys,
      range: toRangeKey,
      sort: toSortKey,
    };
  };

  const datasource = {
    getRows: async (params) => {
      const { startRow, groupKeys } = params.request;
      params.api?.hideOverlay();
      let body = prepareMetaPayload(params.request, params.api);

      if (body["search"].length !== 0 && params.api.checkAll) {
        // setting to true - if filters are present and the number of filtered records are more than 10,
        // next page records should be selected
        params.api.checkAll = true;
        params.api.filteredCheckAll = true;
        setAgGrid(params);
      }

      if (params.api.filteredCheckAll && body["search"].length === 0) {
        params.api.checkAll = false;
        setAgGrid(params);
      }

      let page = startRow / props.cacheBlockSize;
      // wait until data is fetched to display in the table
      // calls respective table data api

      let paginatedRows = {};
      if (groupKeys.length > 0) {
        paginatedRows = await getSubRowsData(params);
      } else {
        // Update tableInstance with latest filter data to be accessed via Instance Object on change of filters
        params.api.gridOptionsWrapper.gridOptions.filterBody = body;
        paginatedRows = await params.api.gridOptionsWrapper.gridOptions.manualCallBack(
          body,
          page,
          params
        );
      }
      // params - rowData [], rowCount - num (total num of rows), if not present displays "more" instead of count
      // If a user does not provide a total count and has exhausted the data after paginating to the last page,
      // pass total num of records to set total number of pages to disable the next button
      if (
        paginatedRows?.data?.length === 0 ||
        // out of data - set to true from backend when last data set has reached
        paginatedRows?.outOfData
      ) {
        /*
          When the data is exhausted we navigate the user back to the previous page, disable the next button by 
          setting the count based on number of rows that have the "data" key within them and update the total count
        */
        let rowCount = 0;
        // Adding a condition here as "no records" msg is displayed on the table along with table records when we force the user to navigate to previous page with records.
        // The message will be shown only when the data is empty and on initial page, i.e page 0
        if (params.api.paginationGetCurrentPage() === 0)
          params.api.showNoRowsOverlay();
        params.api.forEachNode((node) => {
          if ("data" in node) {
            rowCount++;
          }
        });
        params.api.paginationGoToPreviousPage();
        params.successCallback(paginatedRows.data, rowCount);
      }
      // to prevent loading issue - renders only rows with data. Total count is added in the condition to navigate to last page with proper page count
      else if (
        paginatedRows?.data?.length < props.cacheBlockSize &&
        !paginatedRows?.totalCount
      ) {
        params.api.hideOverlay();
        let rowCount = 0;
        params.api.forEachNode((_node) => {
          rowCount++;
        });
        params.successCallback(
          paginatedRows.data,
          paginatedRows.data?.length !== rowCount
            ? // On reaching the last page, the first record of last page's paginatedRows set is added into existing row count, hence the count increases by 1.
              // As there is an issue with total num of rows fetched and rowcount, we add the two of them and subtract by 1 to avoid mismatch in total count
              paginatedRows.data?.length + rowCount - 1
            : rowCount
        );
      } else {
        params.api.hideOverlay();
        await params.successCallback(
          paginatedRows?.data,
          paginatedRows?.totalCount
        );
      }

      // serverside paginated table should have unique column and it's id should be passed as prop to AgGridComponent.
      await params.api.forEachNode((node) => {
        let data = paginatedRows?.data?.map((val) => val?.[uniqueRowId]);
        if (data?.includes(node?.data?.[uniqueRowId])) {
          if (node?.data?.is_selected) {
            node.setSelected(true);
          } else {
            node.setSelected(false);
          }
        }
      });
      if(hasSearchElement.current) {
        params?.api?.gridBodyCtrl?.eGridBody?.querySelector(hasSearchElement.current).focus();
        hasSearchElement.current = null;
      }
    },
  };
  // datasource for inifinte scrolling

  const createDatasource = (p_api) => {
    return {
      rowCount: undefined,
      getRows: async (params) => {
        const { startRow } = params;
        params.api?.hideOverlay();
        let body = prepareMetaPayload(params, p_api.api);
        let page = startRow / props.cacheBlockSize;
        let rowData = await p_api.api.gridOptionsWrapper.gridOptions.manualCallBack(
          body,
          page,
          p_api
        );
        if (!rowData.data.length) {
          if (startRow === 0) p_api.api?.showNoRowsOverlay();
        } else {
          p_api.api?.hideOverlay();
        }
        const lastRow =
          rowData.data.length < gridOptions.cacheBlockSize
            ? params.startRow + rowData.data.length
            : -1;
        params.successCallback(rowData.data, lastRow);
        // serverside paginated table should have unique column and it's id should be passed as prop to AgGridComponent.
        await p_api.api.forEachNode((node) => {
          let data = rowData?.data?.map((val) => val?.[uniqueRowId]);
          if (data?.includes(node?.data?.[uniqueRowId])) {
            if (node?.data?.is_selected) {
              node.setSelected(true);
            } else {
              node.setSelected(false);
            }
          }
        });
        if(hasSearchElement.current) {
          p_api.api?.gridBodyCtrl?.eGridBody?.querySelector(hasSearchElement.current).focus();
          hasSearchElement.current = null;
        }
      },
    };
  };
  const isServerSideGroup = useCallback((dataItem) => {
    // indicate if node is a group
    if (props.checkRowMasterKey) {
      return dataItem[props.checkRowMasterKey];
    } else {
      return dataItem[props.childKey] || dataItem.subRows;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const throttledDisplaySnackMessages = throttle((message, type) => {
    displaySnackMessages(message, type);
  }, 5000);

  const getPinnedColumnsWidth = (columnApi) => {
    const pinnedLeftColumns = columnApi.getDisplayedLeftColumns();
    return pinnedLeftColumns?.reduce((totalWidth, column) => {
      return totalWidth + column.getActualWidth();
    }, 0);
  };

  const checkViewPortOnColumnResized = debounce((params) => {
    const { columnApi, api } = params;

    // Calculate the total width of pinned columns
    const pinnedWidth = getPinnedColumnsWidth(columnApi);

    // Get the visible viewport width using the DOM
    const gridElement = api.gridBodyCtrl.eBodyViewport;
    const viewportWidth = gridElement?.offsetWidth || 0;

    // Block resizing if pinned columns exceed 90% of the visible viewport width
    if (
      viewportWidth &&
      pinnedWidth > viewportWidth * PINNED_VIEWPORT_THRESHOLD
    ) {
      // Block resizing and show a warning message if resizing is triggered by user's manual click or drag and not due to auto grid re-rendering
      if (autoSizeManualClick.current || !AUTO_TRIGGERED_SOURCES.includes(params.source)) {
        throttledDisplaySnackMessages(
          "Freezed columns' width limit reached. Unfreeze or resize existing columns to proceed.",
          "error"
        );
      }
      //currently it blocks both kind of resize i.e. "autosize" and "manual resize via dragging column", following condition can be uncommented to unblock autosize
      columnApi.resetColumnState(); // Optionally reset the column to its previous size
      autoSizeManualClick.current = false;
      return true; // Return true to indicate the action was blocked and stop propagation
    }
    autoSizeManualClick.current = false;
    return false; // Return false if the action is allowed
  }, 100);

  const gridOptions = {
    localeText: {
      noRowsToShow:
        "No Data available. Please select the filter(s) to view the data.",
    },
    debounceVerticalScrollbar: true,
    defaultColDef: {
      singleClickEdit: true, // edit cell gets highlighted on single click
      minWidth,
      resizable: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      // on click of column label, columns gets sorted in respective order i.e. ascending, descending, none
      sortable: sortable,
      onCellValueChanged: (e) => {
        if (cellValueChanged) {
          cellValueChanged(e);
        }
      },
      onCellFocused: (e) => {
        onCellFocused(e);
      },
      //This custom comparator will override the exisiting aggrid's sort function
      //Existing aggrid sort function is sorting by first all caps and then lower case letters
      //are being sorted. To avoid this, we are using localCompare function for strings
      //If it is not string, we use normal relational operator comparision
      comparator: (a, b) =>
        typeof a === "string" && isNaN(+a) && a != "-" && b != "-"
          ? a.localeCompare(b)
          : customCompare(a, b),
      menuTabs,
    },
    suppressMenuHide: true,
    rowSelection: rowSelection,
    onGridReady: (params) => {
      // passing grid api's to parent on page load
      setAgGrid(params);
      let instance = params;
      let sideButtons = document.querySelector(".ag-side-buttons");
      // adding custom action on deselectAll event api to call refreshHeader
      const originalDeselectAll = instance.api.deselectAll;
      instance.api.deselectAll = () => {
        originalDeselectAll.apply(instance?.api);
        // setting isSelectAllRecords as false
        setIsSelectAllRecords(false);
        instance?.api?.refreshHeader();
      };
      instance.trigerSetAll = (flag) => setShowSetAll(flag);
      instance.api.setCheckConfiguration = (value) =>
        setCheckConfiguration(value);
      instance.api.setPrevAction = (value) => setPrevAction(value);
      if (loadTableInstance) loadTableInstance(instance);
      if (callBackToSetCheckConfig)
        callBackToSetCheckConfig(setCheckConfiguration);
      // if (sizeColumnsToFitFlag) {
      //   params.api.sizeColumnsToFit();
      // }
      //  if (rowModelType) params.api.setServerSideDatasource(datasource);
      if (rowModelType === "serverSide")
        params.api.setServerSideDatasource(datasource);
      if (rowModelType === "infinite")
        params.api.setDatasource(createDatasource(params));

      // adding event listner to auto size columns to fit the table on sidebar action
      params.api.forEachNode((node) => {
        if (node?.data?.is_selected) {
          node.setSelected(true);
        } else {
          node.setSelected(false);
        }
      });
      instance.api.addEventListener("columnMoved", (event) => {
        const updatedGridColumnDef = params.api.getColumnDefs();
        params.api.setColumnDefs(updatedGridColumnDef);
      });

      // Listen for the columnPinned event
      instance.api.addEventListener("columnPinned", function (event) {
        if (event.source !== "api") {
          const pinType = event.pinned === "left" ? "left" : null;
          freezeColumn(
            event.api,
            event.columnApi,
            event.column || event.columns[0],
            pinType,
            displaySnackMessages
          );
        }
      });
    },
    // To make AG-Grid have fluid layout
    // The following will run when the grid first loads/ or data adjusts and when the grids size changes.
    onFirstDataRendered: (params) => {
      if (sizeColumnsToFitFlag) {
        params.api.sizeColumnsToFit();
      }
      setGridColumnWidth(params, false, sizeColumnsToFitFlag);
      if (props.onFirstDataRender) {
        props.onFirstDataRender(params);
      }
    },
    rowMultiSelectWithClick: true,
    // setting unique id on tables for performing selection on server/client side
    getRowId: (params) => {
      let data = params.data;
      return params.level === 0 && uniqueRowId ? data[uniqueRowId] : null;
    },
    suppressClickEdit: suppressClickEdit,
    // Please enable the below code when custom logic is required
    // Note -> allowCustomStyling can overwrite styling for a default table for a custom field
    // For Example if aggrid has a column of store id coloured 'black' as default , allowCustomStyling can update the same column with some different colour
    // but if any component uses a styling which does not clash with the default styling ,allowCustomStyling is not required to pass from that component
    // getRowStyle: allowCustomStyling
    //   ? getRowStyle
    //   : (params) => {
    //       const style = {};
    //       if (dummyrule1(params)) {
    //         style.backgroundColor = "lightgreen";
    //       }
    //       return style;
    //     },
    getRowStyle: getRowStyle,
    onRowDragMove: () => props?.onRowDragMove,
    groupHeaderHeight: groupHeaderHeight,
    onColumnResized: checkViewPortOnColumnResized,
  };
  var gridDiv = document.querySelector("#myGrid");

  // gridDiv?.addEventListener("keydown", function (event) {
  //   let gridApi = tableRef.current;
  //   if (event.key === "Tab") {
  //     event.preventDefault(); // Prevent the default behavior (e.g., form submission)
  //     console.log(gridApi?.api, "gridApi?.api");
  //     // Get the currently focused cell
  //     var focusedCell = gridApi?.api?.getFocusedCell();
  //     // if (focusedCell) {
  //     console.log("here", event, focusedCell);
  //     // Find the next editable cell and set focus to it
  //     var nextEditableCell = findNextEditableCell(
  //       focusedCell.rowIndex,
  //       focusedCell?.column,
  //       gridApi
  //     );

  //     if (nextEditableCell) {
  //       gridApi?.api.setFocusedCell(
  //         nextEditableCell.rowIndex,
  //         nextEditableCell.column
  //       );
  //     }
  //   }
  // });
  let adjustableDiv = document.getElementsByClassName("ag-center-cols-clipper");
  //Set min-height of table dynamically if there are 1 or 2 rows present in table
  if (props.adjustTableHeight && props.rowdata?.length) {
    let adjustableDiv = document.getElementsByClassName(
      "ag-center-cols-clipper"
    );
    if (adjustableDiv?.length) {
      for (let index = 0; index < adjustableDiv.length; index++) {
        adjustableDiv[index].style.minHeight = "unset";
      }
    }
  }
  if (applyBudgetTableFormatting) {
    gridOptions.applyBudgetTableFormatting = applyBudgetTableFormatting;
  }
  if (applyFormatOnfocus) {
    gridOptions.applyFormatOnfocus = applyFormatOnfocus;
  }

  if (metrics_with_formatter) {
    gridOptions.metrics_with_formatter = metrics_with_formatter;
  }
  if (rowSelection) {
    gridOptions.rowSelection = rowSelection;
  }
  if (rowMultiSelectWithClick !== undefined) {
    gridOptions.rowMultiSelectWithClick = rowMultiSelectWithClick;
  }
  // returns an array of all selections in the table
  if (onSelectionChanged) {
    gridOptions.onSelectionChanged = onSelectionChanged;
  }
  if (isEditDisabled) {
    gridOptions.isEditDisabled = isEditDisabled;
  }
  if (isDeleteDisabled) {
    gridOptions.isDeleteDisabled = isDeleteDisabled;
  }
  // returns one row data at a time
  if (onRowSelected) {
    gridOptions.onRowSelected = (p_instance) => {
      const { node } = p_instance;
      if (node.selected) {
        selectedRowIds.current.set(node.data[uniqueRowId], node.data);
      } else {
        selectedRowIds.current.delete(node.data[uniqueRowId], node.data);
      }
      checkRowHandler({
        p_instance,
        props,
        setPrevAction,
        setCheckConfiguration,
        setIsSelectAllRecords,
      });
    };
  }
  if (onEditClick) {
    gridOptions.onEditClick = onEditClick;
  }
  if (callDeleteApi) {
    gridOptions.callDeleteApi = callDeleteApi;
  }
  if (onChartClick) {
    gridOptions.onChartClick = onChartClick;
  }
  if (onReviewClick) {
    gridOptions.onReviewClick = onReviewClick;
  }
  if (onImageClick) {
    gridOptions.onImageClick = onImageClick;
  }
  if (customAggFunction) {
    gridOptions.customAggFunction = customAggFunction;
  }
  if (onColumnVisible) {
    gridOptions.onColumnVisible = onColumnVisible;
  }
  if (onRangeSliderChange) {
    gridOptions.onRangeSliderChange = onRangeSliderChange;
  }
  if (showColumnPanel) {
    gridOptions.sideBar = {
      toolPanels: [
        {
          id: "columns",
          labelDefault: "Columns",
          labelKey: "columns",
          iconKey: "columns",
          toolPanel: "agColumnsToolPanel",
          toolPanelParams: {
            suppressRowGroups: true,
            suppressValues: true,
            suppressPivots: true,
            suppressPivotMode: true,
            suppressColumnFilter: false,
            suppressColumnSelectAll: false,
            suppressColumnExpandAll: false,
          },
          width: 250,
          minWidth: 250,
        },
      ].concat(customSideBar),
      defaultToolPanel: "",
    };

    // Show Table Action Tabs on Sidebar if showSaveTableConfig or showSearchModalBtn any is true.
    if (showSaveTableConfig || showSearchModalBtn) {
      gridOptions.sideBar.toolPanels = [
        ...gridOptions.sideBar.toolPanels,
        {
          id: "table-actions",
          labelDefault: "Table Actions",
          labelKey: "tableActions",
          toolPanel: TableActions,
          toolPanelParams: {
            showSaveTableConfig: showSaveTableConfig,
            showSearchModalBtn: showSearchModalBtn,
            disablesaveConfig: disablesaveConfig,
            setIsFilterChanged: setIsFilterChanged   // NOTE: To check If the filter is changed as it is required to recalculate Total row inside table
          },
          minWidth: 225,
          maxWidth: 225,
          width: 225,
        },
        {
          id: "format-columns",
          labelDefault: "Format",
          labelKey: "formatColumns",
          toolPanel: FormatColumns,
          toolPanelParams: {
            showSearchModalBtn: showSearchModalBtn,
            setTableFontSize: setTableFontSize,
            setNumericFormat: setNumericFormat,
          },
          minWidth: 225,
          maxWidth: 225,
          width: 225,
        },
      ];

      showSearchModalBtn &&
        gridColumns.forEach((column) => {
          if (column.is_searchable) {
            column.floatingFilter = false;
          }
          if (column.sub_headers?.length) {
            defineSearchableParams(column.sub_headers, column.label);
          }
        });
    }
  }
  if (onApplyCalendarDates) {
    gridOptions.onApplyCalendarDates = onApplyCalendarDates;
  }
  if (suppressAggFuncInHeader) {
    gridOptions.suppressAggFuncInHeader = suppressAggFuncInHeader; // to not modify column header based on AggFunc applied
  }

  if (btnVariant) {
    gridOptions.btnVariant = btnVariant;
  }

  if (lockCellApi) {
    gridOptions.lockCellApi = lockCellApi;
  }

  if (budgetTableChangeFunc) {
    gridOptions.budgetTableChangeFunc = budgetTableChangeFunc;
  }

  if (lockCellCustomConditionFn) {
    gridOptions.lockCellCustomConditionFn = lockCellCustomConditionFn;
  }

  if (lockCellIfNoValue) {
    gridOptions.lockCellIfNoValue = lockCellIfNoValue;
  }
  if (customCellRenderer) {
    gridOptions.customCellRenderer = customCellRenderer;
  }
  if (noEditableCustomCellRender) {
    gridOptions.noEditableCustomCellRender = noEditableCustomCellRender;
  }

  if (customizeRowGroupingIcon) {
    // pass strings - text or html elements (font awesome icons or provide src of an img)
    //  eg - '<i class="fa fa-plus" aria-hidden="true"></i>'
    //  or '<img src="https://cdn.rawgit.com/ag-grid/ag-grid-docs/56853d5aa6513433f77ac3f808a4681fdd21ea1d/src/javascript-grid-icons/minus.png" style="width: 12px;padding-right: 2px"/>'
    gridOptions.icons = {
      groupExpanded: groupExpandedIcon,
      groupContracted: groupContractedIcon,
    };
  }
  if (manualCallBack || hideRangeFilter) {
    if (manualCallBack) {
      gridOptions.manualCallBack = manualCallBack;
    }

    // Hide the filter and range icon
    if (hideRangeFilter) {
      gridColumns.forEach((column) => {
        if (!column.is_searchable) {
          column.filter = false;
          column.floatingFilter = false;
        }
        column.floatingFilterComponentParams = { suppressFilterButton: true };
      });
    }
  }
  if (rowModelType) {
    gridOptions.rowModelType = rowModelType;
    gridOptions.cacheOverflowSize = cacheOverflowSize;

    // to be enabled based on need, in next version
    // gridOptions.maxConcurrentDatasourceRequests = -1;
    // gridOptions.infiniteInitialRowCount = 20;
    // gridOptions.cacheBlockSize = 10;
    // gridOptions.rowBuffer = 3;

    if (serverSideStoreType) {
      gridOptions.serverSideStoreType = serverSideStoreType;
    }
    if (cacheBlockSize) {
      gridOptions.cacheBlockSize = cacheBlockSize;
    }
  }
  if (onBlur) {
    gridOptions.onBlur = onBlur;
  }
  if (onPaginationChanged) {
    gridOptions.onPaginationChanged = onPaginationChanged;
  }
  if (onToggleChange) {
    gridOptions.onToggleChange = onToggleChange;
  }
  if (onCheckBoxChange) {
    gridOptions.onCheckBoxChange = onCheckBoxChange;
  }
  if (autoGroupColumnDef) {
    gridOptions.autoGroupColumnDef = autoGroupColumnDef;
  }
  if (isExternalFilterPresent) {
    gridOptions.isExternalFilterPresent = isExternalFilterPresent;
  }
  if (doesExternalFilterPass) {
    gridOptions.doesExternalFilterPass = doesExternalFilterPass;
  }
  if (onDownloadClick) {
    gridOptions.onDownloadClick = onDownloadClick;
  }
  //hide count of grouped child number at parent level.
  if (groupRowRendererParams)
    gridOptions.groupRowRendererParams = groupRowRendererParams;

  if (enableCustomRowHeight) {
    gridOptions.enableCustomRowHeight = enableCustomRowHeight;
  }

  // To show pre selected rows on the Client side paginated table based on selected row id's
  if (selectedRows) {
    if (isEmpty(selectedRows)) {
      agGrid.api?.forEachNode((node) => {
        node.setSelected(false);
      });
    } else {
      agGrid.api?.forEachNode((node) => {
        if (
          !node.group &&
          node.data &&
          selectedRows.some((obj) => obj === node.data[uniqueRowId])
        ) {
          node.setSelected(true);
        } else if (node.group) {
          setTimeout(() => {
            let isPresent = selectedRows.indexOf(node.key);
            if (isPresent > -1) {
              node.setSelected(true);
            }
          }, 0);
        } else {
          node.setSelected(false);
        }
      });
    }
  }
  // to enable rows to opened by default
  if (isGroupOpenByDefault) {
    gridOptions.isGroupOpenByDefault = isGroupOpenByDefault;
  }
  if (callBackOnChangeCustomFunction) {
    gridOptions.callBackOnChangeCustomFunction = callBackOnChangeCustomFunction;
  }

  // uncheckRows is an object with 2 keys - uncheckableRows & callBackFunction
  // uncheckableRows - rows needs to be unchecked - mandatory - type -> array
  // callBackFunction - clean up function - optional - type -> function
  if (!isEmpty(uncheckRows) && Array.isArray(uncheckRows?.uncheckableRows)) {
    agGrid.api?.forEachNode((node) => {
      if (uncheckRows.uncheckableRows?.includes(node.data[uniqueRowId])) {
        node.setSelected(false);
      }
    });
    typeof uncheckRows?.callBackFunction === "function" &&
      uncheckRows?.callBackFunction({});
  }

  if (customTabFunction) {
    gridOptions.customTabFunction = customTabFunction;
  }
  const setGridColumnWidth = (params, skipAutoSize, autoSizeOnlyCustom) => {
    // when side bar is opened we dont have to perform re-sizing
    if (params?.type === "gridReady") {
      return;
    }

    let clientWidth = getGridWidth(params);
    let allColumnsWidth = getAllColumnsWidth(params);

    // auto size the columns to take max width according to content and header
    // if custom width is provided in extra key use this width
    if (allColumnsWidth > clientWidth - 30) {
      !skipAutoSize &&
        autoSizeGridColumns(params, skipHeaderOnAutoSize, autoSizeOnlyCustom);
      clientWidth = getGridWidth(params);
      allColumnsWidth = getAllColumnsWidth(params);
    }

    // if all columns dont fit the available grid width, size them to fit
    if (allColumnsWidth < clientWidth) {
      params.api.sizeColumnsToFit();
    }
  };

  const onSetAllApply = async (newData) => {
    const setAllResp = await props.onSetAllApply(newData, agGrid);
    return setAllResp;
  };

  const hideHiddenCols = (cols) => {
    //hideItemRowGroup is the key to hide the column  if rowgroup is true also
    let columns = cols.map((item) => {
      if (!item?.rowGroup|| item?.extra?.hideItemRowGroup) {
        item.hide = item.is_hidden;
      }
      if (item.children?.length) {
        item.children = hideHiddenCols(item.children);
      }
      return item;
    });
    return columns;
  };

  useEffect(() => {
    if (!isEmpty(props.columns)) {
      // removing hidden columns from parent and sub headers
      // to confirm if this is needed

      // let cols = props.columns.filter((item) => {
      //   if (item?.sub_headers.length) {
      //     item?.sub_headers.filter((data) => !data.is_hidden);
      //   } else return !item.is_hidden;
      // });
      const copyColumns = cloneDeep(props.columns);
      //remove the advanced search config if present
      const savedSearchConfigIdx = copyColumns.findIndex(
        (col) => col.column_name === "advanced_search"
      );
      if (savedSearchConfigIdx > -1) {
        //find sidebar toolPanel index for tableActions search
        const gridSideBarIdx = gridOptions.sideBar.toolPanels.findIndex(
          (sidebar) => sidebar.id === "table-actions"
        );
        if (
          gridSideBarIdx > -1 &&
          gridOptions?.sideBar?.toolPanels?.[gridSideBarIdx]?.toolPanelParams
        ) {
          gridOptions.sideBar.toolPanels[gridSideBarIdx].toolPanelParams = {
            ...gridOptions.sideBar.toolPanels[gridSideBarIdx].toolPanelParams,
            advancedSearchConfig: cloneDeep(copyColumns[savedSearchConfigIdx]),
          };
          dispatch(
            setTableSearchConfig(cloneDeep(copyColumns[savedSearchConfigIdx]))
          );
        }
        copyColumns.splice(savedSearchConfigIdx, 1);
      }
      // hiding hidden columns using ag grid columns attribute hide: boolean
      let cols = hideHiddenCols(copyColumns);

      // To render a column with checkboxes at left most side of the table and
      // configure using an icon
      if (selectAllHeaderComponent) {
        let checkboxColumn = [
          {
            field: "Selection",
            checkboxSelection: (params) => {
              return params.node?.data?._hideSelection ||
                (params.node.level > 0 && props.hideChildSelection) ||
                params.node?.data?.checkbox_disabled //removing the checkbox from the selected rows for which we want to disabled in the table
                ? false
                : true;
            },
            headerComponent: hideHeaderCheckboxComponent
              ? NoCheckBox
              : SelectAllComponent,
            headerCheckboxSelectionFilteredOnly: false,
            pinned: "left",
            suppressSizeToFit: true, // to not include column for auto resize
            lockPosition: "left",
            width: 60,
            maxWidth: 60,
            cellStyle: { display: "flex", justifyContent: "center" },
            headerComponentParams: {
              checkAllCallback: (p_instance, p_checkAll) => {
                return checkAllHandler({
                  p_instance,
                  p_checkAll,
                  setPrevAction,
                  setCheckConfiguration,
                  setIsSelectAllRecords,
                });
              },
              refreshState: (params) => {
                selectAllRecordsState.current = params;
              },
              hideSelectCurrentPageRecords: hideSelectCurrentPageRecords, // to hide the drop down option select current page records
              hideSelectAllRecords: hideSelectAllRecords, // to hide the drop down option select all records
            },
          },
        ];
        cols = [...checkboxColumn, ...cols];
      }
      if (props.selectEachRow) {
        // displaying checkboxes on each row
        cols[0].checkboxSelection = true;
      }
      if (props.showDisabledCheckboxes) {
        cols[0].showDisabledCheckboxes = true;
      }

      if (props.enableRowSpan) {
        cols = cols.map((value) => {
          if (props.rowSpanColumn.includes(value.column_name)) {
            value.rowSpan = (params) =>
              prepareRowSpan(params, value.column_name);
            value.cellClassRules = {
              "show-cell": "colDef !== undefined",
              "show-cell": (params) => params.colDef.rowSpan(params) > 1,
            };
            value.cellStyle = {
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            };
          }

          return value;
        });
      }

      setGridColumns(cols);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.columns, selectAllHeaderComponent]);

  useEffect(() => {
    const copyColumns = cloneDeep(agGrid?.api?.getColumnDefs());
    if (!isEmpty(copyColumns)) {
      let cols = hideHiddenCols(copyColumns);
      if (tableFontSize) {
        cols = cols.map((value) => {
          // This condition is added so that the styles of a particular col whose cellStyle is passed as a function does not get overwritten
          if (typeof value.cellStyle !== "function") {
            value.cellStyle = {
              ...value.cellStyle,
              fontSize: updateFontSizeOnToolPanel(tableFontSize),
            };
          }
          return value;
        });
      }
      if (numericFormat) {
        cols = cols.map((value) => {
          if (value.field !== "Selection") {
            if (
              !nonFormattingCoulumnHeaders.includes(value.column_name) &&
              numberFormattingDataTypes.includes(value.type)
            ) {
              // number formatting wont happen on grouped and editable cell
              if (
                value.cellRenderer !== "agGroupCellRenderer" &&
                !value.is_editable
              ) {
                value.cellRenderer = (params, props) =>
                  formatNumber(
                    params.data?.[value?.column_name] || "0",
                    numericFormat,
                    params,
                    value
                  );
              }
            }
          }
          return value;
        });
      }
      setGridColumns(cols);
    }
  }, [tableFontSize, numericFormat]);

  /**
   * @function
   * @description Update fonstyles of evey column on change of font from toolbar
   * @param {Object} columns
   * @returns {Object} columns
   */
  const UpdateFontStyles = (columns) => {
    return columns.map((value) => {
      if (value.field !== "Selection") {
        // This condition is added so that the styles of a particular col whose cellStyle is passed as a function does not get overwritten
        if (value.sub_headers?.length) {
          value.sub_headers = UpdateFontStyles(value.sub_headers);
        } else if (typeof value.cellStyle !== "function") {
          value.cellStyle = {
            ...value.cellStyle,
            fontSize: updateFontSizeOnToolPanel(tableFontSize),
          };
        }
      }
      return value;
    });
  };

  // if (gridColumns && !allowCustomStyling) {
  //   gridColumns.forEach((column) => {
  //     if (dummyColoumnRule1(column)) {
  //       column.cellStyle = { backgroundColor: "grey", color: "black" };
  //     }
  //   });
  // }
  // calculate the row span count required for the column
  const prepareRowSpan = (params, columnName) => {
    if (isRowProcessed(params, columnName)) {
      return 1;
    }

    // row span is calculated if row has not been processed
    return rowSpanCount(params, columnName);
  };

  const isRowProcessed = (params, columnName) => {
    const currentRowValue = props.getRowData(params, columnName);
    const previousNode = params.api.getDisplayedRowAtIndex(
      params.node.rowIndex - 1
    );
    // if its the first row, its marked as not processed
    if (params.node.rowIndex === params.api.rowRenderer.firstRenderedRow) {
      return false;
    }
    const previousRowValue = props.getRowData(previousNode, columnName);
    // if the row value is same as previous value that means its already been processed
    return previousNode && previousRowValue === currentRowValue;
  };

  // count how many successive rows/nodes contain the same value
  const rowSpanCount = (params, columnName) => {
    let nextNode = params.api.getDisplayedRowAtIndex(params.node.rowIndex + 1);
    // if two adjacent nodes are not equal row span is 1
    if (
      !areNodesEq(params.node, nextNode, columnName) ||
      params.node.rowIndex === params.api.rowRenderer.lastRenderedRow
    ) {
      return 1;
    } else {
      // if two adjacent nodes are equal keep counting
      return (
        1 +
        rowSpanCount(
          {
            ...params,
            node: nextNode,
            data: nextNode.data,
          },
          columnName
        )
      );
    }
  };

  // check if the two nodes have same value for specific column
  const areNodesEq = (node1, node2, columnName) => {
    const node1Value = props.getRowData(node1, columnName);
    const node2Value = props.getRowData(node2, columnName);

    return node2 && node1Value === node2Value;
  };

  const getEditableNothiddenCols = (columns) => {
    let ediatbleCols = [];
    columns.forEach((data) => {
      if (data.sub_headers?.length > 0) {
        ediatbleCols.push(...getEditableNothiddenCols(data.sub_headers));
      } else if (!data.is_hidden && data.is_editable) {
        ediatbleCols.push(data);
      }
    });
    return ediatbleCols;
  };

  const getSetAllFields = () => [...getEditableNothiddenCols(props.columns)];
  const getContextMenuItems = (params) => {
    let defaultOptions = ["copy", "copyWithHeaders", "copyWithGroupHeaders"];
    return optionsForContextMenu
      ? [...defaultOptions, ...optionsForContextMenu]
      : defaultOptions;
  };
  const newNameOfFile = (params) => {
    let l_newName = "";
    let formattedDate = "";

    let new_params = params.split("|");

    let table_name = new_params[0];
    let dateFormat = new_params[1];

    const date = new Date();
    let year = date.getFullYear();
    let month = date.getMonth() + 1; // Month is zero-based, so adding 1
    let day = date.getDate();
    let timeStamp = Math.floor(date.getTime() / 1000);

    // Adding leading zeros if necessary
    if (month < 10) {
      month = "0" + month;
    }
    if (day < 10) {
      day = "0" + day;
    }

    switch (dateFormat) {
      case "MDY":
        formattedDate = month + "" + day + "" + year;
        break;
    }

    l_newName = table_name + "_" + formattedDate + "_" + timeStamp;
    return l_newName;
  };

  const exportToExcel = (params) => {
    // The issue arises when dropdowns, such as list or dynamic list selections, are present within the table. In the downloaded Excel file, the displayed content becomes "[Object Object]" due to the object data type of items like {"label":"India", "value":"+91"}.
    // To address this, a solution has been implemented by introducing a callback upon clicking the download button. This functionality can be activated by providing the processCellCallbackForExcel prop to the agGrid component. This callback function ensures that dropdown lists are displayed as strings in the Excel file. For single-select dropdowns, it uses the label value, while for multi-select dropdowns, it separates values using pipes (|) as delimiters.
    // For instance:
    // Input: [{label:"India", value:"+91"}, {label:"United States", value: "+1"}]
    // Output: "India | United States" in the Excel file.
    let filterModel;

    if (ignoreTableFiltersOnDownload) {
      // Save the current filters applied to the table
      filterModel = agGrid?.api.getFilterModel();

      // Reset the table filters. Reapply after download
      agGrid?.api.setFilterModel();
    }

    if (processCellCallbackForExcel) {
      agGrid?.api?.exportDataAsExcel({
        columnKeys: agGrid?.columnApi
          ?.getAllGridColumns()
          .filter((item) => item.colId !== "Selection"),
        processCellCallback(params) {
          let l_cellValue = cloneDeep(params.value);
          if (l_cellValue instanceof moment) {
            return moment(l_cellValue).format("YYYY-MM-DD");
          } else if (Array.isArray(l_cellValue)) {
            return isNonPrimitiveArray(l_cellValue)
              ? l_cellValue.map((val) => val.label)?.join(" | ")
              : l_cellValue;
          } else if (isObject(l_cellValue)) {
            return l_cellValue.label;
          }
          return l_cellValue;
        },
      });
    } else {
      // Removing the checkbox column from list
      // To do - add condition to ignore action columns on download

      if (
        props?.inventorysmartScreenConfig?.downloadTableIdentifier?.hasOwnProperty(
          props?.tableIdentifier
        )
      ) {
        params["fileName"] = newNameOfFile(
          props?.inventorysmartScreenConfig?.downloadTableIdentifier?.[
            props.tableIdentifier
          ]
        );
      }
      params.columnKeys = agGrid?.columnApi
        ?.getAllGridColumns()
        .filter((item) => item.colId !== "Selection");
      if (toPrependContent && prependedContentDetails?.length) {
        params.prependContent = prependedContentDetails;
      }
      if (toAppendContent && appendContentDetails?.length) {
        params.appendContent = appendContentDetails;
      }
      const { tenantDateFormat } = getTenantTimeZoneDetails();
      agGrid?.api?.exportDataAsExcel({
        ...params,
        processCellCallback(params) {
          let l_cellValue = cloneDeep(params.value);
          const column = params.column.getColDef();
          if (column.type === 'datetime' ||column.type === 'date') {
              const formattedDate = !isEmpty(l_cellValue) ? moment(l_cellValue).format(tenantDateFormat||"MM-DD-YYYY") : '';
              return formattedDate
            } 
            return l_cellValue;
          }
      });
      //agGrid?.api?.exportDataAsExcel(params);
    }

    if(ignoreTableFiltersOnDownload) {
      // Set the user applied filters back
      agGrid?.api.setFilterModel(filterModel);
    }
  };

  useEffect(() => {
    if (props.showSetAllPopup) {
      setShowSetAll(props.showSetAllPopup);
    }
  }, [props.showSetAllPopup]);

  const setAllValidation = () => {
    if (props.setAllValidateRequired) {
      props.setAllValidate();
    } else {
      setShowSetAll(true);
    }
  };

  const handleSetAllModalClose = () => {
    if (props.setAllValidateRequired && props.setShowSetAllPopup) {
      props.setShowSetAllPopup(false);
    }
    setShowSetAll(false);
  };

  /**
   * @desc Check for filtered rows and show overlay if data not present and also show visual que to users if searched
   * @param {Object} instance
   */
  const getFilteredRows = (instance) => {
    if (!isEmpty(instance.api.getFilterModel())) {
      instance.api?.sideBarComp?.sideBarButtonsComp?.buttonComps?.forEach(
        (button) => {
          if (button.toolPanelDef.id === "table-actions") {
            button.eGui?.classList.add("tp-active");
          }
        }
      );
    } else {
      instance.api?.sideBarComp?.sideBarButtonsComp?.buttonComps?.forEach(
        (button) => {
          if (button.toolPanelDef.id === "table-actions") {
            button.eGui?.classList.remove("tp-active");
          }
        }
      );
    }
    if (!instance?.api?.rowModel?.datasource) {
      if (!instance?.api?.rowModel?.rowsToDisplay?.length) {
        instance.api.showNoRowsOverlay();
      } else {
        instance.api.hideOverlay();
      }
    }

    // logic to get back search column box in focus
    const columnLabel = `${instance.columns[0].colDef.label} ${"Filter Input"}`;
    const elementLabelId = `[aria-label='${columnLabel}']`;
    hasSearchElement.current = elementLabelId;
    instance?.api.refreshHeader();
  };

  const getMainMenuItems = useCallback((params) => {
    const { colDef, actualWidth, pinned, sort } = params.column;
    const columnMenuItems = [];

    // grid column menu title
    columnMenuItems.push(
      {
        name: "Column Settings",
      },
      "separator"
    );

    // ability to sort column
    columnMenuItems.push({
      name: "Sort",
      subMenu: [
        {
          name: colDef.type=== "link" && colDef?.extra?.data_type ? ascendingOrderLabel[colDef?.extra?.data_type] : ascendingOrderLabel[colDef.type], // giving data type in extra key when the type is link so according to that data type we can give the sort options i.e asc,desc,a-z,z-a 
          action: () => sortFunc(params.column, "asc", params.api),
          checked: sort === "asc",
        },
        {
          name: colDef.type=== "link" && colDef?.extra?.data_type ? descendingOrderLabel[colDef?.extra?.data_type] : descendingOrderLabel[colDef.type], // giving data type in extra key when the type is link so according to that data type we can give the sort options i.e asc,desc,a-z,z-a 
          action: () => sortFunc(params.column, "desc", params.api),
          checked: sort === "desc",
        },
        {
          name: "Reset",
          action: () => sortFunc(params.column, null, params.api),
        },
      ],
      disabled: !colDef.is_sortable,
    });

    // ability to pin/unpin columns based on current state
    columnMenuItems.push({
      name: pinned ? "Unfreeze Column" : "Freeze Column",
      action: () => {
        onColMenuFreezeClick(params, displaySnackMessages);
      },
    });

    // ability to pin/unpin columns based on current state
    columnMenuItems.push({
      name: "Autosize All Columns",
      action: () => {
        autoSizeManualClick.current = true;
        setGridColumnWidth(params, false, false);
      },
    });

    // ability to adjust column width to custom or auto
    columnMenuItems.push({
      name: "Column width",
      subMenu: [
        {
          name: "Auto Adjust",
          action: () => {
            onColMenuAutoAdjustClick(params);
          },
          // if extra.width property is not present- column is auto adjusted
          checked: !colDef?.extra?.width,
        },
        {
          name: "Custom width",
          action: () => {
            // add extra.width property for custom width
            params.column.colDef.extra.width = actualWidth;
          },
          // if extra.width property is present- column has custom width
          checked: colDef?.extra?.width,
        },
      ],
    });

    // text wrap action
    columnMenuItems.push({
      name: "Wrap Text",
      disabled: true,
    });

    return columnMenuItems;
  }, []);

  const components = useMemo(() => {
    if(showPaginationPageSize){
      return {
        PaginationComponent
      };
    }else{
      return {
        agColumnHeader: CustomHeader,
      };
    }
  }, []);

  return (
    <div style={props.tableStyle}>
      <div colSpan={gridColumns.length}>
        {props.showSetAll && (
          <div className={classes.setAllButton}>
            <Button
              id="setAll"
              variant="contained"
              color="primary"
              onClick={() => {
                setAllValidation();
              }}
            >
              Set All
            </Button>
          </div>
        )}
        {!! props.rowdata?.length && downloadAsExcel && (
          <div className={classes.alignRight}>
            {downloadStyle ? (
              <Button
                variant="contained"
                onClick={exportToExcel}
                startIcon={<DownloadIcon />}
                disabled={disableExcelDownload}
                className={classes.button}
              >
                Download
              </Button>
              ) :(
              <Button
                id="setAll"
                className={`${globalClasses.buttonNew}`}
                onClick={exportToExcel}
                disabled={disableExcelDownload}
              >
              <DownloadOutlined 
                className={`${globalClasses.iconNew}`}/>
            </Button>)}
          </div>
        )}
      </div>
      {showSetAll && (
        <SetAll
          rowdata={props.rowdata}
          setAllInterdependentFields={props.setAllInterdependentFields}
          primaryKey={props.primaryKey}
          selectedRowIds={agGrid.api.getSelectedNodes()}
          onApply={onSetAllApply}
          fields={customSetAllFields ? customSetAllFields : getSetAllFields()}
          handleModalClose={handleSetAllModalClose}
          layout={props.setAlllayout}
          maxFieldsInRow={props.setAllMaxFieldsInRow}
          handleValidation={handleValidation}
          setAllButtonLabel={props?.setAllButtonLabel}
          setDefaultDateFieldValues={props?.setDefaultDateFieldValues}
        />
      )}
      <div
        id={tableId ? tableId : "myGrid"}
        className={classNames("ag-theme-alpine", customClass)}
      >
        <AgGridReact
          // cacheBlockSize={100}
          // cacheOverflowSize={2}
          ref={tableRef}
          suppressRowVirtualisation={props?.suppressRowVirtualisation}
          suppressColumnVirtualisation={props?.suppressColumnVirtualisation}
          updateData={updateData}
          treeData={props.treeData}
          isServerSideGroup={isServerSideGroup}
          columnDefs={gridColumns}
          rowData={props.rowModelType ? null : clientSideTableData}
          pinnedTopRowData={props.pinnedTopRowData}
          pinnedBottomRowData={props.pinnedBottomRowData}
          gridOptions={gridOptions}
          noRowsOverlayComponent={noRowsOverlayComponent}
          noRowsOverlayComponentParams={noRowsOverlayComponentParams}
          rowSelection={rowSelection || "multiple"}
          suppressRowClickSelection={true} // allows to click on cells w/o setting row selection to true
          suppressDragLeaveHidesColumns={true} //reorder columns
          animateRows={true} // Optional - set to 'true' to have rows animate when sorted
          stopEditingWhenCellsLoseFocus={true} //loose focus on edit cell when clicked outside the table
          onCellValueChanged={props.onCellValueChanged}
          onCellFocused={props.onCellFocused}
          pagination={pagination}
          getServerSideStoreParams={props.getServerSideStoreParams}
          paginationPageSize={
            props.paginationPageSize ? props.paginationPageSize : 10
          } // num of rows per page
          // icon action buttons
          onEditClick={() => props.onEditClick(props)} //to edit
          callDeleteApi={() => props.callDeleteApi(props)} // to delete
          onChartClick={() => props.onChartClick(props)} // on click chart icon
          onReviewClick={() => props.onReviewClick(props)} // on click review button
          groupDisplayType={props.groupDisplayType} // pass custom if you don't want autogroup column
          groupSelectsChildren={groupSelectsChildren} // if a group is selected, children of the group are also selected - true/false
          groupIncludeTotalFooter={groupIncludeTotalFooter} // grand total footer - true/false
          domLayout={domLayout} //auto sizing grids based on number of rows
          manualCallBack={() => manualCallBack()} // backend sort, search, pagination
          enableCellChangeFlash={props.enableCellChangeFlash} // cells that are refreshed will be flashed - true/false
          autoGroupColumnDef={
            autoGroupColumnDef
              ? autoGroupColumnDef
              : {
                  headerName: "Group",
                }
          }
          getGroupRowAgg={getGroupRowAgg}
          groupHideOpenParents={groupHideOpenParents}
          rowClassRules={rowClassRules}
          getDataPath={props.getDataPath}
          alignedGrids={alignedGrids}
          headerHeight={headerHeight}
          masterDetail={masterDetail}
          isRowMaster={isRowMaster}
          getContextMenuItems={getContextMenuItems}
          keepDetailRows={keepDetailRows}
          detailCellRenderer={detailCellRenderer}
          detailRowHeight={detailRowHeight}
          purgeClosedRowNodes={purgeClosedRowNodes}
          suppressContextMenu={false} // to disable right click action which displays a menu to copy and export
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          sideBar={props.sideBar}
          suppressFieldDotNotation={suppressFieldDotNotation} //Allows you to use dots in your field name if you prefer
          isRowSelectable={isRowSelectable}
          detailRowAutoHeight={detailRowAutoHeight}
          rowGroupPanelShow={rowGroupPanelShow}
          groupDefaultExpanded={groupDefaultExpanded}
          onFilterChanged={getFilteredRows}
          enableRangeSelection={enableRangeSelection}
          processDataFromClipboard={processDataFromClipboard}
          processCellForClipboard={processCellForClipboard}
          processHeaderForClipboard={processHeaderForClipboard}
          suppressRowTransform={props.enableRowSpan}
          isServerSideGroupOpenByDefault={isServerSideGroupOpenByDefault}
          getMainMenuItems={getMainMenuItems}
          onDragStopped={onColumnWidthDrag}
          tooltipShowDelay={500}
          rowHeight={props?.rowHeight}
          enableCustomRowHeight={enableCustomRowHeight}
          components={showSearchModalBtn || showPaginationPageSize ? components : {}}
          valueCache={valueCache}
          customTabFunction={customTabFunction}
          statusBar={showPaginationPageSize ? statusBar : {}}
          suppressColumnMoveAnimation={suppressColumnMoveAnimation}
        />
      </div>
    </div>
  );
};
AgGridComponent.propTypes = {
  isLoading: PropTypes.bool,
  width: PropTypes.any,
  height: PropTypes.any,
};
AgGridComponent.defaultProps = {
  isLoading: false,
  width: "100%",
  height: "350px",
};

/*
  Various RowGroupingDisplayTypes are -
   'singleColumn'
    | 'multipleColumns' 
    | 'groupRows' 
    | 'custom'
*/

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setLastSearchType: (payload) => dispatch(setLastSearchType(payload)),
  };
};
const mapStateToProps = (store) => {
  return {
    userAccessList:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    tenantTableUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .table_uam,
    filterReducer: store.filterReducer,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(AgGridComponent);
