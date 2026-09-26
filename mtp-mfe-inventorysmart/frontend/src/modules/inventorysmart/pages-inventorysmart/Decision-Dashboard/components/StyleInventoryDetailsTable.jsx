import { addSnack } from "core/actions/snackbarActions";
import { isEmpty } from "lodash";
import { useNavigate } from "react-router-dom-v5-compat";
import {
  defaultTableData,
  DESC_ORDER,
  ERROR_MESSAGE,
  MIN_ARTICLE_SELECTION_MESSAGE,
  tableConfigurationMetaData,
  PDQ_SKU_VALIDATION,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";
import {
  getArticleInventoryTableConfiguration,
  getArticleInventoryTableData,
  setArticleInventoryTableData,
  setArticleInventoryLoader,
  setArticleInventoryTableConfigLoader,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/store-inventory-services";
import {
  setCreateAllocationArticles,
  setInventorysmartCreateAllocationFilterDependency,
  setSelectedFilters,
} from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import StoreArticleInventoryPopup from "./StoreArticleInventoryPopup";
import {
  Grid,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  IconButton,
} from "@mui/material";
import { Modal, Tooltip, Prompt } from "impact-ui-v3";
import { Button, Badge, Chips } from "impact-ui-v3";
import { CREATE_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { sortByNumber } from "../../inventorysmart-utility";
import {
  setDashboardLoaderFullScreen,
  downloadInventoryDetails,
  checkIngestionStatus,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import ImageCellRenderer from "../../../../../core/Utils/agGrid/cellsToBeRendered/ImageCellRenderer";
import AiIcon from "../../../../../assets/IS_icons/IS_AI.svg";
import InventoryDetailsPanel from "./InventoryDetailsPanel";
import commentingColumnFormatter from "../../../../../core/Utils/agGrid/commentingColumnFormatter";
import {
  setCreateAllocationFilterDetails,
  setSelectedFiltersCreateAllocation,
} from "../../../services-inventorysmart/Create-Allocation/create-allocation-services";
import AiSmartFilterButton from "./AiSmartFilterButton";
import AiSmartFilterChips from "./AiSmartFilterChips";
import useAiSmartFilterChips from "./useAiSmartFilterChips";
import { AI_SMART_FILTER_DASHBOARD_DETAILS_TABLE } from "./aiSmartFilterDummyConstants";

const StyleInventoryDetailsTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const navigate = useNavigate();
  const uniqueArticleKey = dynamicLabelsBasedOnTenant("article_unique_id");
  const articleInventoryTableInstance = useRef(null);

  const [articleInventoryData, setArticleInventoryData] = useState([]);
  const [
    articleInventoryTableColumns,
    setArticleInventoryTableColumns,
  ] = useState([]);
  const [selectedArticleIds, setSelectedArticleIds] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showValidationModel, setShowValidationModel] = useState(false);

  const [
    openStoreArticleInventoryDialog,
    setOpenStoreArticleInventoryDialog,
  ] = useState(false);
  const [article, setArticle] = useState(null);
  const [metric, setMetric] = useState(null);
  const [title, setTitle] = useState(null);
  const [expeditedAllocation, setExpeditedAllocation] = useState(false);
  const [redirectionConfigurations, setRedirectionConfigurations] = useState(
    {}
  );
  const [tabMappingDetails, setTabMappingDetails] = useState([
    {
      id: "product-details",
      label: "Product Details",
      fields: {
        "Style-Color ID": "article",
        Division: "l0_name",
        Department: "l1_name",
        Class: "l2_name",
        Subclass: "l3_name",
      },
    },
    {
      id: "product-kpis",
      label: "Product KPIs",
      fields: {
        "LW Sales (Units)": "lw_units",
        "Total Margin $": "lw_margin",
        "DC OH": "dc_oh",
        "Total Store OH": "oh",
        FWOS: "wos_oh",
      },
    },
  ]);
  const [
    downloadFormatChipsDependency,
    setDownloadFormatChipsDependency,
  ] = useState({});
  const [
    inventoryDetailsPanelStatus,
    setInventoryDetailsPanelStatus,
  ] = useState(false);
  // AI Smart Filter "applied_filter" reference chips shown beside the header.
  const aiChips = useAiSmartFilterChips();

  const isThreadFeatureEnabled = Boolean(
    props?.commentingConfig?.inventory_smart_comment_and_thread
      ?.isThreadFeatureEnabled
  );

  const [storeDcModal, setStoreDCModal] = useState(false);
  const [showInvalidSkus, setShowInvalidSkus] = useState([]);
  const [showIngestionWarning, setShowIngestionWarning] = useState(false);
  const [ingestionWarningMessage, setIngestionWarningMessage] = useState("");
  const [ingestionCheckLoader, setIngestionCheckLoader] = useState(false);
  const pendingRedirectionRef = React.useRef(null);

  const pageSize =
    props?.inventorysmartScreenConfig?.inventorysmart_page_count || 10;
  const toggleStoreInventoryPopup = (data, columnName, item) => {
    const selectedArticle = data?.article;
    const column_names = [
      "bulk_remaining",
      "it",
      "oh",
      "oo",
      "lw_qty",
      "lw_revenue",
      "lw_margin",
      "week_to_date_sales",
      "last_day_sales",
      "sales_1_ago",
      "sales_2_ago",
      "sales_3_ago",
      "sales_4_ago",
      "sales_5_ago",
      "sales_6_ago",
      "sales_7_ago",
      "sales_8_ago",
      "available_to_allocate",
      "dc_oh_1",
      "dc_oh_qcloc",
      "dc_oh_cwc",
      "oo_dc",
      "it_dc",
      "last_day_sales_revenue",
      "week_to_date_sales_revenue",
      "sales_revenue_1_ago",
      "sales_revenue_2_ago",
      "sales_revenue_3_ago",
      "sales_revenue_4_ago",
    ];
    setArticle(selectedArticle);
    setMetric(columnName);
    setTitle(item?.label);
    openStoreArticleInventoryPopUp();
    if (column_names?.includes(columnName)) {
      setStoreDCModal(true);
    }
  };

  const storeCountActionMap = {
    stock_out: toggleStoreInventoryPopup,
    stockout: toggleStoreInventoryPopup,
    shortfall: toggleStoreInventoryPopup,
    normal: toggleStoreInventoryPopup,
    excess: toggleStoreInventoryPopup,
    overstock: toggleStoreInventoryPopup,
    bulk_remaining: toggleStoreInventoryPopup,
    it: toggleStoreInventoryPopup,
    oh: toggleStoreInventoryPopup,
    oo: toggleStoreInventoryPopup,
    lw_qty: toggleStoreInventoryPopup,
    lw_revenue: toggleStoreInventoryPopup,
    lw_margin: toggleStoreInventoryPopup,
    week_to_date_sales: toggleStoreInventoryPopup,
    last_day_sales: toggleStoreInventoryPopup,
    sales_1_ago: toggleStoreInventoryPopup,
    sales_2_ago: toggleStoreInventoryPopup,
    sales_3_ago: toggleStoreInventoryPopup,
    sales_4_ago: toggleStoreInventoryPopup,
    sales_5_ago: toggleStoreInventoryPopup,
    sales_6_ago: toggleStoreInventoryPopup,
    sales_7_ago: toggleStoreInventoryPopup,
    sales_8_ago: toggleStoreInventoryPopup,
    available_to_allocate: toggleStoreInventoryPopup,
    dc_oh_1: toggleStoreInventoryPopup,
    dc_oh_qcloc: toggleStoreInventoryPopup,
    dc_oh_cwc: toggleStoreInventoryPopup,
    oo_dc: toggleStoreInventoryPopup,
    it_dc: toggleStoreInventoryPopup,
    last_day_sales_revenue: toggleStoreInventoryPopup,
    week_to_date_sales_revenue: toggleStoreInventoryPopup,
    sales_revenue_1_ago: toggleStoreInventoryPopup,
    sales_revenue_2_ago: toggleStoreInventoryPopup,
    sales_revenue_3_ago: toggleStoreInventoryPopup,
    sales_revenue_4_ago: toggleStoreInventoryPopup,
  };

  const productTagColorMap = {
    normal: "success",
    stockout: "error",
    shortfall: "warning",
    excess: "default",
    overstock: "default",
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const fetchArticleInventoryData = async () => {
    try {
      props.setArticleInventoryLoader(true);
      let body = {
        filters: props.selectedFilters?.filter(
          (filterItem) => filterItem?.values?.length > 0
        ),
        meta: {
          ...tableConfigurationMetaData.meta,
        },
      };
      let response = await props.getArticleInventoryTableData(body);
      if (response.data.status) {
        const sortedData = sortByNumber(
          response?.data?.data?.data,
          DESC_ORDER,
          "lw_qty"
        );

        setArticleInventoryData(sortedData);
        const columnData = response.data.data.columns;
        const updatedColumnsDef = columnData.map((item) => {
          if (item?.column_name === "product_tag") {
            item.cellRenderer = (params) => {
              return params.data?.product_tag ? (
                <Badge
                  label={
                    params.data?.product_tag?.charAt(0)?.toUpperCase() +
                    params.data?.product_tag?.slice(1)?.toLowerCase()
                  }
                  variant="stroke"
                  color={
                    productTagColorMap?.[params.data.product_tag?.toLowerCase()]
                  }
                />
              ) : null;
            };
          }
          if (item?.column_name === "product_image_link") {
            item.cellRenderer = (cellProps) => {
              return ImageCellRenderer(
                cellProps,
                false,
                false,
                [],
                tabMappingDetails
              );
            };
          }
          return item;
        });
        let formattedColumns = agGridColumnFormatter(
          updatedColumnsDef,
          null,
          storeCountActionMap
        );
        setArticleInventoryTableColumns(
          commentingColumnFormatter(
            formattedColumns,
            storeCountActionMap,
            isThreadFeatureEnabled,
            false
          )
        );
        props.setArticleInventoryTableData(response.data);
        props.setArticleInventoryLoader(false);
        return { ...response.data, totalCount: response?.data?.total };
      } else {
        const show_message = response?.data?.show_message;
        props.setArticleInventoryLoader(false);
        // show_message && displaySnackMessages( response.data.message , "success");
      }
    } catch (err) {
      props.setArticleInventoryLoader(false);
      // handleErrorMessage(err);
      return defaultTableData;
    }
  };

  const checkDataIngestionStatus = async (expeditedAllocation) => {
    // Store arguments in ref at the beginning
    pendingRedirectionRef.current = {
      expeditedAllocation,
    };

    try {
      setIngestionCheckLoader(true);
      const payload = {
        filters: props.selectedFilters,
        meta: {
          ...tableConfigurationMetaData.meta,
        },
      };
      const response = await props.checkIngestionStatus(payload);
      setIngestionCheckLoader(false);

      if (response?.data?.show_warning) {
        // Show warning popup with message
        setIngestionWarningMessage(response?.data?.message);
        setShowIngestionWarning(true);
      } else {
        // Proceed with current flow
        proceedWithRedirection();
      }
    } catch (error) {
      console.error("Error checking data ingestion status:", error);
      setIngestionCheckLoader(false);
      // On error, proceed with current flow
      proceedWithRedirection();
    }
  };

  const proceedWithRedirection = () => {
    setShowIngestionWarning(false);
    if (!pendingRedirectionRef.current) return;

    const { expeditedAllocation } = pendingRedirectionRef.current;

    redirectToCreateAllocation(expeditedAllocation);

    // Clear the ref after successful redirection
    pendingRedirectionRef.current = null;
  };

  const redirectToCreateAllocation = async (expeditedAllocation) => {
    if (expeditedAllocation) {
      props.setDashboardLoaderFullScreen(true);
      setExpeditedAllocation(true);
      setRedirectionConfigurations({
        selectedArticles: selectedRows,
        storeData: [],
        filters:
          props.filterDashboardConfiguration.appliedFilterData.dependencyData ||
          props.filterDependencyData,
        filteredSelection: null,
        popupLink: null,
        poCode: null,
      });
    } else {
      props.setCreateAllocationFilterDetails({
        ...props?.filterDashboardConfiguration,
      });
      props.setSelectedFiltersCreateAllocation({
        ...props?.selectedFiltersFromReducer,
      });
      props.setInventorysmartCreateAllocationFilterDependency(
        props.filterDashboardConfiguration.appliedFilterData.dependencyData ||
          props.filterDependencyData
      );
      props.setSelectedFilters(props.selectedFilters);
      props.setCreateAllocationArticles(selectedArticleIds);
      setTimeout(() => {
        navigate(`${CREATE_ALLOCATION}?step=0&type=details`, {
          state: { redirectFromDashboard: true },
        });
      }, 100);
    }
  };

  useEffect(() => {
    const fetchColumnData = async () => {
      props.setArticleInventoryTableConfigLoader(true);
      let columns = await props.getArticleInventoryTableConfiguration();
      props.setArticleInventoryTableConfigLoader(false);
      const columnData = columns.data.data;
      const updatedColumnsDef = columnData.map((item) => {
        if (item?.column_name === "product_image_link") {
          item.cellRenderer = (cellProps) => {
            return ImageCellRenderer(
              cellProps,
              false,
              false,
              [],
              tabMappingDetails
            );
          };
        }
        return item;
      });
      let formattedColumns = agGridColumnFormatter(
        updatedColumnsDef,
        null,
        storeCountActionMap
      );
      setArticleInventoryTableColumns(
        commentingColumnFormatter(
          formattedColumns,
          storeCountActionMap,
          isThreadFeatureEnabled,
          false
        )
      );
    };
    fetchColumnData();
  }, []);

  useEffect(() => {
    if (!isEmpty(selectedArticleIds)) {
      //TODO Add Create Allocation Logic
    }
  }, [selectedArticleIds]);

  useEffect(() => {
    !isEmpty(props.selectedFilters) && fetchArticleInventoryData();
  }, [props.selectedFilters]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    let articleIds = [];
    // for VS
    if (props.alertsUniqueIdNavigationKey) {
      articleIds = selections.map(
        (item) => item[props.alertsUniqueIdNavigationKey]
      );
    } else {
      articleIds = selections.map((item) =>
        item.primary_sku ? item.primary_sku : item.style
      );
    }
    setSelectedArticleIds(articleIds);
    setSelectedRows(selections);
  };

  const openStoreArticleInventoryPopUp = () => {
    setOpenStoreArticleInventoryDialog(true);
  };

  const closeStoreArticleInventoryPopUp = () => {
    setOpenStoreArticleInventoryDialog(false);
    setStoreDCModal(false);
  };

  const handleCreateAllocation = (expeditedAllocation = false) => {
    if (selectedArticleIds?.length === 0) {
      displaySnackMessages(MIN_ARTICLE_SELECTION_MESSAGE, "error");
    } else {
      if (props.ignorePDQAlertForCreateAllocation) {
        // for DG's case
        const invalidSelections = selectedRows.filter(
          (item) =>
            item?.invalid_allocation &&
            selectedArticleIds.includes(item.primary_sku)
        );
        if (invalidSelections.length > 0) {
          let invalidArticleIds = invalidSelections.map(
            (item) => item.primary_sku
          );
          setShowInvalidSkus(invalidArticleIds);
          setShowValidationModel(true);
        } else checkDataIngestionStatus(expeditedAllocation);
      } else checkDataIngestionStatus(expeditedAllocation);
    }
  };

  const prependData = () => {
    if (!isEmpty(downloadFormatChipsDependency)) {
      let prependContentReq = prependExtraData(downloadFormatChipsDependency);
      return appendExcelDownloadData(prependContentReq);
    }
  };

  useEffect(() => {
    if (
      props.filterDashboardConfiguration?.appliedFilterData?.dependencyData
        ?.length
    ) {
      let filterChips = fetchFilterChipsToDownload(
        props.filterDashboardConfiguration?.appliedFilterData?.dependencyData
      );
      setDownloadFormatChipsDependency(filterChips);
    }
  }, [props.filterDashboardConfiguration?.appliedFilterData]);

  const handleDownload = async () => {
    let body = {
      filters: props.selectedFilters?.filter(
        (filterItem) => filterItem?.values?.length > 0
      ),
      meta: {
        ...tableConfigurationMetaData.meta,
      },
    };

    try {
      let response = await props.downloadInventoryDetails(body);
      displaySnackMessages(response?.data?.data?.message, "success");
    } catch (err) {
      handleErrorMessage(err);
    }
  };

  const showValidationPopUp = () => {
    return (
      <Modal
        size="small"
        title="Validation Error"
        onClose={() => setShowValidationModel(false)}
        maxWidth={"sm"}
        aria-labelledby="customized-dialog-title"
        open={true}
        fullWidth={true}
        disableEscapeKeyDown={true}
        height={220}
      >
        <DialogContent>
          <Typography variant="h6" className={globalClasses.marginBottom}>
            {PDQ_SKU_VALIDATION}
          </Typography>
          <Typography variant="h6" className={globalClasses.marginBottom}>
            {showInvalidSkus.join(", ")}
          </Typography>
        </DialogContent>
      </Modal>
    );
  };

  const getTopRightOptions = () => {
    let options = [];
    if (
      props.ddScreenConfigs?.dashboard?.drillDown?.showInventoryDetails &&
      selectedArticleIds?.length > 0
    ) {
      options.push(
        <div
          className={`${classes.inventoryDetailsBtnContainer} ${classes.animatedTopRightButton}`}
        >
          <Tooltip title="" variant="tertiary">
            <div
              onClick={() => {
                if (selectedArticleIds.length > 0) {
                  setInventoryDetailsPanelStatus(true);
                }
              }}
              className={`inventory-details-btn`}
            >
              <AiIcon />
              Inventory Details
            </div>
          </Tooltip>
        </div>
      );
    }
    if (selectedArticleIds?.length > 0 && props.isCreateAllocationAllowed) {
      options.push(
        <Button
          key="create-allocation-btn"
          variant="primary"
          id="productSetAllBtn"
          className={`${classes.button} ${classes.animatedTopRightButton}`}
          onClick={() => handleCreateAllocation()}
          size="large"
        >
          Create Allocation
        </Button>
      );
    }
    if (props.ddScreenConfigs?.dashboard?.drillDown?.enableSmartFilter) {
      options.push(
        <AiSmartFilterButton
          key="ai-smart-filter-btn"
          columns={articleInventoryTableColumns}
          filters={props?.selectedFilters}
          onFilterApplied={applyAiSmartFilterToColumn}
          onAppliedFilterChange={aiChips.onAppliedFilterChange}
          onAppliedFilterCleared={aiChips.onAppliedFilterCleared}
          screenName={AI_SMART_FILTER_DASHBOARD_DETAILS_TABLE.screenName}
          tableId={AI_SMART_FILTER_DASHBOARD_DETAILS_TABLE.tableId}
          hideSuggestions
        />
      );
    }
    return options.length > 0 ? options : null;
  };

  const loadArticleInventoryTableInstance = (params) => {
    articleInventoryTableInstance.current = params;
  };

  const applyAiSmartFilterToColumn = (columnName, values) => {
    if (!columnName) return;
    const api = articleInventoryTableInstance.current?.api;
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

  const getTopLeftOptions = () => (
    <AiSmartFilterChips
      chips={aiChips.chips}
      onChipClick={(chip) =>
        aiChips.handleChipClick(chip, applyAiSmartFilterToColumn)
      }
      onChipRemove={(chip) =>
        aiChips.handleChipRemove(chip, applyAiSmartFilterToColumn)
      }
    />
  );

  return (
    <>
      <Loader
        loader={
          props.articleInventoryLoader ||
          props.articleInventoryTableConfigLoader
        }
        size="medium"
        text="Loading Details"
        minHeight={"180px"}
      >
        {!(
          props.articleInventoryLoader ||
          props.articleInventoryTableConfigLoader
        ) && (
          <AgGridComponent
            showDownloadButton={true}
            onDownloadButtonClick={() => handleDownload()}
            tableHeader="Details"
            topLeftOptions={getTopLeftOptions()}
            topRightOptions={getTopRightOptions()}
            columns={articleInventoryTableColumns}
            rowdata={articleInventoryData}
            loadTableInstance={loadArticleInventoryTableInstance}
            selectAllHeaderComponent={props.isCreateAllocationAllowed}
            onSelectionChanged={onSelectionChanged}
            tableIdentifier={"Decision_Dashboard"}
            inventorysmartScreenConfig={props.inventorysmartScreenConfig}
            downloadAsExcel={
              props.ddScreenConfigs?.dashboard?.drillDown
                ?.enableInventoryDetailsDownload
            }
            disableExcelDownload={articleInventoryData.length ? false : true}
            rowSelection="multiple"
            uniqueRowId={uniqueArticleKey}
            showSaveTableConfig={true}
            pagination={
              !props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                "dashboardClientSide"
              )
            }
            hideSelectCurrentPageRecords={props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
              "dashboardClientSide"
            )}
            toPrependContent={
              props.inventorysmartScreenConfig?.downloadRequiresMeta?.includes(
                "DDDetails"
              ) && props.inventorysmartScreenConfig?.excelDownloadMetaData
            }
            prependedContentDetails={prependData()}
            cacheBlockSize={pageSize}
            paginationPageSize={pageSize}
            enableCellComment={false} //client side table comments are not supported
            tableName={"inventorysmart_details_table"}
            requestUrl={"inventory-smart/dashboard/get-article-inventory"}
            appliedFilters={props.selectedFilters}
            selectedRowsIDs={selectedRows}
            isChatEnabled={isThreadFeatureEnabled}
            isCommentFeatureEnabled={true}
          />
        )}
      </Loader>
      {inventoryDetailsPanelStatus && (
        <InventoryDetailsPanel
          inventoryDetailsPanelStatus={inventoryDetailsPanelStatus}
          setInventoryDetailsPanelStatus={setInventoryDetailsPanelStatus}
          selectedRows={selectedRows}
          enableApiSummaryBtn={
            props.ddScreenConfigs?.dashboard?.drillDown?.enableApiSummaryBtn
          }
        />
      )}
      <StoreArticleInventoryPopup
        active={openStoreArticleInventoryDialog}
        openModal={openStoreArticleInventoryPopUp}
        closeModal={closeStoreArticleInventoryPopUp}
        filters={props.selectedFilters}
        article={article}
        metric={metric}
        title={title}
        storeDcModal={storeDcModal}
        customKpiColumn={articleInventoryTableColumns.find(
          (column) => column.column_name === "custom_kpis"
        )}
      />
      {showValidationModel && showValidationPopUp()}
      {ingestionCheckLoader && (
        <div className={globalClasses.overlayLoader}>
          <Loader
            loader={true}
            size="medium"
            text="Checking data ingestion status..."
          />
        </div>
      )}
      {showIngestionWarning && (
        <Prompt
          isOpen={showIngestionWarning}
          title="Warning"
          children={<div>{ingestionWarningMessage}</div>}
          infoList={[]}
          primaryButtonLabel="Yes"
          onPrimaryButtonClick={proceedWithRedirection}
          secondaryButtonLabel="No"
          onSecondaryButtonClick={() => {
            setShowIngestionWarning(false);
          }}
        />
      )}
    </>
  );
};
const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
    articleInventoryLoader:
      store.inventorysmartReducer.inventorySmartStoreInventoryService
        .articleInventoryLoader,
    articleInventoryTableConfigLoader:
      store.inventorysmartReducer.inventorySmartStoreInventoryService
        .articleInventoryTableConfigLoader,
    articleInventoryTableData:
      store.inventorysmartReducer.inventorySmartStoreInventoryService
        .articleInventoryTableData,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDashboardService
        .selectedFilters,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "decisionDashboardFilterConfiguration"
      ],
    selectedFiltersFromReducer: store.filterReducer.selectedFilters,
    expeditedFlow:
      store?.inventorysmartReducer?.inventorySmartDashboardService
        ?.ddScreenConfigs?.dashboard?.expeditedFlow,
    filterDependencyData:
      store.inventorysmartReducer.inventorySmartDashboardService
        .filterDependencyData,
    ddScreenConfigs:
      store.inventorysmartReducer.inventorySmartDashboardService
        ?.ddScreenConfigs,
    alertsUniqueIdNavigationKey:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig?.alertsUniqueIdNavigationKey,
    ignorePDQAlertForCreateAllocation:
      store.inventorysmartReducer.inventorySmartDashboardService
        ?.ddScreenConfigs?.dashboard?.drillDown
        ?.ignorePDQAlertForCreateAllocation,
    commentingConfig: store?.tenantConfigReducer?.commentingConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getArticleInventoryTableConfiguration: () =>
    dispatch(getArticleInventoryTableConfiguration()),
  getArticleInventoryTableData: (payload) =>
    dispatch(getArticleInventoryTableData(payload)),
  setArticleInventoryLoader: (payload) =>
    dispatch(setArticleInventoryLoader(payload)),
  setArticleInventoryTableConfigLoader: (payload) =>
    dispatch(setArticleInventoryTableConfigLoader(payload)),
  setArticleInventoryTableData: (payload) =>
    dispatch(setArticleInventoryTableData(payload)),
  setCreateAllocationArticles: (payload) =>
    dispatch(setCreateAllocationArticles(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setInventorysmartCreateAllocationFilterDependency: (payload) =>
    dispatch(setInventorysmartCreateAllocationFilterDependency(payload)),
  setDashboardLoaderFullScreen: (payload) =>
    dispatch(setDashboardLoaderFullScreen(payload)),
  downloadInventoryDetails: (body) => dispatch(downloadInventoryDetails(body)),
  checkIngestionStatus: (payload) =>
    dispatch(checkIngestionStatus(payload, true)),
  setCreateAllocationFilterDetails: (payload) =>
    dispatch(setCreateAllocationFilterDetails(payload)),
  setSelectedFiltersCreateAllocation: (payload) =>
    dispatch(setSelectedFiltersCreateAllocation(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StyleInventoryDetailsTable);
