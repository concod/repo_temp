import { addSnack } from "core/actions/snackbarActions";
import { isEmpty } from "lodash";
import { useHistory } from "react-router-dom";
import {
  defaultTableData,
  DESC_ORDER,
  ERROR_MESSAGE,
  MIN_ARTICLE_SELECTION_MESSAGE,
  MIN_ARTICLE_SELECTION_MESSAGE_rl,
  tableConfigurationMetaData,
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
import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import StoreArticleInventoryPopup from "./StoreArticleInventoryPopup";
import { Button, Grid } from "@mui/material";
import { CREATE_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { sortByNumber } from "../../inventorysmart-utility";
import ExpeditedAllocation from "../../StoreInventoryAlerts/components/ExpeditedAllocation";
import { setDashboardLoaderFullScreen } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";

const StyleInventoryDetailsTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const history = useHistory();

  const [articleInventoryData, setArticleInventoryData] = useState([]);
  const [
    articleInventoryTableColumns,
    setArticleInventoryTableColumns,
  ] = useState([]);
  const [selectedArticleIds, setSelectedArticleIds] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

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
  const [downloadFormatChipsDependency, setDownloadFormatChipsDependency] = useState({});

  const [storeDcModal, setStoreDCModal] = useState(false);

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
      let response = await props.getArticleInventoryTableData(body, props.inventorysmartScreenConfig?.dashboard?.hideExclusionFilter);
      if (response.data.status) {
        const sortedData = sortByNumber(
          response?.data?.data?.data,
          DESC_ORDER,
          "lw_qty"
        );
        setArticleInventoryData(sortedData);
        let formattedColumns = agGridColumnFormatter(
          response.data.data.columns,
          null,
          storeCountActionMap
        );
        setArticleInventoryTableColumns(formattedColumns);
        props.setArticleInventoryTableData(response.data);
        props.setArticleInventoryLoader(false);
        return { ...response.data, totalCount: response?.data?.total };
      } else {
        props.setArticleInventoryLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch (err) {
      props.setArticleInventoryLoader(false);
      displaySnackMessages(ERROR_MESSAGE, "error");
      return defaultTableData;
    }
  };

  const redirectToCreateAllocation = async (expeditedAllocation) => {
    if (expeditedAllocation) {
      props.setDashboardLoaderFullScreen(true);
      setExpeditedAllocation(true);
      setRedirectionConfigurations({
        selectedArticles: selectedRows,
        storeData: [],
        filters:
          props.filterDashboardConfiguration.appliedFilterData.dependencyData || props.filterDependencyData,
        filteredSelection: null,
        popupLink: null,
        poCode: null,
      });
    } else {
      props.setInventorysmartCreateAllocationFilterDependency(
        props.filterDashboardConfiguration.appliedFilterData.dependencyData || props.filterDependencyData
      );
      props.setSelectedFilters(props.selectedFilters);
      props.setCreateAllocationArticles(selectedArticleIds);
      history.push(`${CREATE_ALLOCATION}?step=0&type=details`);
    }
  };

  useEffect(() => {
    const fetchColumnData = async () => {
      props.setArticleInventoryTableConfigLoader(true);
      let columns = await props.getArticleInventoryTableConfiguration();
      props.setArticleInventoryTableConfigLoader(false);
      let formattedColumns = agGridColumnFormatter(
        columns?.data?.data,
        null,
        storeCountActionMap
      );
      setArticleInventoryTableColumns(formattedColumns);
    };
    // fetchColumnData();
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
    let articleIds = selections.map((item) => item.article);
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
      (props.inventorysmartScreenConfig?.client==="_NA"||props.inventorysmartScreenConfig?.client === "_EU")?
      displaySnackMessages(MIN_ARTICLE_SELECTION_MESSAGE_rl, "error"):
      displaySnackMessages(MIN_ARTICLE_SELECTION_MESSAGE, "error")
    } else {
      redirectToCreateAllocation(expeditedAllocation);
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
    if (props.filterDashboardConfiguration?.appliedFilterData?.dependencyData?.length) {
      let filterChips = fetchFilterChipsToDownload(
        props.filterDashboardConfiguration?.appliedFilterData?.dependencyData
      );
      setDownloadFormatChipsDependency(filterChips);
    }
  }, [props.filterDashboardConfiguration?.appliedFilterData]);

  return (
    <>
      {expeditedAllocation && (
        <ExpeditedAllocation
          redirectionConfigurations={redirectionConfigurations}
          setExpeditedAllocation={setExpeditedAllocation}
        />
      )}
      <Loader
        loader={
          props.articleInventoryLoader ||
          props.articleInventoryTableConfigLoader
        }
      >
        <AgGridComponent  
          columns={articleInventoryTableColumns}
          rowdata={articleInventoryData}
          selectAllHeaderComponent={props.isCreateAllocationAllowed}
          onSelectionChanged={onSelectionChanged}
          tableIdentifier={'Decision_Dashboard'}
          inventorysmartScreenConfig={props.inventorysmartScreenConfig}
          downloadAsExcel={
            props.inventorysmartScreenConfig?.dashboard?.drillDown
              ?.enableInventoryDetailsDownload
          }
          disableExcelDownload={articleInventoryData.length ? false : true}
          rowSelection="multiple"
          uniqueRowId={"ph_code"}
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
            props.inventorysmartScreenConfig?.downloadRequiresMeta?.includes("DDDetails")
            &&
            props.inventorysmartScreenConfig?.excelDownloadMetaData
          }
          prependedContentDetails={prependData()}
        />
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
            onClick={() => handleCreateAllocation()}
            disabled={!props.isCreateAllocationAllowed}
          >
            Create Allocation
          </Button>
          {props.expeditedFlow && (
            <Button
              variant="contained"
              color="primary"
              id="productSetAllBtn"
              className={classes.button}
              onClick={() => handleCreateAllocation(true)}
            >
              Expedited Allocation
            </Button>
          )}
        </Grid>
      </Loader>
      <StoreArticleInventoryPopup
        active={openStoreArticleInventoryDialog}
        openModal={openStoreArticleInventoryPopUp}
        closeModal={closeStoreArticleInventoryPopUp}
        filters={props.selectedFilters}
        article={article}
        metric={metric}
        title={title}
        storeDcModal={storeDcModal}
        addReference={true}
      />
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
    expeditedFlow:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dashboard?.expeditedFlow,
    filterDependencyData:
      store.inventorysmartReducer.inventorySmartDashboardService
        .filterDependencyData,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getArticleInventoryTableConfiguration: (payload) =>
    dispatch(getArticleInventoryTableConfiguration(payload)),
  getArticleInventoryTableData: (payload, isHidden) =>
    dispatch(getArticleInventoryTableData(payload, isHidden )),
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
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StyleInventoryDetailsTable);
