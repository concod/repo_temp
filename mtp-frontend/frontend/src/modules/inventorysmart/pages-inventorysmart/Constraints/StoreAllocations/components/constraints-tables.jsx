import {
  Button,
  FormControlLabel,
  Grid,
  Radio,
  RadioGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import React, { useEffect, useRef, useState } from "react";
import { useConstraintsStyles } from "./constraints-style";
import {
  checkValidation,
  checkValidationforTimeConstraint,
  checkValidationforTimeConstraintDate,
  setTimeConstraintPostRequestBody,
  setTimeConstraintSavePayload,
} from "./config";
import Table from "./view-table";
import StoreModalTable from "./store-table";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { cloneDeep, isEmpty, min } from "lodash";
import { Button as IAButton, Prompt } from "impact-ui";
import AddIcon from "@mui/icons-material/Add";
import Delete from "@mui/icons-material/Delete";
import {
  getStoreTableData,
  getStoreGradeTableData,
  saveStoreTableData,
  setConstraintsLoader,
  getStoreGroupTableData,
  setAllTableData,
  getStoreGradeAggregateData,
  getStoreGroupAggregateData,
  downloadStoreConstraintsData,
  downloadStoreGradeConstraintsData,
  downloadStoreGroupConstraintsData,
  fetchSetAllSKUCount,
  uploadConstraintsFile,
  constraintsCheckDownload,
  setAllTimeConstraintData,
  getStoreWeekTableData,
  saveStoreWeekTableData,
  getStoreCustomTableData,
  fetchSetAllStoreWeekRecordCount,
  downloadStoreWeekConstraintsData,
  downloadStoreCustomConstraintsData,
} from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import LoadingOverlay from "core/Utils/Loader/loader";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import {
  tableArticleFilter,
  tableStoreCodeFilter,
  INVENTORY_SUBMODULES_NAMES,
  DOWNLOAD_LIMIT_CONSTANT,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { fetchProductCodes } from "modules/inventorysmart/pages-inventorysmart/inventorysmart-utility";
import { isActionAllowedOnSubModule } from "modules/inventorysmart/pages-inventorysmart/inventorysmart-utility";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import DownloadReport from "modules/inventorysmart/pages-inventorysmart/Allocation-Reporting/report-download";
import UploadHandler from "core/commonComponents/uploadHandler";
import { CONSTRAINTS_FILE_UPLOAD_INSTRUCTIONS } from "core/pages/store-grouping/grouping-contants/stringConstants";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { IconButton } from "@mui/material";
import moment from "moment";
import { dateValidation } from "core/pages/storeStatus/utils";
import { isDateRangeConflict } from "core/Utils/functions/helpers/validation-helpers";
import SetallMultirowForm from "core/Utils/agGrid/setall-multirow-form";
import {
  COL_ID_KEY_MAP,
  COLUMN_LABEL_VALUE_PAIR,
  FISCAL_YEAR_WEEK_ID,
  MAX_LESS_THAN_MIN,
  MIN_GREATER_THAN_MAX,
  MIN_MAX_WOS_COL_LABELS,
  MIN_MAX_WOS_MANDATORY,
  MIN_MAX_WOS_STORE_COL_IDS,
  NO_CHANGES_TO_SAVE,
  NON_NEGATIVE_ERROR,
  STORE_ID,
  STORE_STORE_WEEK_IDS,
  STORE_WEEK_ID,
  STORE_WEEK_RECORD_COUNT_FETCH_ERR,
  STORE_WEEK_SET_ALL_FIELDS,
} from "../constants";
import {
  INT_REGEX,
  isUndefinedNullOrEmpStr,
  removeWeekMinMaxWosFilters,
  replaceWeekMinMaxWosSearchWithFilters,
} from "../utils";

import { getObjectsAfterCheckAll } from "../../../StoreInventoryAlerts/components/AlertsActionPopup";
import { DOWNLOAD_LIMIT_EXCEED_ERR_MSG } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const ConstraintsTables = (props) => {
  const [dimension, setDimension] = useState("store");
  const [finalColumn, updatefinalColumn] = useState([]);
  const [storeColumns, setStoreColumn] = useState([]);
  const [storeGradeColumn, setStoreGradeColumn] = useState([]);
  const [storeGroupColumn, setStoreGroupColumn] = useState([]);
  const [storeWeekColumns, setStoreWeekColumns] = useState([]);
  const [tableInstance, setTableInstance] = useState(null);
  const [showStoreModalTable, updateShowStoreModalTable] = useState(false);
  const [clickedRowData, updateClickedRowData] = useState([]);
  const [editedRows, setEditedRows] = useState([]);
  const [editedStoreGradeRows, setEditedStoreGradeRows] = useState([]);
  const [storeFilterBody, setStoreFilterBody] = useState([]);
  const [editedStoreGroupRows, setEditedStoreGroupRows] = useState([]);
  const [editedStoreWeekRows, setEditedStoreWeekRows] = useState([]);
  const [showloading, setShowloading] = useState(false);
  const [viewBy, setViewBy] = useState([]);
  const [req, setRequest] = useState({});
  // signet's use case
  const [saveJobId, setJobId] = useState("");
  const [displaySetAllSKUCount, setDisplaySetAllSKUCount] = useState(0);
  const [displaySetAllRecordCount, setDisplaySetAllRecordCount] = useState(0);
  const [storeWeekSetAllSKUCount, setStoreWeekSetAllSKUCount] = useState(0);
  const [storeWeekSetAllRecordCount, setStoreWeekSetAllRecordCount] = useState(0);
  const [confirmSetAll, setConfirmSetAll] = useState(false);
  const [editableSetAllFields, setEditableSetAllFields] = useState([]);

  // const [timeBasedColumns, setTimeBasedColumns] = useState(false);
  const [setAllPayload, saveSetAllPayload] = useState({
    body: {},
    type: false,
  });
  const [isStoreDownloadDisabled, setIsStoreDownloadDisable] = useState(true);
  const [
    isStoreGradeDownloadDisabled,
    setIsStoreGradeDownloadDisable,
  ] = useState(true);
  const [
    isStoreGroupDownloadDisabled,
    setIsStoreGroupDownloadDisable,
  ] = useState(true);
  const [isStoreWeekDownloadDisabled, setIsStoreWeekDownloadDisabled] = useState(
    true
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloadDisabled, setIsDownloadDisable] = useState(true);
  const offsetValues = useRef({});
  const classes = useConstraintsStyles();
  const filterDependencies = useRef({});
  const showEmptyRows = useRef({});
  const dimensionValue = useRef({});
  const validationHandler = useRef();
  const tableRef = useRef({});
  const timeBasedColumns = useRef({});
  const [showWarningAlert, updateWarningAlert] = useState(false);
  const [setAll, toggleSetAll] = useState(false);
  const [isTableDataBeingFetched, setIsTableDataBeingFetched] = useState({});
  const [maxFieldsInRow, setMaxFieldsInRow] = useState(5);
  const [showRecordLimitationWarning, setShowRecordLimitationWarning] = useState(false);

  const {
    includeMinMaxWosInSetAll,
    tpc_store_week,
    maxNumberofSetAllFields,
    isSetAllSingleRow,
    maxSetAllRecordCount,
    tabsIgnoredOnRedirect = [],
    maxDownloadRecordCount = {},
    tabsWithDownloadHidden = [],
    showDownloadLimitInErrMsg,
  } = props.inventorysmartScreenConfig?.inventorysmart_constraints || {};

  const maxRecordCountForSetAll = maxSetAllRecordCount ?? 100000;
  const maxRecordCountForDownload = maxDownloadRecordCount[dimension] ?? DOWNLOAD_LIMIT_CONSTANT;
  const setAllConfig = {
    mandatoryFields: ['Weeks'],
    optionalFields: ['Min', 'Max', 'WOS'],
  };
  const downloadLimitExceedErrMsg = showDownloadLimitInErrMsg
    ? `The download limit of ${Math.floor(maxRecordCountForDownload / 1000)}k records is being exceeded. 
    Please ensure your selection is within the ${Math.floor(maxRecordCountForDownload / 1000)}k records limit and try again.`
    : undefined;

  const setNewTableInstance = (params) => {
    setTableInstance(params);
    tableRef.current = params;
  };
  const storePopupClick = (params) => {
    let finalCellData = params.cellData.node?.parent?.data
      ? { ...params.cellData.node.parent.data, ...params.cellData.data }
      : params.cellData.data;
    updateClickedRowData(finalCellData);
    updateShowStoreModalTable(true);
  };

  const setDynamicRenderer = (cellProps, extraProps, item) => {
    if (cellProps.node.level > 0) {
      return (
        <CellRenderers
          cellData={cellProps}
          column={item}
          extraProps={extraProps}
        // actions={actions}
        ></CellRenderers>
      );
    }
    return " ";
  };

  const setStoreGradeCols = (columns) => {
    return columns.map((item) => {
      if (item.type === "link") {
        item.onClick = storePopupClick;
      }
      if (
        item.accessor === "min_store" ||
        item.accessor === "max_store" ||
        item.accessor === "wos"
      ) {
        item.cellRenderer = (cellProps, extraProps) => {
          return setDynamicRenderer(cellProps, extraProps, item);
        };
      }
      if (item.accessor === "article") {
        item.cellRenderer = "agGroupCellRenderer";
      }
      return item;
    });
  };

  useEffect(() => {
    setShowloading(true);
    const setTableConfig = async () => {
      let storeCols = await props.getColumnsAg(
        "table_name=inventorysmart_constraints_store_list"
      );
      let storeGradeCols = await props.getColumnsAg(
        "table_name=inventorysmart_constraints_sg_list"
      );
      let storeGroupCols = await props.getColumnsAg(
        "table_name=inventorysmart_constraints_sgs_list"
      );
      let viewBySegment = await props.getColumnsAg(
        "table_name=inventorysmart_constraints_view_by"
      );
      viewBySegment = viewBySegment.map((item) => {
        return {
          label: item.label,
          value: item.column_name,
        };
      });

      storeGroupCols = setStoreGradeCols(storeGroupCols);
      storeGradeCols = setStoreGradeCols(storeGradeCols);
      //  modifying table config, if the logged user does not have edit permission make editable fields non editable
      let permissionCheck = canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_CONSTRAINTS,
        "edit"
      );
      if (!permissionCheck) {
        storeCols.forEach((item) => {
          if (item.is_editable) {
            item.is_editable = false;
            item.editable = false;
            item.cellRenderer = null;
          }
        });
        storeGradeCols.forEach((item) => {
          if (
            ["wos", "min_store", "max_store"].indexOf(item.column_name) > -1
          ) {
            item.is_editable = false;
            item.editable = false;
            item.cellRenderer = null;
          }
        });
        storeGroupCols.forEach((item) => {
          if (
            ["wos", "min_store", "max_store"].indexOf(item.column_name) > -1
          ) {
            item.is_editable = false;
            item.editable = false;
            item.cellRenderer = null;
          }
        });
      }

      if (props.isRedirectedFromDifferentPage) {
        localStorage.removeItem("selectedFiltersDependency");
        localStorage.removeItem("selectedArticles");
        localStorage.removeItem("storeCodes");
      }

      updatefinalColumn(storeCols);
      setStoreColumn(storeCols);
      setStoreGradeColumn(storeGradeCols);
      setStoreGroupColumn(storeGroupCols);
      setStoreWeekColumns(storeCols);
      setViewBy(viewBySegment);
      setShowloading(false);
    };
    setTableConfig();
    dimensionValue.current = "store";
  }, []);

  const dimensionHandleChange = (event) => {
    let finalCols = setColumn(event.target.value);
    updatefinalColumn(finalCols);
    setEditedRows([]);
    setEditedStoreGradeRows([]);
    setEditedStoreWeekRows([]);
    setIsStoreDownloadDisable(true);
    setIsStoreGradeDownloadDisable(true);
    setIsStoreGroupDownloadDisable(true);
    setIsStoreWeekDownloadDisabled(true);
    setDimension(event.target.value);
    dimensionValue.current = event.target.value;
  };
  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  const setColumn = (updatedDimension) => {
    let finalDimension = updatedDimension ? updatedDimension : dimension;
    switch (finalDimension) {
      case "store":
        return storeColumns;
      case "store_group":
        return storeGroupColumn;
      case "store_grade":
        return storeGradeColumn;
      case STORE_WEEK_ID:
        return storeWeekColumns;
      default:
        return storeColumns;
    }
  };
  useEffect(() => {
    if (!isEmpty(props.filterDependency)) {
      filterDependencies.current = props.filterDependency;
      tableInstance?.api?.refreshServerSideStore({ purge: true });
    } else {
      filterDependencies.current = {};
    }
  }, [props.filterDependency]);

  const setRequestBody = (manualbody, pageIndex, filterDependencyBody) => {
    let manualFilterbody = manualbody
      ? manualbody
      : { range: [], sort: [], search: [] };

    let payloadFilter = filterDependencies.current;
    if (pageIndex === 0 && props.isRedirectedFromDifferentPage) {
      let articleFilter = tableArticleFilter;
      let storeCodeFilter = tableStoreCodeFilter;

      const isArticleFilterApplied = payloadFilter.find(
        (filter) => filter.attribute_name === articleFilter.attribute_name
      );
      const isStoreCodeFilterApplied = payloadFilter.find(
        (filter) => filter.attribute_name === storeCodeFilter.attribute_name
      );

      if (!isArticleFilterApplied) {
        articleFilter.values = [...props.selectedConstraintArticles];

        articleFilter?.values?.length > 0 && payloadFilter.push(articleFilter);
      }

      if (!isStoreCodeFilterApplied) {
        storeCodeFilter.values = [...props.selectedStoreCodes];

        storeCodeFilter?.values?.length > 0 &&
          payloadFilter.push(storeCodeFilter);
      }
    }
    let limit =
      Object.keys(offsetValues.current).length > 0 && pageIndex !== 0
        ? { limit: 10, page: pageIndex + 1, ...offsetValues.current }
        : { limit: 10, page: pageIndex + 1 };
    return {
      filters: payloadFilter,
      meta: {
        ...manualFilterbody,
        limit,
      },
      popupLink: props.popUpLinkFromDashbaord,
    };
  };
  const addChildRow = (params) => {
    let newRowData = {
      store_code: params.data.store_code,
      min_store: null,
      wos: null,
      max_store: null,
      start_date: null,
      end_date: "2050-12-31",
      // original_start_date: null,
      action: "insert",
      product_code: params.data.product_code,
      uniqueID: params?.data?.stores?.length + 1,
      uniqueParentKey: params.data.uniqueKey,
      newRowAdded: true,
    };
    let storesData = [...params.data.stores, newRowData];

    let updated_data = {
      ...params.data,
    };
    updated_data.stores = storesData;
    setEditedRows((editedRows) => {
      let exitedUpdatedRows = [...editedRows].filter(
        (item) => item.uniqueParentKey === params.data.uniqueKey
      );
      if (exitedUpdatedRows?.length > 0) {
        let finalRows = [...editedRows].map((item) => {
          if (item.uniqueParentKey === params.data.uniqueKey) {
            item.stores = [...item.stores, newRowData];
          }
          return item;
        });
        return finalRows;
      } else {
        let newRow = {
          product_code: params.data.product_code,
          uniqueParentKey: params.data.uniqueKey,
          channel: params?.data?.product_channel_name,
          stores: [newRowData],
        };
        let editedPayload = [...editedRows, newRow];
        return editedPayload;
      }
    });
    params.node.setExpanded(false);
    params.node.setData(updated_data);
    params.api.flashCells({ rowNodes: [params.node] });
    params.node.setExpanded(true);
  };

  const onDeleteClick = (params) => {
    let parentNode = params.node.parent;
    let childNodes = params.node.parent.data.stores.filter((item) => {
      return item.uniqueID !== params.data.uniqueID;
    });
    let deletedNode = params.node.parent.data.stores
      .filter((item) => {
        return item.uniqueID === params.data.uniqueID;
      })
      .map((item) => {
        item.action = "delete";
        item.uniqueID = `${item.uniqueID}_delete`;
        return item;
      });
    childNodes = childNodes.map((item, index) => {
      item.uniqueID = index;
      return item;
    });
    if (!deletedNode[0].newRowAdded) {
      setEditedRows((editedRows) => {
        let exitedDeletedRows = [...editedRows].filter(
          (item) => item.uniqueParentKey === params.data.uniqueParentKey
        );
        if (exitedDeletedRows?.length > 0) {
          let finalRows = [...editedRows].map((item) => {
            if (item.uniqueParentKey === params.data.uniqueParentKey) {
              item.stores = [...item.stores, ...deletedNode];
            }
            return item;
          });
          return finalRows;
        } else {
          let newRow = {
            product_code: params.data.product_code,
            uniqueParentKey: params.data.uniqueParentKey,
            channel: params?.node?.parent?.data?.product_channel_name,
            stores: [...deletedNode],
          };
          let editedPayload = [...editedRows, newRow];
          return editedPayload;
        }
      });
    }

    parentNode.setExpanded(false);
    let updated_data = { ...params.node.parent.data };
    updated_data.stores = childNodes;
    parentNode.setData(updated_data);
    params.api.flashCells({ rowNodes: [parentNode] });
    parentNode.setExpanded(true);
  };

  const manualCallBackStore = async (manualbody, pageIndex, params) => {
    let finalData;

    setIsTableDataBeingFetched(prev => ({
      ...prev,
      [STORE_ID]: true,
    }));

    try {
      let updatedManualBody = { ...manualbody };
      if (updatedManualBody && Array.isArray(updatedManualBody.search)) {
        updatedManualBody.search = updatedManualBody.search.map(searchObj => {
          if (searchObj.column === "store_grade") {
            return {
              ...searchObj,
              pattern: replaceSpecialCharacter(searchObj.pattern),
            };
          }
          return searchObj;
        });
      }
      let reqBody = setRequestBody(
        updatedManualBody,
        pageIndex,
        props.filterDependencyBody
      );
      setRequest(reqBody);
      if (isEmpty(showEmptyRows?.current)) {
        let response;

        if (tpc_store_week) {
          const { filters } = reqBody;

          // Remove weeks min max wos from filters

          reqBody.filters = removeWeekMinMaxWosFilters(filters);

          // Set payload for download API - does not include weeks min max wos

          setRequest(cloneDeep(reqBody));

          // Remove weeks min max wos from search and add in filters

          replaceWeekMinMaxWosSearchWithFilters(reqBody);

          response = await props.getStoreCustomTableData(reqBody);
        } else {
          response = await props.getStoreTableData("store", reqBody);
        }

        let { data: storeData } = response;

        storeData.data.table_data = storeData?.data?.table_data.map((item) => {
          item.uniqueKey = `${item.product_code} + ${item.store_code}`;
          if (item.stores) {
            item.stores = item?.stores.map((subRow, index) => {
              subRow.original_start_date = subRow.start_date;
              subRow.product_code = item.product_code;
              subRow.uniqueID = index;
              subRow.store_code = item.store_code;
              subRow.uniqueParentKey = item.uniqueKey;
              return subRow;
            });
          }
          return item;
        });

        if (storeData.data?.table_config) {
          // Enable search for min max wos columns
          if (tpc_store_week) {
            storeData.data?.table_config.forEach((col) => {
              if (MIN_MAX_WOS_STORE_COL_IDS.includes(col.column_name)) {
                col.is_searchable = true;
              }
            });

            // Change level name to store - used in download report
            storeData.data?.table_config.forEach((col) => {
              if (col.extra?.levelName) {
                col.extra.levelName = "store";
              }
            });
          }

          let timeBasedCols = storeData.data?.table_config.some(
            (item) => item.column_name === "start_date"
          );
          let actionCol = {
            headerName: "Action",
            minWidth: 150,
            cellRenderer: (params, extraProps) => {
              if (params.node.level !== 0) {
                return (
                  <div>
                    <IconButton
                      variant="text"
                      color="primary"
                      className={classes.actionButton}
                      onClick={() => {
                        onDeleteClick(params);
                      }}
                      disabled={
                        params?.node?.parent?.data?.stores?.length === 1
                      }
                      title="Delete"
                      size="large"
                    >
                      <Delete />
                    </IconButton>
                  </div>
                );
              } else {
                return (
                  <div>
                    <IconButton
                      variant="text"
                      color="primary"
                      className={classes.actionButton}
                      onClick={() => {
                        addChildRow(params);
                      }}
                      disabled={params?.node?.data?.stores?.length > 2}
                      title="Add"
                      size="large"
                    >
                      <AddIcon fontSize="small"></AddIcon>
                    </IconButton>
                  </div>
                );
              }
            },
            editable: false,
            colId: "action",
          };

          let cols = timeBasedCols
            ? [...storeData.data?.table_config, actionCol]
            : [...storeData.data?.table_config];
          let col = agGridColumnFormatter(cols, null, null);
          if (timeBasedCols) {
            col.forEach((item) => {
              if (item.accessor === "article") {
                item.cellRenderer = "agGroupCellRenderer";
              }
              if (
                item.accessor === "start_date" ||
                item.accessor === "end_date"
              ) {
                item.type = "datetime";
                item.editable = false;
              }
              if (
                item.accessor === "min_store" ||
                item.accessor === "max_store" ||
                item.accessor === "wos" ||
                item.accessor === "start_date" ||
                item.accessor === "end_date"
              ) {
                item.cellRenderer = (cellProps, extraProps) => {
                  return setDynamicRenderer(cellProps, extraProps, item);
                };
              }
            });
          }
          let permissionCheck = canTakeActionOnModules(
            INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_CONSTRAINTS,
            "edit"
          );
          if (!permissionCheck) {
            col.forEach((item) => {
              if (item.is_editable) {
                item.is_editable = false;
                item.editable = false;
                item.cellRenderer = null;
              }
            });
          }
          timeBasedColumns.current = timeBasedCols;
          setStoreColumn(col);
          editableFieldsList(col, STORE_ID);
          if (dimensionValue.current === "store") {
            updatefinalColumn(col);
          }
        }
        let formattedData = agGridRowFormatter(
          storeData.data.table_data,
          params?.api?.checkConfiguration,
          "uniqueKey"
        );
        let manualFilterbody = manualbody
          ? manualbody
          : { range: [], sort: [], search: [] };

        offsetValues.current = {
          offset: storeData.data.offset,
          sub_offset: storeData.data.sub_offset,
        };
        if (pageIndex == 0) {
          if (storeData?.data?.table_data?.length)
            setIsStoreDownloadDisable(false);
          else setIsStoreDownloadDisable(true);
        }
        setStoreFilterBody(manualFilterbody);
        showEmptyRows.current = {};
        finalData = {
          data: formattedData,
          // totalCount: storeData?.total
        };
      } else {
        showEmptyRows.current = {};
        finalData = {
          data: [],
          // totalCount: storeData?.total
        };
      }
    } catch (err) {
      setIsStoreDownloadDisable(true);
      displaySnackMessages("Error in fetching the data", "error");
      finalData = { data: [], totalCount: 0 };
    }

    setIsTableDataBeingFetched(prev => ({
      ...prev,
      [STORE_ID]: false,
    }));

    return finalData;
  };

  const manualCallBackStoreGroup = async (
    manualbody,
    pageIndex,
    filterDependencyBody
  ) => {
    try {
      let reqBody = setRequestBody(manualbody, pageIndex, filterDependencyBody);
      setRequest(reqBody);
      reqBody.application_code = 1;
      let { data: storeData } = await props.getStoreGroupTableData(reqBody);
      storeData.data.data = storeData.data.data.map((item) => {
        item.sub_row = true;
        return item;
      });
      offsetValues.current = {
        offset: storeData.data.offset,
        sub_offset: storeData.data.sub_offset,
      };
      if (pageIndex == 0) {
        if (storeData?.data?.data?.length)
          setIsStoreGroupDownloadDisable(false);
        else setIsStoreGroupDownloadDisable(true);
      }
      return { data: storeData.data.data, totalCount: storeData?.total };
    } catch (err) {
      setIsStoreGroupDownloadDisable(true);
      displaySnackMessages("Error in fetching the data", "error");
      return { data: [], totalCount: 0 };
    }
  };

  const manualCallBackStoreGrade = async (
    manualbody,
    pageIndex,
    filterDependencyBody
  ) => {
    try {
      let reqBody = setRequestBody(manualbody, pageIndex, filterDependencyBody);
      setRequest(reqBody);
      let { data: storeData } = await props.getStoreGradeTableData(reqBody);
      storeData.data.data = storeData.data.data.map((item) => {
        item.sub_row = true;
        return item;
      });
      offsetValues.current = {
        offset: storeData.data.offset,
        sub_offset: storeData.data.sub_offset,
      };
      if (pageIndex == 0) {
        if (storeData?.data?.data?.length)
          setIsStoreGradeDownloadDisable(false);
        else setIsStoreGradeDownloadDisable(true);
      }
      return { data: storeData.data.data, totalCount: storeData?.total };
    } catch (err) {
      setIsStoreGradeDownloadDisable(true);
      displaySnackMessages("Error in fetching the data", "error");
      return { data: [], totalCount: 0 };
    }
  };

  const manualCallBackStoreWeek = async (manualbody, pageIndex, params) => {
    let finalData;

    setIsTableDataBeingFetched(prev => ({
      ...prev,
      [STORE_WEEK_ID]: true,
    }));

    try {
      let reqBody = setRequestBody(
        manualbody,
        pageIndex,
        props.filterDependencyBody
      );

      const weekFilterData = reqBody.filters.find(
        (filterObj) => filterObj.filter_id === FISCAL_YEAR_WEEK_ID
      );

      if (weekFilterData) {
        weekFilterData.values.sort((week1, week2) => week1 - week2);
      }

      setRequest(reqBody);

      if (isEmpty(showEmptyRows?.current)) {
        const { data: storeData } = await props.getStoreWeekTableData(reqBody);
        const tableConfig = storeData?.data?.table_config ?? [];
        let tableData = storeData?.data?.table_data || [];

        tableData = tableData.map((item) => {
          item.uniqueKey = `${item.product_code} + ${item.store_code}`;

          if (item.stores) {
            const storeKeys = Object.keys(item.stores);

            for (let index = 0; index < storeKeys.length; index++) {
              const subRow = item.stores[storeKeys[index]];

              subRow.original_start_date = subRow.start_date;
              subRow.product_code = item.product_code;
              subRow.uniqueID = index;
              subRow.store_code = item.store_code;
              subRow.uniqueParentKey = item.uniqueKey;
            }
          }

          return item;
        });

        // Hiding general min, max, wos columns - not the week columns
        tableConfig.forEach(col => {
          if (MIN_MAX_WOS_COL_LABELS.includes(col.label)) {
            col.is_hidden = true;
          }
        });

        // Change level name to store_time_based - used in download report
        tableConfig.forEach((col) => {
          if (col.extra?.levelName) {
            col.extra.levelName = "store_time_based";
          }
        });

        if (tableConfig) {
          let timeBasedCols = tableConfig.some(
            (item) => item.column_name === "start_date"
          );
          let actionCol = {
            headerName: "Action",
            minWidth: 150,
            cellRenderer: (params, extraProps) => {
              if (params.node.level !== 0) {
                return (
                  <div>
                    <IconButton
                      variant="text"
                      color="primary"
                      className={classes.actionButton}
                      onClick={() => {
                        onDeleteClick(params);
                      }}
                      disabled={
                        params?.node?.parent?.data?.stores?.length === 1
                      }
                      title="Delete"
                      size="large"
                    >
                      <Delete />
                    </IconButton>
                  </div>
                );
              } else {
                return (
                  <div>
                    <IconButton
                      variant="text"
                      color="primary"
                      className={classes.actionButton}
                      onClick={() => {
                        addChildRow(params);
                      }}
                      disabled={params?.node?.data?.stores?.length > 2}
                      title="Add"
                      size="large"
                    >
                      <AddIcon fontSize="small"></AddIcon>
                    </IconButton>
                  </div>
                );
              }
            },
            editable: false,
            colId: "action",
          };

          let cols = timeBasedCols
            ? [...tableConfig, actionCol]
            : [...tableConfig];
          let col = agGridColumnFormatter(cols, null, null);
          if (timeBasedCols) {
            col.forEach((item) => {
              if (item.accessor === "article") {
                item.cellRenderer = "agGroupCellRenderer";
              }
              if (
                item.accessor === "start_date" ||
                item.accessor === "end_date"
              ) {
                item.type = "datetime";
                item.editable = false;
              }
              if (
                item.accessor === "min_store" ||
                item.accessor === "max_store" ||
                item.accessor === "wos" ||
                item.accessor === "start_date" ||
                item.accessor === "end_date"
              ) {
                item.cellRenderer = (cellProps, extraProps) => {
                  return setDynamicRenderer(cellProps, extraProps, item);
                };
              }
            });
          }
          let permissionCheck = canTakeActionOnModules(
            INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_CONSTRAINTS,
            "edit"
          );
          if (!permissionCheck) {
            col.forEach((item) => {
              if (item.is_editable) {
                item.is_editable = false;
                item.editable = false;
                item.cellRenderer = null;
              }
            });
          }
          timeBasedColumns.current = timeBasedCols;
          setStoreWeekColumns(col);
          editableFieldsList(col, STORE_WEEK_ID);
          if (dimensionValue.current === STORE_WEEK_ID) {
            updatefinalColumn(col);
          }
        }
        let formattedData = agGridRowFormatter(
          tableData,
          params?.api?.checkConfiguration,
          "uniqueKey"
        );
        let manualFilterbody = manualbody
          ? manualbody
          : { range: [], sort: [], search: [] };

        offsetValues.current = {
          offset: storeData.data.offset,
          sub_offset: storeData.data.sub_offset,
        };
        if (pageIndex == 0) {
          if (tableData.length)
            setIsStoreWeekDownloadDisabled(false);
          else setIsStoreWeekDownloadDisabled(true);
        }
        setStoreFilterBody(manualFilterbody);
        showEmptyRows.current = {};

        finalData = {
          data: formattedData,
          // totalCount: storeData?.total
        };
      } else {
        showEmptyRows.current = {};

        finalData = {
          data: [],
          // totalCount: storeData?.total
        };
      }
    } catch (err) {
      setIsStoreWeekDownloadDisabled(true);

      displaySnackMessages("Error in fetching the data", "error");

      finalData = { data: [], totalCount: 0 };
    }

    setIsTableDataBeingFetched(prev => ({
      ...prev,
      [STORE_WEEK_ID]: false,
    }));

    return finalData;
  };

  const editableFieldsList = (cols, currentDimension) => {
    if (currentDimension !== dimensionValue.current) {
      return;
    }

    const cloneStoreColumns = cloneDeep(cols);
    let editableFields = cloneStoreColumns.filter((item) => {
      if (includeMinMaxWosInSetAll && MIN_MAX_WOS_COL_LABELS.includes(item.label)) {
        item.accessor = COLUMN_LABEL_VALUE_PAIR[item.label];

        return true;
      }

      return !item.is_hidden && item.is_editable && !item.system_field;
    });

    if (tpc_store_week && dimension === STORE_WEEK_ID) {
      editableFields.push(
        STORE_WEEK_SET_ALL_FIELDS.MIN,
        STORE_WEEK_SET_ALL_FIELDS.MAX,
        STORE_WEEK_SET_ALL_FIELDS.WOS
      );

      const weekFilterObj = props.filterDependency.find(
        (filterObj) => filterObj.filter_id === FISCAL_YEAR_WEEK_ID
      );

      const filterSelectedWeekOptions = props.next31Weeks.filter((weekObj) =>
        weekFilterObj.values.includes(weekObj.value)
      );

      editableFields.push({
        label: "Weeks",
        type: "list",
        accessor: "weeks",
        required: true,
        is_disabled: true,
        isMulti: true,
        isSearchable: true,
        options: filterSelectedWeekOptions,
        is_clearable: true,
        menuPortalTarget: document.body,
      });
    }

    editableFields = editableFields.map((item) => {
      if (item.type === "int") {
        item.type = "IntegerField";
        item.no_negative_values = true;
      }
      if (item.type === "str") {
        item.type = "TextField";
      }
      if (["start_date", "end_date"].indexOf(item.accessor) > -1) {
        item.type = "DateTimeField";
      }

      item.required = true;

      if (setAllConfig.mandatoryFields.includes(item.label)) {
        item.required = true;
      }

      if (setAllConfig.optionalFields.includes(item.label)) {
        item.required = false;
      }

      return item;
    });

    setMaxFieldsInRow(editableFields.length);

    setEditableSetAllFields([
      {
        fields: editableFields,
        addRowLabel: "Add",
        id: "add",
        rowCount: 0,
        maxNumberofFields: maxNumberofSetAllFields ?? 18,
        hideRowLabel: false,
      },
    ]);

    return [
      {
        fields: editableFields,
        addRowLabel: "Add Store_grade",
        id: "grade",
        rowCount: 0,
        hideRowLabel: false,
      },
    ];
  };

  const setFilterPayload = () => {
    let selectedRowsCode = tableInstance.api.getSelectedNodes().map((item) => {
      return item.data.mapping_code;
    });

    let selected_rows = {
      attribute_name: "mapping_code",
      dimension: "custom",
      filter_type: "cascaded",
      operator: "in",
      system_filter: true,
      values: selectedRowsCode
    };
    let l_userActions = getObjectsAfterCheckAll(
      tableInstance?.api?.checkConfiguration
    );
    let filterPayload = [];
    if (isEmpty(l_userActions)) {
      filterPayload = [...props.filterDependency, selected_rows];
    } else {
      let l_userActionClubbed = l_userActions.reduce(
        (result, obj) => Object.assign(result, obj),
        {}
      );
      if (l_userActionClubbed?.unCheckedRows) {
        let deSelectedRows = tableInstance.api
          ?.getRenderedNodes()
          ?.filter((node) => !node.selected)
          ?.map((rowNode) => rowNode.data);

        let unselected_rows = {
          attribute_name: "mapping_code",
          dimension: "custom",
          filter_type: "cascaded",
          operator: "not in",
          system_filter: true,
          values: deSelectedRows.map((row) => row.mapping_code),
        };

        filterPayload = [...props.filterDependency, unselected_rows];
      } else {
        filterPayload = [...props.filterDependency];
      }
    }
    return filterPayload;
  };

  const getFilterPayload = () => {
    const filterPayload = cloneDeep(setFilterPayload());
    const mappingCodeIndex = filterPayload.findIndex(
      (filterObj) => filterObj.attribute_name === "mapping_code"
    );

    if (mappingCodeIndex !== -1) {
      const mappingCodeObj = filterPayload[mappingCodeIndex];

      if (!mappingCodeObj.values.length) {
        filterPayload.splice(mappingCodeIndex, 1);
      }
    }

    return filterPayload;
  };

  const onNewSetAllApply = async (rows, params) => {
    const tableCheckConfig = tableInstance?.api?.checkConfiguration;
    const tableCheckConfigLength = tableCheckConfig.length;
    const checkAll = tableCheckConfig?.length && (tableCheckConfig[tableCheckConfigLength - 2]?.checkAll || tableCheckConfig[tableCheckConfigLength - 3]?.checkAll || false)

    if (tpc_store_week && (dimension === STORE_ID || dimension === STORE_WEEK_ID)) {

      let errMsg = "";

      // To check if atleast one of min max wos is entered

      for (const formRowData of rows) {
        if (isUndefinedNullOrEmpStr(formRowData.min_store) && isUndefinedNullOrEmpStr(formRowData.max_store) && isUndefinedNullOrEmpStr(formRowData.wos)) {
          errMsg = MIN_MAX_WOS_MANDATORY;

          break;
        }
      }

      if (errMsg) {
        displaySnackMessages(errMsg, "error");

        return true; // To leave set all modal open
      }

      // To check if the entered values are positive integers

      for (const formRowData of rows) {
        if (
          (!isUndefinedNullOrEmpStr(formRowData.min_store) && !INT_REGEX.test(formRowData.min_store)) ||
          (!isUndefinedNullOrEmpStr(formRowData.max_store) && !INT_REGEX.test(formRowData.max_store)) ||
          (!isUndefinedNullOrEmpStr(formRowData.wos) && !INT_REGEX.test(formRowData.wos))
        ) {
          errMsg = NON_NEGATIVE_ERROR;

          break;
        }
      }

      if (errMsg) {
        displaySnackMessages(errMsg, "error");

        return true; // To leave set all modal open
      }
      // To check if the min value is less than or equal to max value
      for (const formRowData of rows) {
        if (
          isUndefinedNullOrEmpStr(formRowData.min_store) ||
          isUndefinedNullOrEmpStr(formRowData.max_store)
        ) {
          continue;
        }

        const minStore = parseInt(formRowData.min_store);
        const maxStore = parseInt(formRowData.max_store);

        if (minStore > maxStore) {
          errMsg = MIN_GREATER_THAN_MAX;

          break;
        }
      }

      if (errMsg) {
        displaySnackMessages(errMsg, "error");

        return true; // To leave set all modal open
      }

      const reqBody = {
        filters: getFilterPayload(),
        meta: storeFilterBody,
        values: rows.map((item) => {
          return {
            min_stock: item.min_store ? item.min_store : undefined,
            max_stock: item.max_store ? item.max_store : undefined,
            wos: item.wos ? item.wos : undefined,
            record_count: storeWeekSetAllRecordCount,
            sku_count: storeWeekSetAllSKUCount,
          };
        }),
      };

      if (dimension === STORE_WEEK_ID) {
        const weekFilterData = reqBody.filters.find(
          (filterObj) => filterObj.filter_id === FISCAL_YEAR_WEEK_ID
        );

        weekFilterData.values = rows[0].weeks.map(num => num.toString());
      } else if (dimension === STORE_ID) {
        // Remove weeks min max wos from search and add in filters

        replaceWeekMinMaxWosSearchWithFilters(reqBody);
      }

      const skuCountResponse = await props.fetchSetAllSKUCount(
        reqBody,
        dimension === STORE_WEEK_ID
          ? "constraint-time-based-wk"
          : "constraint-time-based"
      );
      const { job_id, sku_count, record_count } =
        skuCountResponse.data?.data || {};

      if (dimension === STORE_WEEK_ID && record_count > maxSetAllRecordCount) {
        setShowRecordLimitationWarning(true);

        return true; // To leave set all modal open
      }

      setJobId(job_id);
      setDisplaySetAllSKUCount(sku_count);
      setDisplaySetAllRecordCount(record_count);
      setShowloading(false);
      // open a popup
      setConfirmSetAll(true);

      saveSetAllPayload({ body: reqBody, type: checkAll });

      return;
    }

    let hasConflictedDate = isDateRangeConflict(
      rows.map((item) => {
        item.start_time = item.start_date;
        item.end_time = item.end_date;
        return item;
      }),
      "YYYY-MM-DD"
    );
    let minMaxValidate = rows.some(
      (item) => Number(item.max_store) < Number(item.min_store)
    );
    if (minMaxValidate) {
      displaySnackMessages("Max must be greater than min", "error");
      throw "Enter data in fields";
    } else if (hasConflictedDate) {
      displaySnackMessages(
        "There is a duplications in date, please enter other dates",
        "error"
      );
      throw "Enter data in fields";
    } else {
      let reqBody = {
        filters: setFilterPayload(),
        meta: storeFilterBody,
        values: rows.map((item) => {
          return {
            min_stock: item.min_store,
            max_stock: item.max_store,
            wos: item.wos,
            start_date: item.start_date,
            end_date: item.end_date,
          };
        }),
      };
      let skuCountResponse = await props.fetchSetAllSKUCount(
        reqBody,
        "constraint-time-based"
      );
      setJobId(skuCountResponse.data?.data?.job_id);
      setDisplaySetAllSKUCount(skuCountResponse.data?.data?.sku_count);
      setDisplaySetAllRecordCount(skuCountResponse.data?.data?.record_count);
      setShowloading(false);
      // open a popup
      setConfirmSetAll(true);
      reqBody.values = reqBody.values.map((item) => {
        return {
          min: item.min_stock,
          max: item.max_stock,
          wos: item.wos,
          start_date: item.start_date,
          end_date: item.end_date,
        };
      });
      saveSetAllPayload({ body: reqBody, type: checkAll });
    }
  };
  const formatSetAllData = (input, fieldRowId) => {
    let setAllOutput = [];
    for (let i = 0; i <= fieldRowId; i++) {
      const unique_delimiter = "_" + i;
      let row = {};
      let keyFound = false;
      Object.keys(input).forEach((key) => {
        if (key.endsWith(unique_delimiter)) {
          keyFound = true;
          let finalKey = key.replace(unique_delimiter, "");
          row[finalKey] = input[key];
        }
      });
      if (keyFound === true) {
        setAllOutput.push(row);
      }
    }
    return setAllOutput;
  };

  const onCellValueChanged = (params) => {
    checkValidation(params.data, params);

    setEditedRows((editedRows) => {
      let updatedRows = [];
      if (editedRows.length > 0) {
        let checkAlreadyExists = editedRows.some(
          (item) =>
            item.store_code === params.data.store_code &&
            item.product_code === params.data.product_code
        );
        if (checkAlreadyExists) {
          updatedRows = editedRows.map((item) => {
            if (
              item.store_code === params.data.store_code &&
              item.product_code === params.data.product_code
            ) {
              item = params.data;
            }
            return item;
          });
        } else {
          updatedRows = [...editedRows, params.data];
        }
      } else {
        updatedRows.push(params.data);
      }
      return updatedRows;
    });
  };

  const onTimebasedCellValueChanged = (params, oldValue) => {
    if (tpc_store_week && (dimension === STORE_ID || dimension === STORE_WEEK_ID)) {
      return;
    }

    checkValidation(params.data, params);
    setEditedRows((editedRows) => {
      let uniqueParentKey = params?.node?.parent?.data?.uniqueKey;
      try {
        let updatedRows = [];
        if (editedRows.length > 0) {
          let editedRowData = editedRows.filter(
            (item) => item.uniqueParentKey === uniqueParentKey
          );
          let editedRowStoreData = [];
          let checkAlreadyExists = false;
          if (editedRowData?.length > 0) {
            editedRowStoreData = editedRowData[0].stores;
          } else {
            checkAlreadyExists = false;
            let newRow = {
              product_code: params.data.product_code,
              uniqueParentKey: uniqueParentKey,
              channel: params?.node?.parent?.data?.product_channel_name,
              stores: [params.data],
            };
            return [...editedRows, newRow];
          }
          checkAlreadyExists = editedRowStoreData.some(
            (item) =>
              item.uniqueID === params.data.uniqueID && item.action !== "delete"
          );
          if (checkAlreadyExists) {
            let updatedStoreRows = editedRowStoreData.map((item) => {
              if (item.uniqueID === params.data.uniqueID) {
                item = params.data;
              }
              return item;
            });
            let finalUpdatedRows = editedRows.map((item) => {
              if (item.product_code === params.data.product_code) {
                item.stores = [...updatedStoreRows];
              }
              return item;
            });
            updatedRows = [...finalUpdatedRows];
          } else {
            let finalUpdatedRows = editedRows.map((item) => {
              if (item.product_code === params.data.product_code) {
                item.stores = [...item.stores, params.data];
              }
              return item;
            });
            updatedRows = [...finalUpdatedRows];
          }
        } else {
          let newRow = {
            product_code: params.data.product_code,
            stores: [params.data],
            uniqueParentKey: uniqueParentKey,
            channel: params?.node?.parent?.data?.product_channel_name,
          };
          updatedRows = [...editedRows, newRow];
        }
        return updatedRows;
      } catch (err) {
        return [];
      }
    });
  };

  const onBlur = async (
    _e,
    _data,
    _column,
    _isChanged,
    _value,
    _initialValue,
    cellData,
    tableType
  ) => {
    if (tableType === "store") {
      timeBasedColumns.current || tpc_store_week
        ? onTimebasedCellValueChanged(cellData, _initialValue)
        : onCellValueChanged(cellData, _initialValue);
    } else if (tableType === "store_grade") {
      onStoreGradeCellValueChanged(cellData);
    } else if (tableType === "store_group") {
      onStoreGroupCellValueChanged(cellData);
    }
  };

  const setPostRequestBody = (arr, storeLevel) => {
    return arr.map((item) => {
      return {
        product_code: item.product_code,
        min: Number(item.min_store),
        wos: Number(item.wos),
        max: Number(item.max_store),
        stores: storeLevel ? [item.store_code] : item.store_codes,
      };
    });
  };

  const onSaveRequest = async () => {
    if (tpc_store_week && (dimension === STORE_ID || dimension === STORE_WEEK_ID)) {
      if ((dimension === STORE_ID && !editedRows.length) || (dimension === STORE_WEEK_ID && !editedStoreWeekRows.length)) {
        displaySnackMessages(NO_CHANGES_TO_SAVE, "warning");

        return;
      }

      const payload = { data: editedRows, popupLink: null };

      if (dimension === STORE_WEEK_ID) {
        payload.data = editedStoreWeekRows;
      }

      setShowloading(true);

      try {
        if (dimension === STORE_ID) {
          await props.saveStoreTableData(payload, true);
        } else if (dimension === STORE_WEEK_ID) {
          await props.saveStoreWeekTableData(payload, true);
        }

        displaySnackMessages("Data saved successfully", "success");

        tableInstance.api.refreshServerSideStore({ route: [], purge: true });

        setEditedRows([]);
        setEditedStoreGradeRows([]);
        setEditedStoreGroupRows([]);
        setEditedStoreWeekRows([]);
        updateWarningAlert(false);
      } catch (err) {
        displaySnackMessages("Error while saving", "error");
      }

      setShowloading(false);

      return;
    }

    setShowloading(true);
    props.setConstraintsLoader(true);
    try {
      let reqBody = [];
      let validateData;
      let hasConflictedDate;
      if (editedRows.length > 0) {
        reqBody = timeBasedColumns.current
          ? setTimeConstraintPostRequestBody([...editedRows])
          : setPostRequestBody(editedRows, true);
        if (timeBasedColumns.current) {
          validateData = checkValidationforTimeConstraint(reqBody);
          hasConflictedDate = checkValidationforTimeConstraintDate(
            editedRows,
            tableRef
          );
        }
      } else if (editedStoreGradeRows.length > 0) {
        reqBody = setPostRequestBody(editedStoreGradeRows);
      } else if (editedStoreGroupRows.length > 0) {
        reqBody = setPostRequestBody(editedStoreGroupRows);
      }
      if (validateData) {
        displaySnackMessages("Please enter values in all the field", "error");
      } else if (hasConflictedDate) {
        displaySnackMessages(
          "There is a duplications in date, please enter other dates",
          "error"
        );
      } else if (reqBody.length > 0) {
        let timeConstraintApi =
          editedRows.length > 0 && timeBasedColumns.current ? true : false;
        if (timeConstraintApi) {
          reqBody = setTimeConstraintSavePayload(reqBody);
        }
        await props.saveStoreTableData({ data: reqBody }, timeConstraintApi);
        tableInstance.api.refreshServerSideStore({ route: [], purge: true });
        displaySnackMessages("Data saved successfully", "success");
        setEditedRows([]);
        setEditedStoreGradeRows([]);
        setEditedStoreGroupRows([]);
        setEditedStoreWeekRows([]);
        updateWarningAlert(false);
      } else {
        displaySnackMessages("No change to save", "warning");
      }
      props.setConstraintsLoader(false);
    } catch (err) {
      props.setConstraintsLoader(false);
      displaySnackMessages("Error while saving", "error");
    }
    finally {
      setShowloading(false);
    }
  };

  const onStoreGradeCellValueChanged = (params) => {
    checkValidation(params.data, params);

    setEditedStoreGradeRows((editedStoreGradeRows) => {
      let updatedRows = [];
      if (editedStoreGradeRows.length > 0) {
        let checkAlreadyExists = editedStoreGradeRows.some(
          (item) =>
            item.store_grade === params.data.store_grade &&
            item.product_code === params.data.product_code
        );
        if (checkAlreadyExists) {
          updatedRows = editedStoreGradeRows.map((item) => {
            if (
              item.store_grade === params.data.store_grade &&
              item.product_code === params.data.product_code
            ) {
              item = params.data;
            }
            return item;
          });
        } else {
          updatedRows = [...editedStoreGradeRows, params.data];
        }
      } else {
        updatedRows.push(params.data);
      }
      return updatedRows;
    });
  };
  const modalClose = (success) => {
    if (success) {
      tableInstance.api.refreshServerSideStore({ route: [], purge: true });
    }
    updateShowStoreModalTable(false);
  };

  const setAllRequest = async () => {
    let checkSelection =
      tableInstance?.api?.getSelectedNodes()?.length > 0 ? true : false;
    if (checkSelection) {
      if (tpc_store_week && dimension === STORE_WEEK_ID) {
        const reqBody = {
          filters: getFilterPayload(),
          meta: storeFilterBody,
        };

        setStoreWeekSetAllSKUCount(0);
        setStoreWeekSetAllRecordCount(0);

        setShowloading(true);

        try {
          const storeWeekRecordCountResponse = await props.fetchSetAllStoreWeekRecordCount(
            reqBody
          );
          const { sku_count, record_count } =
            storeWeekRecordCountResponse.data?.data || {};

          if (record_count > maxSetAllRecordCount) {
            setShowRecordLimitationWarning(true);
            setShowloading(false);

            return;
          }

          setStoreWeekSetAllSKUCount(sku_count);
          setStoreWeekSetAllRecordCount(record_count);
        } catch (err) {
          console.error(err);

          displaySnackMessages(STORE_WEEK_RECORD_COUNT_FETCH_ERR, "error");
        }

        setShowloading(false);
      }

      timeBasedColumns.current || tpc_store_week
        ? toggleSetAll(true)
        : tableInstance.trigerSetAll(true);

      saveSetAllPayload({ body: {}, type: false });

      // let selectAllFlag = checkSetAllFlag();
      // selectAllFlag
      //   ? tableInstance.trigerSetAll(true)
      //   : displaySnackMessages(
      //       "Set all is not valid for whole data set",
      //       "error"
      //     );
    } else {
      displaySnackMessages("Please select atleast one row", "error");
    }
  };

  const checkSetAllFlag = () => {
    let flag = false;
    if (tableInstance && tableInstance?.api?.checkConfiguration?.length > 1) {
      flag =
        tableInstance.api?.checkConfiguration[
          tableInstance.api?.checkConfiguration?.length - 2
        ].checkAll;
    }
    return !flag;
  };

  const onStoreGroupCellValueChanged = (params) => {
    checkValidation(params.data, params);
    setEditedStoreGroupRows((editedStoreGroupRows) => {
      let updatedRows = [];
      if (editedStoreGroupRows.length > 0) {
        let checkAlreadyExists = editedStoreGroupRows.some(
          (item) =>
            item.store_group_name === params.data.store_group_name &&
            item.product_code === params.data.product_code
        );
        if (checkAlreadyExists) {
          updatedRows = editedStoreGroupRows.map((item) => {
            if (
              item.store_group_name === params.data.store_group_name &&
              item.product_code === params.data.product_code
            ) {
              item = params.data;
            }
            return item;
          });
        } else {
          updatedRows = [...editedStoreGroupRows, params.data];
        }
      } else {
        updatedRows.push(params.data);
      }
      return updatedRows;
    });
  };

  const onStoreWeekCellValueChanged = (params) => {
    if (tpc_store_week && (dimension === STORE_ID || dimension === STORE_WEEK_ID)) {
      const {
        column: { colId },
        data: { product_code, channel, store_code },
        newValue,
      } = params;

      if (!INT_REGEX.test(newValue)) {
        displaySnackMessages(
          NON_NEGATIVE_ERROR,
          "error"
        );

        return;
      }

      const [weekText, weekNumber, subColId] = colId.split("_");
      const newValueInt = parseInt(newValue);
      const min = params.data[`${weekText}_${weekNumber}_min`];
      const max = params.data[`${weekText}_${weekNumber}_max`];

      if (subColId === 'min') {
        const maxInt = parseInt(max);

        if (newValueInt > maxInt) {
          displaySnackMessages(MIN_GREATER_THAN_MAX, 'error');

          return;
        }
      } else if (subColId === 'max') {
        const minInt = parseInt(min);

        if (newValueInt < minInt) {
          displaySnackMessages(MAX_LESS_THAN_MIN, 'error');

          return;
        }
      }

      setEditedStoreWeekRows((oldEditedRows) => {
        const newEditedRows = [...oldEditedRows];
        const foundRow = newEditedRows.find(
          (row) =>
            row.product_code === product_code &&
            row.channel === channel &&
            row.store_code === store_code
        );

        if (foundRow) {
          const foundWeekObj = foundRow.fiscal_year_weeks.find(weekObj => weekObj.fiscal_year_week === weekNumber);

          if (foundWeekObj) {
            foundWeekObj[subColId] = newValueInt;
          } else {
            foundRow.fiscal_year_weeks.push({
              fiscal_year_week: weekNumber,
              [subColId]: newValueInt,
            });
          }
        } else {
          newEditedRows.push({
            product_code,
            channel,
            store_code,
            fiscal_year_weeks: [
              {
                fiscal_year_week: weekNumber,
                [subColId]: newValueInt,
              },
            ],
          });
        }

        return newEditedRows;
      });

      return;
    }
  };

  const onSetAllApply = async (rows, params) => {
    if (Object.keys(rows).length < 1) {
      displaySnackMessages("There is no change to save", "info");
      throw "Enter data in fields";
    }
    if (
      rows.max_store &&
      rows.min_store &&
      Number(rows.min_store) > Number(rows.max_store)
    ) {
      displaySnackMessages("Max should be greater than min", "info");
      throw "Please change the data";
    }
    if (rows.max_store < 0 || rows.min_store < 0 || rows.wos < 0) {
      displaySnackMessages("value cannot be negative", "info");
      throw "Please change the data";
    }
    try {
      setShowloading(true);
      let tableCheckConfig = params?.api?.checkConfiguration;
      let checkAll = tableInstance?.api?.checkConfiguration
        ? getObjectsAfterCheckAll(tableInstance?.api?.checkConfiguration)
            ?.length
        : tableCheckConfig.length &&
          (tableCheckConfig[tableCheckConfig.length - 2]?.checkAll ||
            tableCheckConfig[tableCheckConfig.length - 3]?.checkAll ||
            false);
      if (checkAll) {
        let reqBody = {
          filters: getFilterPayload(),
          meta: storeFilterBody,
          values: {
            min: rows.min_store ? Number(rows.min_store) : null,
            wos: rows.wos ? Number(rows.wos) : null,
            max: rows.max_store ? Number(rows.max_store) : null,
          },
        };

        if (
          dynamicLabelsBasedOnTenant("article") === "SKU" ||
          dynamicLabelsBasedOnTenant("article") === "Material" ||
          dynamicLabelsBasedOnTenant("constraint") === "SetAll"
        ) {
          let skuCountResponse = await props.fetchSetAllSKUCount(reqBody);
          setJobId(skuCountResponse.data?.data?.job_id);
          setDisplaySetAllSKUCount(skuCountResponse.data?.data?.sku_count);
          setDisplaySetAllRecordCount(
            skuCountResponse.data?.data?.record_count
          );
          setShowloading(false);
          // open a popup
          setConfirmSetAll(true);
          saveSetAllPayload({ body: reqBody, type: checkAll });
        } else {
          setJobId("");
          setDisplaySetAllSKUCount(0);
          setDisplaySetAllRecordCount("");
          callSetAllApi(reqBody, checkAll);
        }
      } else {
        let reqBody = params.api.getSelectedNodes().map((item) => {
          let row = item.data;
          return {
            product_code: row.product_code,
            min: rows.min_store ? Number(rows.min_store) : row.min_store,
            wos: rows.wos ? Number(rows.wos) : row.wos,
            max: rows.max_store ? Number(rows.max_store) : row.max_store,
            stores: [row.store_code],
          };
        });
        if (dynamicLabelsBasedOnTenant("article") === "SKU") {
          let skuCountValue = [
            ...new Set(
              params.api.getSelectedNodes().map((item) => item?.data?.article)
            ),
          ];
          setJobId("");
          setDisplaySetAllSKUCount(skuCountValue?.length);
          setShowloading(false);
          setDisplaySetAllRecordCount(params.api.getSelectedNodes()?.length);

          // open a popup
          setConfirmSetAll(true);
          saveSetAllPayload({
            body: reqBody,
            type: checkAll,
            inputValues: rows,
          });
        } else {
          setJobId("");
          setDisplaySetAllSKUCount(0);
          setDisplaySetAllRecordCount("");
          callSetAllApi(reqBody, checkAll);
        }
      }
    } catch (err) {
      setShowloading(false);
      displaySnackMessages("Error while saving", "error");
    }
  };

  const callSetAllTimeBasedApi = async (reqBody, selectAllCheck) => {
    try {
      setShowloading(true);
      if (
        dynamicLabelsBasedOnTenant("article") === "Material" ||
        dynamicLabelsBasedOnTenant("constraint") === "SetAll"
      ) {
        await props.setAllTableData({ body: reqBody, jobIdCheck: saveJobId });
      } else {
        await props.setAllTableData(
          { body: reqBody, jobIdCheck: saveJobId },
          dimension === STORE_WEEK_ID
            ? "constraint-time-based-wk"
            : "constraint-time-based"
        );
      }

      setShowloading(false);
      setConfirmSetAll(false);
      displaySnackMessages(
        "Saved request is running in background. Please refresh the table once a notification is received",
        "info"
      );
    } catch (err) {
      setShowloading(false);
      displaySnackMessages("Error while saving", "error");
    }
  };

  const checkFlagEdit = () => {
    if (dimension === "store_grade") {
      return editedStoreGradeRows.some(
        (item) =>
          item.store_grade === clickedRowData.store_grade &&
          item.product_code === clickedRowData.product_code
      );
    }
    if (dimension === "store_group") {
      return editedStoreGroupRows.some(
        (item) =>
          item.store_group_name === clickedRowData.store_group_name &&
          item.product_code === clickedRowData.product_code
      );
    }
  };

  const setAggregateBody = (params) => {
    return {
      filters: filterDependencies.current,
      product_code: params.parentNode.data.product_code,
      article: params.parentNode.data.article,
    };
  };
  const getStoreGradeSubRowsRequest = async (params) => {
    let currentPage = params.api.paginationGetCurrentPage();
    let reqBody = setAggregateBody(params);
    let { data } = await props.getStoreGradeAggregateData(reqBody);
    let filterApplied = params.api.getFilterModel();
    if (Object.keys(filterApplied).length > 0) {
      data.data = data.data.map((item) => {
        Object.keys(filterApplied).forEach((key) => {
          item[key] = params.parentNode.data[key];
        });

        return item;
      });
    }
    if (data.data.length === 0) {
      params.api.paginationGoToPage(currentPage);
    } else {
      return {
        data: data.data?.length > 0 ? data.data : [{}],
        totalCount: data.data?.length || 1,
      };
    }
  };
  const getStoreGroupSubRowsRequest = async (params) => {
    let currentPage = params.api.paginationGetCurrentPage();
    let reqBody = setAggregateBody(params);
    reqBody.application_code = 1;
    let { data } = await props.getStoreGroupAggregateData(reqBody);
    let filterApplied = params.api.getFilterModel();
    if (Object.keys(filterApplied).length > 0) {
      data.data = data.data.map((item) => {
        Object.keys(filterApplied).forEach((key) => {
          item[key] = params.parentNode.data[key];
        });
        return item;
      });
    }
    if (data.data.length === 0) {
      params.api.paginationGoToPage(currentPage);
    } else {
      return {
        data: data.data?.length > 0 ? data.data : [{}],
        totalCount: data.data?.length || 1,
      };
    }
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };
  const callSetAllApi = async (reqBody, selectAllCheck) => {
    try {
      if (selectAllCheck) {
        setShowloading(true);
        await props.setAllTableData({ body: reqBody, jobIdCheck: saveJobId });
        showEmptyRows.current = { showEmptyRows: true };
        setShowloading(false);
        setConfirmSetAll(false);
        tableInstance.api.deselectAll(true);
        // tableInstance.api.refreshServerSideStore({ purge: true });
        displaySnackMessages(
          "Saved request is running in background. Please refresh the table once a notification is received",
          "info"
        );
      } else {
        setShowloading(true);
        await props.saveStoreTableData({ data: reqBody });
        setShowloading(false);
        setConfirmSetAll(false);
        tableInstance.api.deselectAll(true);
        tableInstance.api.refreshServerSideStore({ purge: true });
        displaySnackMessages("Data saved successfully", "success");
      }
    } catch (err) {
      setShowloading(false);
      displaySnackMessages("Error while saving", "error");
    }
  };
  const downloadTableData = async () => {
    const payload = {
      ...req,
      filters: filterDependencies?.current,
      application_code: 1,
    };
    let api;

    if (dimension === "store") {
      if (tpc_store_week) {
        api = props.downloadStoreCustomConstraintsData;

        payload.filters = removeWeekMinMaxWosFilters(payload.filters);
      } else {
        api = props.downloadStoreConstraintsData;
      }
    } else if (dimension === "store_grade") {
      api = props.downloadStoreGradeConstraintsData;
    } else if (dimension === "store_group") {
      api = api = props.downloadStoreGroupConstraintsData;
    } else if (dimension === STORE_WEEK_ID) {
      api = props.downloadStoreWeekConstraintsData;
    }

    await api(payload);
  };
  const onStoreDateCellValueChanged = (params) => {
    if (
      tpc_store_week &&
      (dimension === STORE_ID || dimension === STORE_WEEK_ID)
    ) {
      const {
        column: { colId },
        data: {
          product_code,
          channel,
          store_code,
          stores: [{ min_store, max_store, wos }],
        },
        newValue,
      } = params;
      if (newValue == "" || newValue == " ") {
        newValue = 0;
      }

      if (!INT_REGEX.test(newValue)) {
        displaySnackMessages(NON_NEGATIVE_ERROR, "error");

        return;
      }

      const newValueKey = COL_ID_KEY_MAP[colId];
      const newValueInt = parseInt(newValue);

      if (newValueKey === "min") {
        const maxInt = parseInt(max_store);

        if (newValueInt > maxInt) {
          displaySnackMessages(MIN_GREATER_THAN_MAX, "error");

          return;
        }
      } else if (newValueKey === "max") {
        const minInt = parseInt(min_store);

        if (newValueInt < minInt) {
          displaySnackMessages(MAX_LESS_THAN_MIN, "error");

          return;
        }
      }

      setEditedRows((oldEditedRows) => {
        const newEditedRows = [...oldEditedRows];
        const foundRow = newEditedRows.find(
          (row) =>
            row.product_code === product_code &&
            row.channel === channel &&
            row.stores[0].store_code === store_code
        );

        if (foundRow) {
          foundRow.stores[0][newValueKey] = newValueInt;
        } else {
          newEditedRows.push({
            product_code,
            channel,
            stores: [
              {
                store_code,
                [newValueKey]: newValueInt,
                action: "update",
              },
            ],
          });
        }

        return newEditedRows;
      });

      return;
    }

    if (
      params.column.colId === "start_date" ||
      params.column.colId === "end_date"
    ) {
      try {
        let value = moment(params.newValue).format("YYYY-MM-DD");
        params.data[params.column.colId] = value;
        if (
          params.data.start_date &&
          params.data.end_date &&
          params.data.start_date !== "Invalid date"
        ) {
          let validateDate = dateValidation(
            params.data.start_date,
            params.data.end_date
          );
          if (params.data.start_date === params.data.end_date) {
            validateDate = false;
            displaySnackMessages(
              "Start date and end date can not be the same. Please enter other dates",
              "error"
            );
          }
          if (validateDate) {
            onTimebasedCellValueChanged(params);
          } else {
            if (params.column.colId === "end_date") {
              params.node.setDataValue(params.column.colId, "2050-12-31");
            } else {
              params.node.setDataValue(params.column.colId, "");
            }
          }
        } else {
          onTimebasedCellValueChanged(params);
        }
      } catch (err) { }
    }
    return {};
  };
  const openConfirmationPopUp = () => {
    // const setInputValuesText = () => {
    //   if (Array.isArray(setAllPayload.body)) {
    //     return ` Input Values are min : ${
    //       setAllPayload?.inputValues?.min_store
    //         ? setAllPayload?.inputValues.min_store
    //         : "none"
    //     } ,
    //     max : ${
    //       setAllPayload?.inputValues?.max_store
    //         ? setAllPayload?.inputValues?.max_store
    //         : "none"
    //     } and wos :${
    //       setAllPayload?.inputValues?.wos
    //         ? setAllPayload?.inputValues?.wos
    //         : "none"
    //     } `;
    //   } else {
    //     return ` Input Values are min : ${
    //       setAllPayload?.body?.values?.min
    //         ? setAllPayload?.body?.values?.min
    //         : "none"
    //     } ,
    //   max : ${
    //     setAllPayload?.body?.values?.max
    //       ? setAllPayload?.body?.values?.max
    //       : "none"
    //   } and wos :${
    //       setAllPayload?.body?.values?.wos
    //         ? setAllPayload?.body?.values?.wos
    //         : "none"
    //     } `;
    //   }
    // };
    const tenantArticle = dynamicLabelsBasedOnTenant("article");
    const isRecordCountWithinLimit = tpc_store_week
      ? true
      : Number(displaySetAllRecordCount) <= maxRecordCountForSetAll;
    let inputValuesText = "";

    if (tpc_store_week) {
      const {
        body: { filters, values },
      } = setAllPayload;
      const { min_stock, max_stock, wos } = values?.[0] ?? {};
      const weekFilterObj = filters?.find(
        (filterObj) => filterObj.filter_id === FISCAL_YEAR_WEEK_ID
      );
      const filterSelectedWeekOptions = weekFilterObj
        ? props.next31Weeks.filter((weekObj) =>
          weekFilterObj.values.includes(weekObj.value.toString())
        )
        : [];
      const weeks = filterSelectedWeekOptions
        .map((option) => option.value)
        .join(", ");
      const weeksStr =
        dimension === STORE_WEEK_ID ? ` for weeks : ${weeks}` : "";

      inputValuesText = ` Input values are min: ${min_stock ?? "none"}, max: ${
        max_stock ?? "none"
      } and wos: ${wos ?? "none"}${weeksStr}.`;
    }

    return (
      <Dialog
        open={confirmSetAll}
        onClose={() => setConfirmSetAll(false)}
        maxWidth="sm"
        fullWidth={true}
      >
        <DialogTitle>Confirm Set All</DialogTitle>
        <LoadingOverlay loader={showloading}>
          <DialogContent>
            {isRecordCountWithinLimit ? (
              <Typography variant="h6">
                Set All operation is being applied for {displaySetAllSKUCount}{" "}
                number of{" "}
                {dynamicLabelsBasedOnTenant("article") === "Material"
                  ? "Material/Material's"
                  : tenantArticle
                  ? `${tenantArticle}/${tenantArticle}'s `
                  : "SKU/SKU's"}{" "}
                {displaySetAllRecordCount &&
                  `and ${displaySetAllRecordCount} number of`}{" "}
                {dynamicLabelsBasedOnTenant("article") === "Material"
                  ? "Material-Store"
                  : tenantArticle
                  ? `${tenantArticle}-Store`
                  : "SKU-Store"}{" "}
                combinations.{inputValuesText} Please confirm to proceed.
              </Typography>
            ) : (
              <Typography variant="h6">
                Record Count is more than {maxRecordCountForSetAll}. Please add
                some more filters
              </Typography>
            )}
          </DialogContent>
        </LoadingOverlay>
        <DialogActions>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setConfirmSetAll(false)}
          >
            Cancel
          </Button>
          {isRecordCountWithinLimit && (
            <Button
              variant="contained"
              color="primary"
              onClick={() =>
                callSetAllTimeBasedApi(setAllPayload.body, setAllPayload.type)
              }
            >
              Ok
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  };

  const openWarningPopUp = () => {
    return (
      <Dialog
        open={showWarningAlert}
        onClose={() => updateWarningAlert(false)}
        maxWidth="sm"
        fullWidth={true}
      >
        <DialogTitle>Alert</DialogTitle>
        <LoadingOverlay loader={showloading}>
          <DialogContent>
            <Typography variant="h6">
              ! Constraints values for stores within modified store tier/s will
              be replaced per updated constraints values for all the timeframes.
              Please confirm to proceed.
            </Typography>
          </DialogContent>
        </LoadingOverlay>
        <DialogActions>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => updateWarningAlert(false)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => onSaveRequest()}
          >
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const attachCallBacks = (callback) => {
    validationHandler.current = { validate: callback };
  };

  const handleUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await props.uploadConstraintsFile(formData);
      props.addSnack({
        message:
          res.message || "Please wait for notification to be received shortly",
        options: {
          variant: "success",
        },
      });
      setIsModalOpen(false);
    } catch (error) {
      if (error.response?.data?.data?.length) {
        validationHandler.current.validate(error.response?.data?.data);
      } else {
        props.addSnack({
          message: error?.data?.message || "Something went wrong.",
          options: {
            variant: "error",
          },
        });
        validationHandler.current.validate([]);
      }
    }
  };

  const checkDownloadDisable = () => {
    if (dimension === "store") {
      return isStoreDownloadDisabled;
    } else if (dimension === "store_group") {
      return isStoreGroupDownloadDisabled;
    } else if (dimension === "store_grade") {
      return isStoreGradeDownloadDisabled;
    } else if (dimension === STORE_WEEK_ID) {
      return isStoreWeekDownloadDisabled;
    }
  };
  const checkDownloadRemove = () => {
    if (props.inventorysmartScreenConfig?.constraints_download) {
      if (tabsWithDownloadHidden.includes(dimension)) {
        return false;
      }

      if (dimension === "store_grade" && timeBasedColumns.current) {
        return false;
      }
      return true;
    }
  };

  /**
   *
   * @param {array} constant
   * @param {number} index
   * @returns updated upload message based on the tenant config condition.
   */
  const fetchUpdatedConst = (constant, index) => {
    constant[
      index
    ] = `Min Constraints, Max Constraints and WOS values should be non-negative integers. ${props.inventorysmartScreenConfig?.hideNegativeMsgForConstraintsUpload
      ? ""
      : "(A value of -1 is permissible for the Min Constraints)"
    }`;
    return [...constant];
  };

  return (
    <div className={classes.paddingContent}>
      <CustomAccordion label="Store Data" defaultExpanded={true}>
        <LoadingOverlay loader={showloading}>
          {viewBy.length > 0 && (
            <div className={classes.constraintsToolbar}>
              <Grid
                className={classes.radioBtnsHeader}
                container
                direction="row"
                alignItems="center"
              >
                <span>View By : </span>
                <RadioGroup
                  row
                  aria-label="gender"
                  name="controlled-radio-buttons-group"
                  value={dimension}
                  onChange={dimensionHandleChange}
                >
                  {viewBy.map((item) => {
                    const isTabIgnored =
                      props.isRedirectedFromDifferentPage &&
                      tabsIgnoredOnRedirect.includes(item.value);

                    return (
                      <FormControlLabel
                        value={item.value}
                        control={<Radio color="primary" />}
                        label={item.label}
                        disabled={isTabIgnored}
                      />
                    );
                  })}
                </RadioGroup>
              </Grid>
              {props.inventorysmartScreenConfig?.constraints_upload && (
                <div className={classes.storeDownloadButton}>
                  <IAButton
                    variant="primary"
                    id="uploadConstraints"
                    onClick={() => setIsModalOpen(true)}
                    icon={FileUploadIcon}
                  />
                  <UploadHandler
                    handleUpload={handleUpload}
                    isModalOpen={isModalOpen}
                    setIsModalOpen={setIsModalOpen}
                    attachCallBacks={attachCallBacks}
                    jsonUpload={false}
                    macroIdPath={"constraints_upload_vba_template"}
                    uploadInstructions={[
                      ...CONSTRAINTS_FILE_UPLOAD_INSTRUCTIONS,
                    ]}
                  />
                </div>
              )}
              {checkDownloadRemove() && (
                <div className={classes.storeDownloadButton}>
                  <DownloadReport
                    downloadUrl={downloadTableData}
                    requestBody={req}
                    columns={finalColumn}
                    disable={checkDownloadDisable()}
                    isCustomDownloadCheckRequired={true}
                    customDownloadCheckAPI={props.constraintsCheckDownload}
                    maxRecordCountForDownload={maxRecordCountForDownload}
                    downloadLimitExceedErrMsg={downloadLimitExceedErrMsg}
                  />
                </div>
              )}
              {STORE_STORE_WEEK_IDS.includes(dimension) && (
                <div>
                  <Button
                    onClick={setAllRequest}
                    color="primary"
                    variant="contained"
                    disabled={
                      !canTakeActionOnModules(
                        INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_CONSTRAINTS,
                        "edit"
                      ) ||
                      (dimension === STORE_ID &&
                        isTableDataBeingFetched[STORE_ID]) ||
                      (dimension === STORE_WEEK_ID &&
                        isTableDataBeingFetched[STORE_WEEK_ID])
                    }
                  >
                    Set All
                  </Button>
                </div>
              )}
            </div>
          )}
          {setAll && (
            <SetallMultirowForm
              updateDefaultValue={false}
              setDefaultDateFieldValues={true}
              onApply={onNewSetAllApply}
              fieldList={editableSetAllFields}
              handleModalClose={() => toggleSetAll(false)}
              formatMultiRowData={formatSetAllData}
              checkdateValidation={true}
              additionalBodyContainer={
                <Typography variant="h6">
                  ! Once Set All operation is performed, existing time period
                  and constraint values for all selected sku-store combinations
                  will be replaced by new values.
                </Typography>
              }
              maxFieldsInRow={maxFieldsInRow}
              isMultipleStatus={!isSetAllSingleRow}
            />
          )}
          {finalColumn.length > 0 && (
            <Table
              columns={finalColumn}
              loadTableInstance={setNewTableInstance}
              dimension={dimension}
              manualCallBackStore={manualCallBackStore}
              manualCallBackStoreGrade={manualCallBackStoreGrade}
              manualCallBackStoreGroup={manualCallBackStoreGroup}
              manualCallBackStoreWeek={manualCallBackStoreWeek}
              onBlur={onBlur}
              onCellValueChanged={onStoreDateCellValueChanged}
              onStoreWeekCellValueChanged={onStoreWeekCellValueChanged}
              onSetAllApply={onSetAllApply}
              getStoreGradeSubRowsRequest={getStoreGradeSubRowsRequest}
              getStoreGroupSubRowsRequest={getStoreGroupSubRowsRequest}
              inventorysmartModulesPermission={
                props.inventorysmartModulesPermission
                  ?.inventorysmart_constraints
              }
            />
          )}
          {showStoreModalTable && (
            <StoreModalTable
              formvalues={clickedRowData}
              displaySnackMessages={displaySnackMessages}
              onCancel={modalClose}
              flagEdit={checkFlagEdit()}
              canTakeActionOnModules={canTakeActionOnModules}
            />
          )}
          {confirmSetAll && openConfirmationPopUp()}
          {showWarningAlert && openWarningPopUp()}
          <div className={classes.footer}>
            <Button
              onClick={() => {
                if (dimension === "store_grade" && timeBasedColumns.current) {
                  updateWarningAlert(true);
                } else {
                  onSaveRequest();
                }
              }}
              color="primary"
              variant="contained"
              disabled={
                !canTakeActionOnModules(
                  INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_CONSTRAINTS,
                  "create"
                )
              }
            >
              Apply
            </Button>
          </div>
        </LoadingOverlay>
      </CustomAccordion>
      <Prompt
        isOpen={showRecordLimitationWarning}
        title={"Record limitation exceeded"}
        subHeading={`There are more than ${Math.floor(
          maxSetAllRecordCount / 1000
        )}k records selected. Please add some more filters`}
        infoList={[]}
        primaryButtonProps={{
          children: "Ok",
          onClick: () => {
            setShowRecordLimitationWarning(false);
          },
        }}
        variant="warning"
      />
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedConstraintArticles:
      store.inventorysmartReducer.inventorySmartConstraints
        .selectedConstraintArticles,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
    selectedStoreCodes:
      store.inventorysmartReducer.inventorySmartConstraints.selectedStoreCodes,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    popUpLinkFromDashbaord:
      store.inventorysmartReducer.inventorySmartConstraints
        .popUpLinkFromDashbaord,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  setConstraintsLoader: (payload) => dispatch(setConstraintsLoader(payload)),
  getColumnsAg: (payload) => dispatch(getColumnsAg(payload)),
  getStoreTableData: (dimension, payload) =>
    dispatch(getStoreTableData(dimension, payload)),
  getStoreCustomTableData: (payload) =>
    dispatch(getStoreCustomTableData(payload)),
  getStoreGradeTableData: (payload) =>
    dispatch(getStoreGradeTableData(payload)),
  getStoreGroupTableData: (payload) =>
    dispatch(getStoreGroupTableData(payload)),
  setAllTableData: (payload, screen) =>
    dispatch(setAllTableData(payload, screen)),
  saveStoreTableData: (payload, type) =>
    dispatch(saveStoreTableData(payload, type)),
  saveStoreWeekTableData: (payload, type) =>
    dispatch(saveStoreWeekTableData(payload, type)),
  getStoreGradeAggregateData: (payload) =>
    dispatch(getStoreGradeAggregateData(payload)),
  getStoreGroupAggregateData: (payload) =>
    dispatch(getStoreGroupAggregateData(payload)),
  downloadStoreConstraintsData: (payload) =>
    dispatch(downloadStoreConstraintsData(payload)),
  downloadStoreCustomConstraintsData: (payload) =>
    dispatch(downloadStoreCustomConstraintsData(payload)),
  downloadStoreGradeConstraintsData: (payload) =>
    dispatch(downloadStoreGradeConstraintsData(payload)),
  downloadStoreGroupConstraintsData: (payload) =>
    dispatch(downloadStoreGroupConstraintsData(payload)),
  downloadStoreWeekConstraintsData: (payload) =>
    dispatch(downloadStoreWeekConstraintsData(payload)),
  fetchSetAllSKUCount: (payload, screen) =>
    dispatch(fetchSetAllSKUCount(payload, screen)),
  fetchSetAllStoreWeekRecordCount: (payload) =>
    dispatch(fetchSetAllStoreWeekRecordCount(payload)),
  uploadConstraintsFile: (payload) => dispatch(uploadConstraintsFile(payload)),
  constraintsCheckDownload: (payload) =>
    dispatch(constraintsCheckDownload(payload)),
  getStoreWeekTableData: (dimension, payload) =>
    dispatch(getStoreWeekTableData(dimension, payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ConstraintsTables);
