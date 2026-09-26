import React, { useState, useEffect, useRef, useContext } from "react";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { cloneDeep, isEmpty } from "lodash";
import {
  getS2SSummaryStyleTableConfiguration,
  getS2SSummaryStyleTableData,
  setS2SSummaryStyleConfigLoader,
  setS2SSummaryStyleDataLoader,
  setS2SSummaryStyleTableData,
  setS2SReloadData,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-s2s-services";
import {
  handleErrorMessage,
  displaySnackMessages,
  mapFiltersForAiSmartFilter,
} from "../../inventorysmart-utility";
import { OrderBatchingS2SContext } from "./index.jsx";
import AiSmartFilterButton from "../../Decision-Dashboard/components/AiSmartFilterButton";
import AiSmartFilterChips from "../../Decision-Dashboard/components/AiSmartFilterChips";
import useAiSmartFilterChips from "../../Decision-Dashboard/components/useAiSmartFilterChips";
import { AI_SMART_FILTER_OB_S2S_STYLE_COLOR_LEVEL_DETAILS } from "../../Decision-Dashboard/components/aiSmartFilterDummyConstants";

const S2SSummaryStyleTable = (props) => {
  const agGridInstance = useRef(null);
  const aiChips = useAiSmartFilterChips();
  const [columnConfigs, setColumnConfigs] = useState([]);
  const [tableData, setTableData] = useState([]);
  const { selectedOption, sessionId } = useContext(OrderBatchingS2SContext);

  useEffect(() => {
    const fetchColumnConfig = async () => {
      props.setS2SSummaryStyleConfigLoader(true);
      try {
        let columns = await props.getS2SSummaryStyleTableConfiguration();
        let formattedColumns = agGridColumnFormatter(columns?.data?.data, null);
        setColumnConfigs(formattedColumns);
      } catch (e) {
        handleErrorMessage(e, props);
      } finally {
        props.setS2SSummaryStyleConfigLoader(false);
      }
    };
    fetchColumnConfig();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.s2sSelectedFilters)) {
      fetchSummaryStyleData();
    }
  }, [props.s2sSelectedFilters]);

  useEffect(() => {
    props.s2sReloadData && fetchSummaryStyleData();
  }, [props.s2sReloadData]);

  const fetchSummaryStyleData = async () => {
    try {
      props.setS2SSummaryStyleDataLoader(true);
      let body = {
        filters: props.s2sSelectedFilters,
      };
      if (selectedOption === "edit") {
        body.is_update_mode = true;
        body.session_id = sessionId;
      } else {
        body.session_id = "";
      }
      let response = await props.getS2SSummaryStyleTableData(body);
      if (response.data.status) {
        setTableData(cloneDeep(response.data.data));
        props.setS2SSummaryStyleTableData(response.data);
        if (response.data?.show_message) {
          displaySnackMessages(response.data?.message, "success", props);
        }
      } else {
        setTableData([]);
        props.setS2SSummaryStyleTableData({ data: [] });
      }
    } catch (e) {
      handleErrorMessage(e, props);
    } finally {
      props.setS2SSummaryStyleDataLoader(false);
    }
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const applyAiSmartFilterToColumn = (columnName, values) => {
    if (!columnName) return;
    const api = agGridInstance.current?.api;
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
      columns={columnConfigs}
      filters={mapFiltersForAiSmartFilter(props?.s2sSelectedFilters)}
      onFilterApplied={applyAiSmartFilterToColumn}
        onAppliedFilterChange={aiChips.onAppliedFilterChange}
        onAppliedFilterCleared={aiChips.onAppliedFilterCleared}
      screenName={AI_SMART_FILTER_OB_S2S_STYLE_COLOR_LEVEL_DETAILS.screenName}
      tableId={AI_SMART_FILTER_OB_S2S_STYLE_COLOR_LEVEL_DETAILS.tableId}
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
          props.s2sSummaryStyleConfigLoader || props.s2sSummaryStyleDataLoader
        }
        minHeight={"120px"}
      >
        <AgGridComponent
          downloadAsExcel={tableData?.length ? true : false}
          columns={columnConfigs}
          rowdata={tableData}
          uniqueRowId={"article"}
          loadTableInstance={loadTableInstance}
          skipAutoColumn
          tableHeader={"Allocation Summary - Styles"}
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
    s2sSummaryStyleConfigLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingS2SService
        .s2sSummaryStyleConfigLoader,
    s2sSummaryStyleDataLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingS2SService
        .s2sSummaryStyleDataLoader,
    s2sSummaryStyleTableData:
      store.inventorysmartReducer.inventorySmartOrderBatchingS2SService
        .s2sSummaryStyleTableData,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getS2SSummaryStyleTableConfiguration: () =>
    dispatch(getS2SSummaryStyleTableConfiguration()),
  getS2SSummaryStyleTableData: (payload) =>
    dispatch(getS2SSummaryStyleTableData(payload)),
  setS2SSummaryStyleConfigLoader: (payload) =>
    dispatch(setS2SSummaryStyleConfigLoader(payload)),
  setS2SSummaryStyleDataLoader: (payload) =>
    dispatch(setS2SSummaryStyleDataLoader(payload)),
  setS2SSummaryStyleTableData: (payload) =>
    dispatch(setS2SSummaryStyleTableData(payload)),
  setS2SReloadData: (payload) => dispatch(setS2SReloadData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(S2SSummaryStyleTable);
