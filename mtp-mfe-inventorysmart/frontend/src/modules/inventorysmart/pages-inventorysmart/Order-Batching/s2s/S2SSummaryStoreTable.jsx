import React, { useState, useEffect, useRef, useContext } from "react";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { cloneDeep, isEmpty } from "lodash";
import {
  getS2SSummaryStoreTableConfiguration,
  getS2SSummaryStoreTableData,
  setS2SSummaryStoreConfigLoader,
  setS2SSummaryStoreDataLoader,
  setS2SSummaryStoreTableData,
  setS2SReloadData,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-s2s-services";
import {
  handleErrorMessage,
  displaySnackMessages,
  mapFiltersForAiSmartFilter,
} from "../../inventorysmart-utility";
import { OrderBatchingS2SContext } from "./index.jsx";
import { getProgressBarCellStyle } from "../components/orderBatchingHelperFunctions";
import AiSmartFilterButton from "../../Decision-Dashboard/components/AiSmartFilterButton";
import AiSmartFilterChips from "../../Decision-Dashboard/components/AiSmartFilterChips";
import useAiSmartFilterChips from "../../Decision-Dashboard/components/useAiSmartFilterChips";
import { AI_SMART_FILTER_OB_S2S_STORE_LEVEL_DETAILS } from "../../Decision-Dashboard/components/aiSmartFilterDummyConstants";

const S2SSummaryStoreTable = (props) => {
  const agGridInstance = useRef(null);
  const aiChips = useAiSmartFilterChips();
  const [columnConfigs, setColumnConfigs] = useState([]);
  const [tableData, setTableData] = useState([]);
  const { selectedOption, sessionId } = useContext(OrderBatchingS2SContext);

  useEffect(() => {
    const fetchColumnConfig = async () => {
      props.setS2SSummaryStoreConfigLoader(true);
      try {
        let columns = await props.getS2SSummaryStoreTableConfiguration();
        columns?.data?.data?.forEach((col) => {
          if (col.sub_headers) {
            col.sub_headers.forEach((subCol) => {
              if (subCol.column_name === "store_to_perc_cap") {
                subCol.styleProgressBar = getProgressBarCellStyle;
              }

              //temporary logic to disable editable field will be replaced later
              if (subCol.column_name === "store_level_outbound_transfer_qty") {
                subCol.is_editable = false;
              }
            });
          }
        });
        let formattedColumns = agGridColumnFormatter(columns?.data?.data, null);
        setColumnConfigs(formattedColumns);
      } catch (e) {
        handleErrorMessage(e, props);
      } finally {
        props.setS2SSummaryStoreConfigLoader(false);
      }
    };
    fetchColumnConfig();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.s2sSelectedFilters)) {
      fetchSummaryStoreData();
    }
  }, [props.s2sSelectedFilters]);

  useEffect(() => {
    props.s2sReloadData && fetchSummaryStoreData();
  }, [props.s2sReloadData]);

  const fetchSummaryStoreData = async () => {
    try {
      props.setS2SSummaryStoreDataLoader(true);
      let body = {
        filters: props.s2sSelectedFilters,
      };
      if (selectedOption === "edit") {
        body.is_update_mode = true;
        body.session_id = sessionId;
      } else {
        body.session_id = "";
      }
      let response = await props.getS2SSummaryStoreTableData(body);
      if (response.data.status) {
        setTableData(cloneDeep(response.data.data));
        props.setS2SSummaryStoreTableData(response.data);
        if (response.data?.show_message) {
          displaySnackMessages(response.data?.message, "success", props);
        }
      } else {
        setTableData([]);
        props.setS2SSummaryStoreTableData({ data: [] });
      }
    } catch (e) {
      handleErrorMessage(e, props);
    } finally {
      props.setS2SSummaryStoreDataLoader(false);
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
      screenName={AI_SMART_FILTER_OB_S2S_STORE_LEVEL_DETAILS.screenName}
      tableId={AI_SMART_FILTER_OB_S2S_STORE_LEVEL_DETAILS.tableId}
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
          props.s2sSummaryStoreConfigLoader || props.s2sSummaryStoreDataLoader
        }
        minHeight={"120px"}
      >
        <AgGridComponent
          downloadAsExcel={tableData?.length ? true : false}
          columns={columnConfigs}
          rowdata={tableData}
          uniqueRowId={"store_code"}
          loadTableInstance={loadTableInstance}
          skipAutoColumn
          tableHeader={"Allocation Summary - Stores"}
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
    s2sSummaryStoreConfigLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingS2SService
        .s2sSummaryStoreConfigLoader,
    s2sSummaryStoreDataLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingS2SService
        .s2sSummaryStoreDataLoader,
    s2sSummaryStoreTableData:
      store.inventorysmartReducer.inventorySmartOrderBatchingS2SService
        .s2sSummaryStoreTableData,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getS2SSummaryStoreTableConfiguration: () =>
    dispatch(getS2SSummaryStoreTableConfiguration()),
  getS2SSummaryStoreTableData: (payload) =>
    dispatch(getS2SSummaryStoreTableData(payload)),
  setS2SSummaryStoreConfigLoader: (payload) =>
    dispatch(setS2SSummaryStoreConfigLoader(payload)),
  setS2SSummaryStoreDataLoader: (payload) =>
    dispatch(setS2SSummaryStoreDataLoader(payload)),
  setS2SSummaryStoreTableData: (payload) =>
    dispatch(setS2SSummaryStoreTableData(payload)),
  setS2SReloadData: (payload) => dispatch(setS2SReloadData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(S2SSummaryStoreTable);
