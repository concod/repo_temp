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
import InvalidAllocation from "../components/InvalidAllocation";
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
import NewProductStoreDetailsTable from "./NewProductStoreDetailsTable";
import { finalizeAllocationContext } from "../index";
import NewAllocatedUnitsSetAllModalComponent from "./NewAllocatedUnitsSetAllModal";
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

const NewProductDetailsTableComponent = (props) => {
  const classes = useStyles();
  const navigate = useNavigate();
  const flowType = new URLSearchParams(window.location.search).get("flow");

  const {
    selectedOption,
    setSelectedOption,
    sessionId,
    setSessionId,
    toggleUpdateResponse,
  } = useContext(finalizeAllocationContext);

  const [productDetailsTableColumns, setProductDetailsTableColumns] = useState(
    []
  );
  const [productDetailsTableData, setProductDetailsTableData] = useState([]);
  const originalProductDetailsTableDataRef = useRef([]); // Store original data for comparison
  const [productViewResposne, setProductViewResposne] = useState({});
  const [
    downloadFormatChipsDependency,
    setDownloadFormatChipsDependency,
  ] = useState({});
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState(null);
  const productDetailsTableInstance = useRef(null);
  const [enableProductDetailsTableEditing, setEnableProductDetailsTableEditing] = useState(false);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const dcOptionsInSetAll = useRef([]);
  const [minPackAndEaches, setMinPackAndEaches] = useState({
    minPack: 0,
    minEaches: 0,
  });
  const [dynamicSetAllColumns, setDynamicSetAllColumns] = useState([]);
  const [showProductDetailsSetAllModal, setShowProductDetailsSetAllModal] = useState(false);
  const [editValuesModalOpen, setEditValuesModalOpen] = useState(false);
  const [updatedProductSummaryRowEdits, setUpdatedProductSummaryRowEdits] = useState([]);
  const updatedProductSummaryRowEditsRef = useRef([]);

  const DELIVERY_DATES_SETALL_FIELDS = useMemo(
    () => [
      {
        label: "DCs",
        accessor: "dcs",
        field_type: "dropdown",
        options: dcOptionsInSetAll.current?.map((dcs) => {
          return {
            ...dcs,
            value: `shipping_date_${dcs?.value}`,
          };
        }),
        isMulti: true,
      },
      {
        label: productDetailsTableColumns?.filter(
          (val) => val.column_name === "shipping_date__dc"
        )?.[0]?.label,
        accessor: "shipping_date",
        field_type: "DateTimeField",
        disablePast: true,
      },
      ...(props.showInSetAll?.includes("cancel_date")
        ? [
          {
            label: "Cancel Date",
            accessor: "cancel_date",
            field_type: "DateTimeField",
            disablePast: true,
          },
        ]
        : []),
      ...(props.showInSetAll?.includes("priority_code")
        ? [
          {
            label: "Priority Code",
            accessor: "priority_code",
            field_type: "dropdown",
            options: productDetailsTableColumns?.filter(
              (val) => val.column_name === "priority_code_dc"
            )?.[0]?.extra?.options,
          },
        ]
        : []),
    ],
    [productDetailsTableData, productDetailsTableColumns]
  );

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
      
      setProductDetailsTableColumns(formattedColumns);
      setProductDetailsTableData(data);
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
    props.allocationCode,
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

  const saveDeliveryDate = () => {
    // TODO:
    // api integration
  };

  const onCellValueChanged = (params) => {
    const { data } = params;
    updateEditedRowState(data);
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
        updateEditedRowState(data);
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
                    return params.data && params.data.hasOwnProperty(subSubHeader.column_name) ? (
                      <CellRenderers
                        cellData={params}
                        column={subSubHeader}
                        extraProps={extraProps}
                        actions={null}
                      ></CellRenderers>
                    ) : null;
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
                  return params.data && params.data.hasOwnProperty(subHeader.column_name) ? (
                    <CellRenderers
                      cellData={params}
                      column={subHeader}
                      extraProps={extraProps}
                      actions={null}
                    ></CellRenderers>
                  ) : null;
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
    setEditValuesModalOpen(showEdits);
  };

  const prependData = () => {
    if (!isEmpty(downloadFormatChipsDependency)) {
      let prependContentReq = prependExtraData(downloadFormatChipsDependency);
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
  const createSceanrio =
    props?.finalizeAllocationConfig?.createSceanrio;

  const getTopRightOptions = () => {
    let options = [];
    const isEditDisabled = toggleUpdateResponse?.data?.data?.enable_edit === false;
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
            variant="text"
            id="cancel-product-details-button"
            onClick={() => disableProductDetailsTableEditing()}
          >
            Cancel
          </Button>,
          <Button
            variant="primary"
            size="large"
            type="default"
            disabled={updatedProductSummaryRowEdits.length === 0}
            onClick={() => saveProductDetailsRowEdits()}
          >
            Update
          </Button>
        );
      } else {
        // Show Edit Values button when not in edit mode (default state)
        options.push(
          <Tooltip title={hoverMessage} orientation="top" variant="secondary">
            <Button
              size="large"
              type="default"
              variant="secondary"
              id="edit-product-details-button"
              disabled={isEditDisabled}
              onClick={() => setProductDetailsTableEditing()}
            >
              Edit Values
            </Button>
          </Tooltip>,
        );
      }
    }

    // Always show non-edit buttons (Download, Create Scenario, etc.)
    if (createSceanrio && props.selectedArticles?.length > 0) {
      options.push(
        <Button
          variant="primary"
          id="createAllocationRule"
          onClick={handleCreateScenario}
          disabled={!props.selectedArticles?.length}
        >
          Create Scenario
        </Button>
      );
    }

    return options;
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
          props.setFetchProductDetails(true);
          props.setFetchProductStoreDetails(true);
        },
        onError: (e) => {
          props.setProductViewLoader(false);
        }
      });
    } else {
      displaySnackMessages("No changes to save", "error");
    }
  };

  const disableTableRowSelection = () => {
    // Enable select all only when in edit mode and not disabled by screen config
    return selectedOption === "edit";
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
        props.setFetchProductDetails(true);
        props.setFetchProductStoreDetails(true);
      },
      onError: (e) => {
        props.setProductViewLoader(false);
      }
    });
  };

  return (
    <>
      {/* here to add the edit and view logic */}
      <Loader loader={props.productViewLoader}>
        <InvalidAllocation resposne={productViewResposne} />
        <AgGridComponent
          selectAllHeaderComponent={disableTableRowSelection()}
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
                    id="newProductDownloadMenuBtn"
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
          nestedTable={props.viewStoreDetailsTable}
          nestedTableComponent={
            <NewProductStoreDetailsTable
              selectedArticle={props.selectedArticle}
              selectedStores={props.selectedStores}
              selectedData={props.selectedData}
              setViewStoreDetailsTable={props.setViewStoreDetailsTable}
              tab={props.tab}
              displayArticle={props.displayArticle}
              selectedOption={selectedOption}
              disableEditDueToParentEdit={enableProductDetailsTableEditing || props?.disableEditDueToParentEdit}
              productDetailsTableColumns={productDetailsTableColumns}
            />
          }
          sizeColumnsToFitFlag={true}
          closeButton={Boolean(props.tab)}
          handleCloseButtonClick={() => {
            props.setViewArticlesTable(false);
          }}
        />
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
)(NewProductDetailsTableComponent);
