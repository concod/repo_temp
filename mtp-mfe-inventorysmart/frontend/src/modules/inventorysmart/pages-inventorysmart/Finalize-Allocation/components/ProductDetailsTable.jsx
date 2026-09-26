import { addSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  downloadMasterProductStoreSizeView,
  getProductView,
  setProductViewLoader,
  setStoreDetailsTableData,
} from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import {
  getStoreView,
  setSelectedArtilces,
  finalizeSaveEditsBasedOnSession,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import React, { useEffect, useState, useRef, useContext, useMemo } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import IA_DOWNLOAD from "coreAssets/IA_DOWNLOAD.svg";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { Button, Tooltip } from "impact-ui-v3";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import {
  getIgnoreAllocationCode,
  getScenarioStyleIds,
} from "../../Create-Allocation/helperFunctions";
import InvalidAllocation from "./InvalidAllocation";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";
import { isEmpty, cloneDeep } from "lodash";
import { CREATE_SCENARIO } from "../../../constants-inventorysmart/routesConstants";
import { setFetchArticleSummary } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { setFetchProductDetails } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { setFetchProductStoreDetails } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import ProductStoreDetailsTable from "./ProductStoreDetailsTable";
import { finalizeAllocationContext } from "../index";
import AiSmartFilterButton from "../../Decision-Dashboard/components/AiSmartFilterButton";
import AiSmartFilterChips from "../../Decision-Dashboard/components/AiSmartFilterChips";
import useAiSmartFilterChips from "../../Decision-Dashboard/components/useAiSmartFilterChips";
import { AI_SMART_FILTER_CNA_PRODUCT_VIEW } from "../../Decision-Dashboard/components/aiSmartFilterDummyConstants";
import NewAllocatedUnitsSetAllModalComponent from "../higher-level-edit-components/NewAllocatedUnitsSetAllModal";
import {
  fetchMinPackAndEachesValue,
} from "../../inventorysmart-utility";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import {
  ORDER_BATCHING_NEW_VALUE_GREATER_THAN_OLD_VALUE_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  buildSaveRowEditsPayload,
  handleSaveEditsAPI,
  getAllocationUpdates,
} from "../utils/editApiUtils";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { getNearestDay } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import globalStyles from "core/Styles/globalStyles";
import { applyAbsentKeyHyphen } from "../utils/columnUtils";

const ProductDetailsTable = (props) => {
  const classes = useStyles();
  const navigate = useNavigate();
  const globalClasses = globalStyles();
  const flowType = new URLSearchParams(window.location.search).get("flow");

  const {
    selectedOption,
    setSelectedOption,
    sessionId,
    setSessionId,
    toggleUpdateResponse,
    renderToggleSummary
  } = useContext(finalizeAllocationContext);

  const [productDetailsTableColumns, setProductDetailsTableColumns] = useState(
    []
  );
  const [productDetailsTableColumnsCopy, setProductDetailsTableColumnsCopy] = useState(
    []
  );
  const [productDetailsTableData, setProductDetailsTableData] = useState([]);
  const [productDetailsTableDataCopy, setProductDetailsTableDataCopy] = useState([]);
  const originalProductDetailsTableDataRef = useRef([]); // Store original data for comparison
  const [productViewResposne, setProductViewResposne] = useState({});
  const [
    downloadFormatChipsDependency,
    setDownloadFormatChipsDependency,
  ] = useState({});
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState(null); // New state
  const productDetailsTableInstance = useRef(null);
  const aiChips = useAiSmartFilterChips();
  const [enableProductDetailsTableEditing, setEnableProductDetailsTableEditing] = useState(false);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const dcOptionsInSetAll = useRef([]);
  const [minPackAndEaches, setMinPackAndEaches] = useState({
    minPack: 0,
    minEaches: 0,
  });
  const [dynamicSetAllColumns, setDynamicSetAllColumns] = useState([]);
  const [showProductDetailsSetAllModal, setShowProductDetailsSetAllModal] = useState(false);
  const [updatedProductSummaryRowEdits, setUpdatedProductSummaryRowEdits] = useState([]);
  const [disabledEditDuetoChildEdit, setDisableEditDuetoChildEdit] = useState(false);
  const updatedProductSummaryRowEditsRef = useRef([]);
  // Reference to the ExpandableDetails component
  const expandableDetailsRef = useRef(null);
  const availableproductStoreDetailsTableInstance = useRef(null);

  const articleKey = dynamicLabelsBasedOnTenant("store_code");

  const productDetailsTableHeader = useMemo(() => {
    const isStoreView = props.tab === "store_view";
    if (props.ProductDetailsTableHeader) {
      return isStoreView
        ? `Store-${props.ProductDetailsTableHeader} Details`
        : props.ProductDetailsTableHeader + " Details";
    }
    return isStoreView ? "Store-Product Details" : "Product Details";
  }, [props.ProductDetailsTableHeader, props.tab]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        disableOnClose: true,
      },
    });
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

  const getProductDetailsData = async () => {
    let columns = [],
      data = [];
    try {
      props.setProductViewLoader(true);
      let l_response = await props.getProductView(
        {
          // to update allocationCode with edit_value
          allocation_code: props.allocationCode,
          article: props.articles || [],
          ignore_allocation_code: getIgnoreAllocationCode(
            props.originalAllocationCode,
            props.allocationCode
          ),
          plan_status: props.planStatus,
          plan_type: props.planType,
          ...(props.selectedStores && { store_code: props.selectedStores }),
        },
        props.isV3?.includes("productDetails")
      );
      if (l_response.data.status) {
        let l_responseData = l_response.data.data;
        columns = l_responseData.table_config;
        data = l_responseData.table_data;  
        setProductViewResposne(l_response.data);
        dcOptionsInSetAll.current = l_responseData?.dc_dict;
      }
    } catch (e) {
      const errObj = e?.response?.data;
      if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
      else displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setProductViewLoader(false);
      let formattedColumns = agGridColumnFormatter(
        columns,
        null,
        props.actionMap
      );
      // Show "-" for cells whose key is completely absent from row data.
      applyAbsentKeyHyphen(formattedColumns);

      // fetch editable keys here and ensure they start as non-editable
      let dynamicEditableColumns = formattedColumns.filter(
        (item) => item.column_name === "hle_allocated_pack_qty"
      );
      let dynamicPacksAndEachesKeyColumns = [];
      dynamicEditableColumns.forEach((item) => {
        item?.sub_headers?.forEach((subItem) => {
          subItem?.sub_headers?.forEach((subItem2) => {
            const dcOption = dcOptionsInSetAll.current?.find(dc => replaceSpecialCharacter(dc.label) === subItem.label);
            const columnInfo = {
              column_name: subItem2.column_name,
              columnLabel: subItem.label + (subItem2.column_name.includes('packs') ? ' - Packs' : ' - Eaches'),
              dc_code: dcOption?.value || dcOption?.dc_code
            };
            dynamicPacksAndEachesKeyColumns.push(columnInfo);
            // Ensure these columns start as non-editable by default
            subItem2.is_editable = false;
            subItem2.cellRenderer = null;
          });
        });
      });
      setDynamicSetAllColumns(dynamicPacksAndEachesKeyColumns);

      let gridCols = JSON.parse(JSON.stringify(formattedColumns));
      const grid_table = gridCols
        .filter((item) => item.column_name === "hle_allocated_pack_qty")
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
      
      setProductDetailsTableColumns(formattedColumns);
      setProductDetailsTableColumnsCopy(grid_table);
      setProductDetailsTableData(data);
      let l_sizes = data[0]?.size;
        // Process data with proper deep cloning to avoid reference issues
      const processedData = data?.map((val) => {
        return {
          ...val,
          ...getSizes(l_sizes, val, "", "original_"),
        };
      });
      setProductDetailsTableDataCopy(processedData);
      originalProductDetailsTableDataRef.current = cloneDeep(data); // Store original data
    }
  };

  useEffect(() => {
    if (
      props.allocationCode &&
      props.planType &&
      props.fetchProductDetails === null
    ) {
      getProductDetailsData();
    }
  }, [
    props.selectedStores,
    props.planType,
    props.fetchProductDetails,
  ]);

  useEffect(() => {
    if (props.fetchProductDetails) {
      getProductDetailsData()
        .then(() => {
          props.setFetchProductDetails(false);
          props.setFetchProductStoreDetails(true);
        })
        .catch((error) => {
          props.setFetchProductDetails(false);
          props.setFetchProductStoreDetails(true);
        });
    }
  }, [props.fetchProductDetails]);

  useEffect(() => {
    if (!isEmpty(updatedProductSummaryRowEdits))
      updatedProductSummaryRowEditsRef.current = cloneDeep(updatedProductSummaryRowEdits);
  }, [updatedProductSummaryRowEdits]);

  // Reset edit mode state when switching to view mode
  useEffect(() => {
    if (selectedOption === "view") {
      if (enableProductDetailsTableEditing) {
        setEnableProductDetailsTableEditing(false);
        setUpdatedProductSummaryRowEdits([]);
      }
    }
  }, [selectedOption]);

  const saveDeliveryDate = () => {
    // TODO:
    // api integration
  };

  const onCellValueChanged = (params) => {
    const { data, newValue, column } = params;
    let oldValue = originalProductDetailsTableDataRef.current.find(
        (item) => item.article === data.article
      )?.[column.colId];
      if(newValue < oldValue) {
        updateEditedRowState(data);
      }
  };

  const updateEditedRowState = (data) => {
    let cloneRefInstance = cloneDeep(updatedProductSummaryRowEditsRef.current);
    const existingIndex = cloneRefInstance.findIndex(
      (obj) => obj.article === data.article
    );
    if (existingIndex !== -1) {
      // Replace the existing object with the new object
      cloneRefInstance[existingIndex] = data;
      setUpdatedProductSummaryRowEdits(cloneRefInstance);
    } else {
      // Push the new object to the state
      setUpdatedProductSummaryRowEdits((prevState) => [...prevState, data]);
    }
  };

  const onBlur = (e, data, column, isChanged, value, initialValue) => {
    
    // Check if this is an editable allocation column (eaches or packs)
    const isAllocationColumn = column.colId.includes('_eaches') || column.colId.includes('_packs');
    
    if (isAllocationColumn && isChanged) {
      let oldValue = originalProductDetailsTableDataRef.current.find(
        (item) => item.article === data.article
      )?.[column.colId];
      // Use initialValue which is the original value when editing started      
      if (value > oldValue) {
        displaySnackMessages(
          ORDER_BATCHING_NEW_VALUE_GREATER_THAN_OLD_VALUE_MESSAGE,
          "warning"
        );
        data[column.colId] = oldValue;
      } else {
        data[column.colId] = value;
        // Only mark as changed if the value actually differs from the original
        if (value !== oldValue) {
          updateEditedRowState(data);
        }
      }
      
      productDetailsTableInstance.current?.api?.refreshCells({
        columns: [column.colId],
      });
    }
  };

  const setProductDetailsTableEditing = () => {
    setEnableProductDetailsTableEditing(true);
    showEditValuesModal(true);
  };

  const disableProductDetailsTableEditing = () => {
    setEnableProductDetailsTableEditing(false);
    showEditValuesModal(false);
    setUpdatedProductSummaryRowEdits([]);
    // Reset table data to original data without API call
    setProductDetailsTableData(cloneDeep(originalProductDetailsTableDataRef.current));
  };

  const showEditValuesModal = (showEdits) => {
    let newCol = productDetailsTableColumns.map((column) => {
      if (column.sub_headers && column.sub_headers.length > 0) {
        column.sub_headers.forEach((subHeader) => {
          if (subHeader.sub_headers && subHeader.sub_headers.length > 0) {
            subHeader.sub_headers.forEach((subSubHeader) => {
              const columnExists = dynamicSetAllColumns.some(col => col.column_name === subSubHeader.column_name);
              if (columnExists) {
                subSubHeader.is_editable = showEdits;
                if (showEdits) {
                  subSubHeader.cellRenderer = (params, extraProps) => {
                    if (
                      !params.data ||
                      !Object.prototype.hasOwnProperty.call(
                        params.data,
                        subSubHeader.column_name
                      )
                    ) {
                      return "-";
                    }
                    return (
                      <CellRenderers
                        cellData={params}
                        column={subSubHeader}
                        extraProps={extraProps}
                        actions={null}
                      ></CellRenderers>
                    );
                  };
                } else {
                  subSubHeader.cellRenderer = null;
                }
              }
            });
          } else {
            const columnExists = dynamicSetAllColumns.some(col => col.column_name === subHeader.column_name);
            if (columnExists) {
              subHeader.is_editable = showEdits;
              if (showEdits) {
                subHeader.cellRenderer = (params, extraProps) => {
                  if (
                    !params.data ||
                    !Object.prototype.hasOwnProperty.call(
                      params.data,
                      subHeader.column_name
                    )
                  ) {
                    return "-";
                  }
                  return (
                    <CellRenderers
                      cellData={params}
                      column={subHeader}
                      extraProps={extraProps}
                      actions={null}
                    ></CellRenderers>
                  );
                };
              } else {
                subHeader.cellRenderer = null;
              }
            }
          }
        });
      }
      return column;
    });
    setProductDetailsTableColumns(newCol);
    productDetailsTableInstance.current?.api?.refreshCells({
      force: true,
    });
  };

  const prependData = () => {
    if (!isEmpty(downloadFormatChipsDependency)) {
     
      let customFilters = downloadFormatChipsDependency?.custom;
      customFilters = {...customFilters, value: customFilters.value.map((date)=>{
        return getNearestDay(date.trim())
      })}
      let prependContentReq = prependExtraData({...downloadFormatChipsDependency, custom: customFilters});
      return appendExcelDownloadData(prependContentReq);
    }
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let l_rowData = [];
    productDetailsTableInstance?.current?.api?.forEachNode((node) =>
      l_rowData.push(node?.data)
    );
    let selections = event.api.getSelectedRows();
    setButtonEnabled(selections?.length > 0);
    const minValuesMap = {};
    dcOptionsInSetAll.current?.forEach(item => {
      const minValues = fetchMinPackAndEachesValue(
        selections,
        `hle_allocated_pack_qty__${item.label}__packs`,
        `hle_allocated_pack_qty__${item.label}__eaches` // to see of this will be updated dynamically
      );
      minValuesMap[`min_hle_allocated_pack_qty__${item.label}__packs`] = minValues.minPack;
      minValuesMap[`min_hle_allocated_pack_qty__${item.label}__eaches`] = minValues.minEaches;
    })
    setMinPackAndEaches(minValuesMap);
    
    let articleIds = selections.map((item) => item.article);
    props.setSelectedArtilces(articleIds);
    
    // Debug: Log check configuration when selection changes
  };

  const loadTableInstance = (params) => {
    productDetailsTableInstance.current = params;
  };

  const availableLoadTableInstance = (params) => {
    availableproductStoreDetailsTableInstance.current = params;
    // When grid is initialized, make sure ExpandableDetails gets updated
    if (expandableDetailsRef.current && params?.api) {
        expandableDetailsRef.current.updateData();
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
  const handleMasterSkuStoreDownload = async () => {
    const payload = {
      allocation_code: props.allocationCode,
      article: "",
      ignore_allocation_code: getIgnoreAllocationCode(
        props.originalAllocationCode,
        props.allocationCode
      ),
      plan_status: props.planStatus,
      plan_type: props.planType ? props?.planType : "",
    };
    try {
      const response = await props.downloadMasterProductStoreSizeView(
        payload,
        props.isV3?.includes("productDetails")
      );
      displaySnackMessages(response?.data?.data?.message, "success");
    } catch (err) {
      displaySnackMessages(err, "error");
    }
  };
  const handleCreateScenario = () => {
    let selectedRows = productDetailsTableInstance?.current?.api?.getSelectedRows();
    let articleIds = getScenarioStyleIds(
      selectedRows,
      props.finalizeAllocationConfig
    );
    const scenarioAllocationCode =
      props.originalAllocationCode || props.allocationCode;
    navigate(
      `${CREATE_SCENARIO}?step=0&allocation_code=${scenarioAllocationCode}`,
      {
        state: {
          allocationCode: scenarioAllocationCode,
          articleIds: articleIds,
        },
      }
    );
  };

  const showMasterSkuStoreDownload =
    props?.finalizeAllocationConfig?.showMasterSkuStoreDownload;
  const showSelectAllForProductDetails =
    props?.finalizeAllocationConfig?.showSelectAllForProductDetails;
  const createSceanrio =
    props?.finalizeAllocationConfig?.createSceanrio;

const getTopLeftOptions = () => {
    let options = [];
    if (props.tab === "store_view") {
      options.push( 
        <>
        <div className={classes.dividerLine}></div>
        <span className={classes.titleSubTitle}>Store number:</span>
          <span className={classes.titleSubTitleValue}>
            {props.selectedStores || "N/A"}
          </span>
        </>
      );
    }
  if (props?.finalizeAllocationConfig?.enableSmartFilter) {
    options.push(
      <AiSmartFilterChips
        key="ai-smart-filter-chips"
        chips={aiChips.chips}
        onChipClick={(chip) =>
          aiChips.handleChipClick(chip, applyAiSmartFilterToColumn)
        }
        onChipRemove={(chip) =>
          aiChips.handleChipRemove(chip, applyAiSmartFilterToColumn)
        }
      />
    );
  }
    return options;
  };

  const getTopRightOptions = () => {
    let options = [];

    const isEditDisabled = toggleUpdateResponse?.data?.data?.enable_edit === false 
      || (props.finalizeAllocationConfig.showSizeDetails && disabledEditDuetoChildEdit && !(enableProductDetailsTableEditing || props?.disableEditDueToParentEdit));
    const hoverMessage = !isEditDisabled ? "" : toggleUpdateResponse?.data?.data?.edit_button_hover_msg || "";

    // Only show edit-related buttons if not hiding action buttons
    if (selectedOption === "edit" && !props.hideActionButtons) {
      // Show Set All button only when not in edit mode
      if (!enableProductDetailsTableEditing) {
        options.push(
          <Tooltip title={hoverMessage} orientation="top" variant="secondary">
            <Button
              size="large"
              type="default"
              variant="tertiary"
              id="update-product-details-set-all-button"
              disabled={!buttonEnabled || isEditDisabled}
              onClick={() => setShowProductDetailsSetAllModal(true)}
            >
              Set All
            </Button>
          </Tooltip>,
          <div className="divider-line"></div>
        );
      }
      
      // Show Cancel and Update buttons when in edit mode
      if (enableProductDetailsTableEditing) {
        options.push(
          <Button
            size="large"
            type="default"
            variant={props.finalizeAllocationConfig.showSizeDetails ? "secondary" :"text"}
            id="cancel-product-details-button"
            onClick={() => disableProductDetailsTableEditing()}
          >
            {props.finalizeAllocationConfig.showSizeDetails ? "Edit" : "Cancel"}
          </Button>,
          <Button
            variant="primary"
            size="large"
            type="default"
            disabled={updatedProductSummaryRowEdits.length === 0}
            onClick={() => saveProductDetailsRowEdits()}
          >
            {props.finalizeAllocationConfig.showSizeDetails ? "Save" : "Update"}
          </Button>
        );
      } else {
        // Show Edit Values button when not in edit mode (default state)
        options.push(
          <Tooltip title={hoverMessage} orientation="top" variant="secondary">
            <Button
              size="large"
              type="default"
              variant={props.finalizeAllocationConfig.showSizeDetails ? "primary" : "secondary"}
              id="edit-product-details-button"
              disabled={isEditDisabled}
              onClick={() => setProductDetailsTableEditing()}
            >
              {props.finalizeAllocationConfig.showSizeDetails ? "Edit" : "Edit Values"}
            </Button>
          </Tooltip>,
        );
      }
    }
    if (createSceanrio && props.selectedArticles?.length > 0) {
      options.push(
        <Button
          variant="primary"
          id="createAllocationRule"
          onClick={handleCreateScenario}
          disabled={
            !props.selectedArticles?.length ||
            props.planStatus === "Finalized"
          }
        >
          Create Scenario
        </Button>
      );
    }
  
    if (props?.finalizeAllocationConfig?.enableSmartFilter) {
      options.push(
        <AiSmartFilterButton
          key="ai-smart-filter-btn"
          columns={productDetailsTableColumns}
          allocationCode={props.allocationCode}
          onFilterApplied={applyAiSmartFilterToColumn}
          onAppliedFilterChange={aiChips.onAppliedFilterChange}
          onAppliedFilterCleared={aiChips.onAppliedFilterCleared}
          screenName={AI_SMART_FILTER_CNA_PRODUCT_VIEW.screenName}
          tableId={AI_SMART_FILTER_CNA_PRODUCT_VIEW.tableId}
          hideSuggestions
        />
      );
    }
    return options.length > 0 ? options : null;
  };

  const applyAiSmartFilterToColumn = (columnName, values) => {
    if (!columnName) return;
    const api = productDetailsTableInstance.current?.api;
    if (!api) return;

    if (Array.isArray(values) && values.length > 0) {
      api.setFilterModel({
        [columnName]: {
          filterType: "text",
          type: "contains",
          filter: values.join(","),
        },
      });
    } else {
      const currentModel = api.getFilterModel() || {};
      if (Object.prototype.hasOwnProperty.call(currentModel, columnName)) {
        const { [columnName]: _removed, ...rest } = currentModel;
        api.setFilterModel(rest);
      }
    }
  };

  // Use the common getAllocationUpdates function from utils
  const getProductAllocationUpdates = (data, item) => {
    return getAllocationUpdates(data, item, 'product');
  };

  const saveProductDetailsRowEdits = async () => {
    if (updatedProductSummaryRowEdits.length > 0) {
      const payload = buildSaveRowEditsPayload({
        allocationCode: props.allocationCode,
        sessionId: sessionId,
        updatedRowEdits: updatedProductSummaryRowEdits,
        tableType: 'product',
        dcConfig: dcOptionsInSetAll.current,
        isPercentage: false,
        dc_code: '',
        dynamicSetAllColumns: dynamicSetAllColumns,
        originalData: originalProductDetailsTableDataRef.current
      });

      const result = await handleSaveEditsAPI({
        payload,
        apiFunction: props.finalizeSaveEditsBasedOnSession,
        setLoader: props.setProductViewLoader,
        displaySnackMessages,
        onSuccess: () => {
          setUpdatedProductSummaryRowEdits([]);
          disableProductDetailsTableEditing();
          // Refresh all related data similar to NewProductStoreDetailsTable
          props.setFetchArticleSummary(true);
        },
        onError: (e) => {
          props.setProductViewLoader(false);
        }
      });
    } else {
      displaySnackMessages("No changes to save", "error");
    }
  };

  const enableTableRowSelection = () => {
    // Enable select all only when in edit mode and not disabled by screen config
    return selectedOption === "edit" || showSelectAllForProductDetails;
  };

  const applySetAllOnDetailsTable = async (data) => {    
    // Get selected rows and prepare them as row edits
    const selectedRows = productDetailsTableInstance.current.api
      .getSelectedNodes()
      .map((row) => row.data);
        
    // Convert selected rows to row edits format with the set all values
    const updatedRowEdits = selectedRows.map((item) => {
      return {
        ...item,
        // Apply the set all values to each selected row
        ...getAllocationUpdates(data, item, 'product')
      };
    });
    
    const payload = buildSaveRowEditsPayload({
      allocationCode: props.allocationCode,
      sessionId: sessionId,
      updatedRowEdits: updatedRowEdits,
      tableType: 'product',
      dcConfig: dcOptionsInSetAll.current,
      isPercentage: data.isPercentage || false,
      dc_code: data.dc_code,
      dynamicSetAllColumns: dynamicSetAllColumns,
      originalData: originalProductDetailsTableDataRef.current
    });
    
    const result = await handleSaveEditsAPI({
      payload,
      apiFunction: props.finalizeSaveEditsBasedOnSession,
      setLoader: props.setProductViewLoader,
      displaySnackMessages,
      onSuccess: () => {
        // Clear grid selections after successful Set All operation
        productDetailsTableInstance.current?.api?.deselectAll();
        setButtonEnabled(false);
        
        // Refresh all related data similar to NewProductStoreDetailsTable
        props.setFetchArticleSummary(true);
      },
      onError: (e) => {
        props.setProductViewLoader(false);
      }
    });
  };

  return (
    <>
      {/* here to add the edit and view logic */}
      <Loader loader={props.productViewLoader} >
        <InvalidAllocation resposne={productViewResposne} />    
        <div className={globalClasses.marginVertical1rem}>
          <AgGridComponent
            selectAllHeaderComponent={true}
            columns={productDetailsTableColumns}
            getRowStyle={(params) => {
              if (+params?.data?.min_net_available < 0) {
                return {
                  background: "rgb(255,255,0.5)",
                };
              }
            }}
            // enabling infinite scroll for RL based on key available in response from smart screen config api
            pagination={false}
            hideSelectCurrentPageRecords={
              props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                "CNARMaterialViewMaterialDetails"
              ) ||
              props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                "CNARStoreViewMaterialDetails"
              )
            }
            rowdata={productDetailsTableData}
            uniqueRowId={"article"}
            tableHeader={productDetailsTableHeader}
            customSystemButton={
              productDetailsTableData?.length ? (
                <>
                  <Tooltip title="Download" orientation="top" variant="tertiary">
                    <Button
                      id="productDownloadMenuBtn"
                      variant="tertiary"
                      icon={<IA_DOWNLOAD />}
                      onClick={(e) => setDownloadMenuAnchor(e.currentTarget)}
                      sx={{
                        background: "#f5f6fa !important",
                        border: "none !important",
                      }}
                    />
                  </Tooltip>
                  <Menu
                    anchorEl={downloadMenuAnchor}
                    open={Boolean(downloadMenuAnchor)}
                    onClose={() => setDownloadMenuAnchor(null)}
                    PaperProps={{
                      sx: {
                        borderRadius: "12px",
                        boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.08)",
                        minWidth: "200px",
                        mt: 1,
                      },
                    }}
                  >
                    <MenuItem
                      onClick={() => {
                        setDownloadMenuAnchor(null);
                        productDetailsTableInstance.current?.api?.exportDataAsExcel();
                      }}
                      sx={{
                        fontSize: "14px",
                        fontWeight: 400,
                        color: "#2b3348",
                        padding: "10px 16px",
                      }}
                    >
                      Product Download
                    </MenuItem>
                    {showMasterSkuStoreDownload && (
                      <MenuItem
                        onClick={() => {
                          setDownloadMenuAnchor(null);
                          handleMasterSkuStoreDownload();
                        }}
                        sx={{
                          fontSize: "14px",
                          fontWeight: 400,
                          color: "#2b3348",
                          padding: "10px 16px",
                        }}
                      >
                        Master SKU–Store Download
                      </MenuItem>
                    )}
                  </Menu>
                </>
              ) : null
            }
            suppressFieldDotNotation
            onCellValueChanged={onCellValueChanged}
            onBlur={onBlur}
            toPrependContent={props.excelDownloadMetaData}
            prependedContentDetails={prependData()}
            onSelectionChanged={onSelectionChanged}
            loadTableInstance={loadTableInstance} // to make use of available grid api's
            rowSelection="multiple"
            topRightOptions={getTopRightOptions()}
            topLeftOptions={getTopLeftOptions()}
            nestedTable={props.viewStoreDetailsTable}
            nestedTableComponent={
              <ProductStoreDetailsTable
                selectedArticle={props.selectedArticle}
                selectedStores={props.selectedStores}
                selectedData={props.selectedData}
                setViewStoreDetailsTable={props.setViewStoreDetailsTable}
                tab={props.tab}
                displayArticle={props.displayArticle}
                renderToggleSummary={renderToggleSummary}
                selectedOption={selectedOption}
                disableEditDueToParentEdit={enableProductDetailsTableEditing || props?.disableEditDueToParentEdit}
                productDetailsTableColumns={productDetailsTableColumns}
                isStoreView={props.tab === "store_view"}
                setDisableEditDuetoChildEdit={props.setDisableEditDuetoChildEdit || setDisableEditDuetoChildEdit}
                disabledEditDuetoChildEdit={props.disabledEditDuetoChildEdit || disabledEditDuetoChildEdit}
              />
            }
            sizeColumnsToFitFlag={true}
            closeButton={Boolean(props.tab)}
            handleCloseButtonClick={() => {
              props.setViewArticlesTable(false);
            }}
          />
        </div>
        <NewAllocatedUnitsSetAllModalComponent
          showSetAllModal={showProductDetailsSetAllModal}
          closeSetAllModal={() => setShowProductDetailsSetAllModal(false)}
          onApplySetAll={(data) => applySetAllOnDetailsTable(data)}
          minPackAndEaches={minPackAndEaches}
          dynamicSetAllColumns={dynamicSetAllColumns}
        />
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
    productViewLoader:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .productViewLoader,
    allocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .allocationCode,
    planStatus:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planStatus,
    planType:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .planType,
    originalAllocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .originalAllocationCode,
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
    finalized:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .finalized,
    selectedArticles:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .selectedArticles,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    fetchArticleSummary:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .fetchArticleSummary,
    fetchProductDetails:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .fetchProductDetails,
    fetchProductStoreDetails:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .fetchProductStoreDetails,
    ProductDetailsTableHeader:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig
        ?.ProductDetailsTableHeader,
    finalizeAllocationConfig:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartFinalizeAllocationConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setProductViewLoader: (payload) => dispatch(setProductViewLoader(payload)),
  getProductView: (payload, isV3) => dispatch(getProductView(payload, isV3)),
  getStoreView: (payload) => dispatch(getStoreView(payload)),
  setStoreDetailsTableData: (payload) =>
    dispatch(setStoreDetailsTableData(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  setSelectedArtilces: (payload) => dispatch(setSelectedArtilces(payload)),
  downloadMasterProductStoreSizeView: (payload, isV3) =>
    dispatch(downloadMasterProductStoreSizeView(payload, isV3)),
  setFetchArticleSummary: (payload) =>
    dispatch(setFetchArticleSummary(payload)),
  setFetchProductDetails: (payload) =>
    dispatch(setFetchProductDetails(payload)),
  setFetchProductStoreDetails: (payload) =>
    dispatch(setFetchProductStoreDetails(payload)),
  finalizeSaveEditsBasedOnSession: (payload) =>
    dispatch(finalizeSaveEditsBasedOnSession(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductDetailsTable);
