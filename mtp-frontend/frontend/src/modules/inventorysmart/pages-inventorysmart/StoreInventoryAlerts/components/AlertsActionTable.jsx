import React, { useState, useEffect, useRef, forwardRef } from "react";
import { connect } from "react-redux";

import {
  getAlertsActionTableConfiguration,
  getServerSideAlertsData,
  setAlertsActionTableConfigLoader,
} from "modules/inventorysmart/services-inventorysmart/StoreInventoryAlerts/alerts-actions-service";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import DownloadButton from "./Download";

import {
  defaultTableData,
  ERROR_MESSAGE,
  STORE_INVENTORY_ALERT_ACTION_CONFIG,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { cloneDeep } from "lodash";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { addSnack } from "core/actions/snackbarActions";
import {
  getFilterDependencyProductAndStoreAttributes,
  getServerSidePaginationAPIPayload,
} from "../../inventorysmart-utility";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

const AlertsActionTable = (props) => {
  const [
    alertsActionTableTableConfig,
    setAlertsActionTableTableConfig,
  ] = useState([]);
  const [
    alertsActionDownloadAllTableConfig,
    setAlertsActionDownloadAllTableConfig,
  ] = useState([]);
  const [alertsActionTableData, setAlertsActionTableData] = useState([]);
  const [alertsActionTableDataCount, setAlertsActionTableDataCount] = useState(
    0
  );
  const agGridInstance = useRef(null);

  const onReviewClick = (data, isAlertPaginated) => {
    props.onReviewClick(data, isAlertPaginated);
    if (isAlertPaginated) {
      agGridInstance.current?.api?.redrawRows();
    }
  };

  const getDownloadRequestBody = () => {
    let excludedFilterValues = props.excludedFilterValues
      ? props.excludedFilterValues
      : [];

    const filters = getFilterDependencyProductAndStoreAttributes([
      ...props.selectedFilters,
      ...excludedFilterValues,
    ]);
    filters.table_config = [...alertsActionDownloadAllTableConfig];
    return filters;
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setShowTableLoader(true);
      let excludedFilterValues = props.excludedFilterValues
        ? props.excludedFilterValues
        : [];
      if (dynamicLabelsBasedOnTenant("article") === "SKU") {
        excludedFilterValues = [];
      }
      const filters = getFilterDependencyProductAndStoreAttributes([
        ...props.selectedFilters,
      ]);

      let payload = getServerSidePaginationAPIPayload(
        props.alertTableLink,
        filters,
        manualbody,
        pageIndex,
        props.includeExclusionFilter,
        props.excludeURLObject,
        params
      );

      let response = await props.getServerSideAlertsData(payload);
      response.data.data = response.data.data.map((dataItem, index) => {
        dataItem.index = index;
        dataItem.action = "Review";
        return dataItem;
      });

      if (response.data.status) {
        let formattedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          props.uniqueKey
        );

        props.setShowTableLoader(false);
        setAlertsActionTableData(formattedData);
        setAlertsActionTableDataCount(response.data.total);
        return { data: formattedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setShowTableLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setShowTableLoader(false);
      return defaultTableData;
    }
  };

  useEffect(() => {
    const fetchColumnConfig = async () => {
    try {
      props.setAlertsActionTableConfigLoader(true);

      let columns;
      if (props.tableConfigName) {
        const payload = {
          tableConfigName: props.tableConfigName,
        };
        columns = await props.getAutoRecommendationTableConfiguration(payload);
      } else if (props.tableConfig) {
        columns = {
          data: {
            data: cloneDeep(props.tableConfig),
          },
        };
      }

      if (props?.downloadAllLink && props?.downloadAllTableConfigName) {
        const downloadAllTableConfigPayload = {
          tableConfigName: props.downloadAllTableConfigName,
        };

        const downloadAllTableColumns = await props.getAutoRecommendationTableConfiguration(
          downloadAllTableConfigPayload
        );
        let formattedDownloadAllColumns = agGridColumnFormatter(
          downloadAllTableColumns?.data?.data
        );
        setAlertsActionDownloadAllTableConfig(formattedDownloadAllColumns);
      }

      let reviewRecommendationColumn = STORE_INVENTORY_ALERT_ACTION_CONFIG[0];
      reviewRecommendationColumn.order_of_display =
        columns.data.data.length + 1;
      reviewRecommendationColumn.tc_code = columns.data.data[0]?.tc_code;
      reviewRecommendationColumn.tc_mapping_code =
        columns.data.data[0]?.tc_mapping_code;

      columns.data.data.push(reviewRecommendationColumn);

      let formattedColumns;

      if (reviewRecommendationColumn.tc_code === 325 ) {
        formattedColumns = agGridColumnFormatter([...columns?.data?.data]);
        const updatedConfig = formattedColumns.map(column => {
          if (column.accessor=== 'action') {
              return {
                  ...column,
                  suppressMenu: true,
                  lockPosition: "right",
              };
          }
          return column;
      });
      setAlertsActionTableTableConfig(updatedConfig);
      
      } else {
        formattedColumns = agGridColumnFormatter(columns?.data?.data);
        setAlertsActionTableTableConfig(formattedColumns);
      }
     
      props.setAlertsActionTableConfigLoader(false);
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
    };
    fetchColumnConfig();

    return () => {
      setAlertsActionTableTableConfig([]);
      setAlertsActionTableData([]);
      setAlertsActionTableDataCount(0);
    };
  }, []);

  useEffect(() => {
    if (props.tableData?.length > 0) {
      const data = props.tableData.map((item, index) => {
        item.index = index;
        item.action = "Review";
        return item;
      });
      if(props.alertInfo.level === 3 && props.tableConfigName === 'auto_allocation_level_1'){
        data.filter((item) => {
          item.store_code === props.alertInfo.store_code
        })
      }
      setAlertsActionTableData(data);
      agGridInstance.current?.api?.redrawRows();
    }
  }, [props.tableData]);

  const loadAlertsTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const getColorForVB = (params) => {
    let l_popupData = params?.data?.pop_up_data;
    let l_totalArticles = l_popupData?.length;
    let l_articleAllocatedOnce = 0;
    let l_articleAllocatedMoreThanOnce = 0;
    let l_articlesWithNoAllocation = 0;
    l_popupData?.forEach((article) => {
      if (article?.number_of_allocations === 1) {
        l_articleAllocatedOnce++;
      } else if (article?.number_of_allocations > 1) {
        l_articleAllocatedMoreThanOnce++;
      } else {
        l_articlesWithNoAllocation++;
      }
    });

    if (
      l_totalArticles ===
      l_articleAllocatedOnce + l_articleAllocatedMoreThanOnce
    ) {
      if (l_totalArticles === l_articleAllocatedMoreThanOnce) {
        // return light yelloow
        return { background: "#ffd591" };
      } else {
        // return light green
        return { background: "#beffb7" };
      }
    } else if (l_articlesWithNoAllocation !== l_totalArticles) {
      // return light blue
      return { background: "#ADD8E6" };
    }
  };

  useEffect(() => {
    if (props.totalModelStockData) {
      alertsActionTableData?.forEach((item) => {
        if (
          item.index === props.totalModelStockData.index &&
          (item.sku === props.totalModelStockData.skuId ||
            item.article === props.totalModelStockData.skuId ||
            item.product_code === props.totalModelStockData.skuId)
        ) {
          item[`${props.reviewPrefix}_model_stock`] =
            props.totalModelStockData.sum;
        }
      });

      agGridInstance.current?.api?.redrawRows();
    }
  }, [props.totalModelStockData]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };
  return (
    <>
      <Loader
        loader={
          (props.alertsActionTableConfigLoader || props.loading) &&
          !props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
            "dashboard"
          )
        }
        minHeight={"188px"}
      >
        {props.downloadAllLink && (
          <DownloadButton
            url={props.downloadAllLink}
            requestBody={getDownloadRequestBody()}
            disable={
              !alertsActionTableDataCount &&
              alertsActionDownloadAllTableConfig.length === 0
            }
            includeExclusionFilter={props.includeExclusionFilter}
            excludeURLObject={props.excludeURLObject}
            columns={alertsActionTableTableConfig}
          />
        )}

        <AgGridComponent
          columns={alertsActionTableTableConfig}
          rowdata={!props.isPaginatedTableApi ? alertsActionTableData : null}
          {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
            "dashboard"
          )
            ? {
                pagination: false,
                rowModelType: props.isPaginatedTableApi && "infinite",
                cacheOverflowSize: 2,
                hideSelectCurrentPageRecords: true,
                // props.isPaginatedTableApi,
              }
            : {
                rowModelType: props.isPaginatedTableApi && "serverSide",
                serverSideStoreType: props.isPaginatedTableApi && "partial",
              })}
          manualCallBack={
            props.isPaginatedTableApi &&
            ((body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params))
          }
          onReviewClick={(tableInfo) =>
            onReviewClick(tableInfo.data, props.isPaginatedTableApi)
          }
          uniqueRowId={"index"}
          loadTableInstance={loadAlertsTableInstance}
          getRowStyle={(params) => {
            if (params?.data?.[`${props.reviewPrefix}_is_resolved`]) {
              return { background: "rgb(57 255 20 / 20%)" };
            } else {
              if (props?.inventorysmartScreenConfig?.client === "VB") {
                return getColorForVB(params);
              }
            }
          }}
          totalCount={alertsActionTableDataCount} // to set the total count once received from BE
          cacheBlockSize={10}
          {...(props.alertInfo?.clientSideDownload
            ? {
                downloadAsExcel: alertsActionTableData?.length,
              }
            : {})}
          toPrependContent={true}
          prependedContentDetails={props.prependData()}
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
    alertsActionTableConfigLoader:
      store.inventorysmartReducer.inventorySmartAlertsActionService
        .alertsActionTableConfigLoader,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDashboardService
        .selectedFilters,
    excludedFilterValues:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .filter_attribute_exclusion_values,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getAutoRecommendationTableConfiguration: (payload) =>
    dispatch(getAlertsActionTableConfiguration(payload)),
  setAlertsActionTableConfigLoader: (payload) =>
    dispatch(setAlertsActionTableConfigLoader(payload)),
  getServerSideAlertsData: (payload) =>
    dispatch(getServerSideAlertsData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AlertsActionTable);
