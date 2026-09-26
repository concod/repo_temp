import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { useTranslation } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { cloneDeep, isEmpty } from "lodash";
import {
  getS2SOrderBatchingTableData,
  setS2STableData,
  setS2SReloadData,
  setS2STableDataLoader,
  setS2STableConfigLoader,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-s2s-services";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { OrderBatchingS2SContext } from "./index.jsx";
import { mapFiltersForAiSmartFilter } from "../../inventorysmart-utility";
import AiSmartFilterButton from "../../Decision-Dashboard/components/AiSmartFilterButton";
import AiSmartFilterChips from "../../Decision-Dashboard/components/AiSmartFilterChips";
import useAiSmartFilterChips from "../../Decision-Dashboard/components/useAiSmartFilterChips";
import { AI_SMART_FILTER_OB_S2S_DETAILS_TABLE } from "../../Decision-Dashboard/components/aiSmartFilterDummyConstants";

const S2SDetailsTable = (props) => {
  const { t } = useTranslation();
  const articleTableGridInstance = useRef(null);
  const filterDependency = useRef(null);
  const cache_keyRef = useRef(null);

  const [orderBatchingTableColumns, setOrderBatchingTableColumns] = useState([]);
  const aiChips = useAiSmartFilterChips();
  const { selectedOption, sessionId } = useContext(OrderBatchingS2SContext);
  const selectedOptionRef = useRef(selectedOption);
  const sessionIdRef = useRef(sessionId);

  useEffect(() => {
    selectedOptionRef.current = selectedOption;
  }, [selectedOption]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    if (!isEmpty(props.s2sSelectedFilters)) {
      cache_keyRef.current = props.s2sCacheKey;
      filterDependency.current = props.s2sSelectedFilters;
      articleTableGridInstance?.current?.api?.setFilterModel(null);
      articleTableGridInstance?.current?.api?.refreshServerSideStore({
        purge: true,
      });
    }
  }, [props.s2sSelectedFilters]);

  useEffect(() => {
    if (props.s2sReloadData) {
      articleTableGridInstance?.current?.api?.refreshServerSideStore({
        purge: true,
      });
      articleTableGridInstance?.current?.api?.setFilterModel(null);
    }
  }, [props.s2sReloadData]);

  const formatTableColumns = (columns) => {
    let formattedColumns = agGridColumnFormatter(columns, null);
    setOrderBatchingTableColumns(formattedColumns);
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setS2STableDataLoader(true);
      props.setS2STableConfigLoader(true);
      let body = {
        filters: filterDependency.current,
        meta: {
          ...manualbody,
          limit: {
            limit: 100,
            page: pageIndex + 1,
          },
        },
        cache_key: cache_keyRef.current,
      };
      if (selectedOptionRef.current === "edit") {
        body.is_update_mode = true;
        body.session_id = sessionIdRef.current;
      }
      params.api.clearFocusedCell();
      let response = await props.getS2SOrderBatchingTableData(body);
      if (response.data.data != null) {
        formatTableColumns(response?.data?.data?.table_config);
        response.data.data.orders = agGridRowFormatter(
          response.data.data.orders,
          params?.api?.checkConfiguration,
          `unique_key`
        );
        props.setS2STableData(cloneDeep(response.data.data?.orders));
        props.setS2STableDataLoader(false);
        props.setS2STableConfigLoader(false);
        return {
          data: [...response.data.data.orders],
          totalCount: response.data.total,
        };
      } else {
        props.setS2STableData([]);
        props.setS2STableDataLoader(false);
        props.setS2STableConfigLoader(false);
        return { data: [] };
      }
    } catch (err) {
      props.setS2STableData([]);
      props.setS2STableDataLoader(false);
      props.setS2STableConfigLoader(false);
      return { data: [] };
    }
  };

  const loadTableInstance = (params) => {
    articleTableGridInstance.current = params;
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: { variant: variance },
    });
  };

  const applyAiSmartFilterToColumn = (columnName, values) => {
    if (!columnName) return;
    const api = articleTableGridInstance.current?.api;
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

  const smartFilterButton = props.inventorysmartScreenConfig?.order_triage_s2s
    ?.drillDown?.enableSmartFilter ? (
    <AiSmartFilterButton
      key="ai-smart-filter-btn"
      columns={orderBatchingTableColumns}
      filters={mapFiltersForAiSmartFilter(props?.s2sSelectedFilters)}
      onFilterApplied={applyAiSmartFilterToColumn}
        onAppliedFilterChange={aiChips.onAppliedFilterChange}
        onAppliedFilterCleared={aiChips.onAppliedFilterCleared}
      screenName={AI_SMART_FILTER_OB_S2S_DETAILS_TABLE.screenName}
      tableId={AI_SMART_FILTER_OB_S2S_DETAILS_TABLE.tableId}
      hideSuggestions
    />
  ) : null;

  const smartFilterChips = smartFilterButton ? (
    <AiSmartFilterChips
      chips={aiChips.chips}
      onChipClick={(chip) =>
        aiChips.handleChipClick(chip, applyAiSmartFilterToColumn)
      }
      onChipRemove={(chip) =>
        aiChips.handleChipRemove(chip, applyAiSmartFilterToColumn)
      }
    />
  ) : null;

  return (
    <>
      <Loader
        loader={
          props.s2sTableConfigLoader || props.s2sTableDataLoader
        }
        minHeight={"120px"}
      >
        <AgGridComponent
          columns={orderBatchingTableColumns}
          rowModelType="serverSide"
          serverSideStoreType="partial"
          cacheBlockSize={10}
          paginationPageSize={10}
          manualCallBack={manualCallBack}
          uniqueRowId={"unique_key"}
          loadTableInstance={loadTableInstance}
          hideSelectAll
          downloadAsExcel={true}
          tableHeader={t("inventorysmart.orderBatchingDetails", {
            module_label: props?.orderBatchingModuleLabel || "Order Batching",
          })}
          topLeftOptions={smartFilterChips}
          topRightOptions={smartFilterButton ? [smartFilterButton] : null}
        />
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    s2sSelectedFilters:
      store.inventorysmartReducer.inventorySmartOrderBatchingS2SService
        .s2sSelectedFilters,
    s2sReloadData:
      store.inventorysmartReducer.inventorySmartOrderBatchingS2SService
        .s2sReloadData,
    s2sCacheKey:
      store.inventorysmartReducer.inventorySmartOrderBatchingS2SService
        .s2sCacheKey,
    s2sTableConfigLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingS2SService
        .s2sTableConfigLoader,
    s2sTableDataLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingS2SService
        .s2sTableDataLoader,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    orderBatchingModuleLabel:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.orderBatchingConfig?.module_label,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getS2SOrderBatchingTableData: (payload) =>
    dispatch(getS2SOrderBatchingTableData(payload)),
  setS2STableData: (payload) => dispatch(setS2STableData(payload)),
  setS2STableDataLoader: (payload) => dispatch(setS2STableDataLoader(payload)),
  setS2STableConfigLoader: (payload) => dispatch(setS2STableConfigLoader(payload)),
  setS2SReloadData: (payload) => dispatch(setS2SReloadData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(S2SDetailsTable);
