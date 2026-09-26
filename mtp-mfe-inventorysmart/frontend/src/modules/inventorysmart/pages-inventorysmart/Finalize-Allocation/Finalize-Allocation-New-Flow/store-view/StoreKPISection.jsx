import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useTranslation } from "impact-ui-v3";
import { addSnack } from "core/actions/snackbarActions";
import { setProductStoreViewSummaryLoader } from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-product-view-services";
import {
  getStoreViewSummary,
  setFetchArticleSummary,
  setFetchStoreDetails,
} from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-store-view-services";
import { getIgnoreAllocationCode } from "../../../Create-Allocation/helperFunctions";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import useRefreshSignal from "../../utils/useRefreshSignal";
import useSnack from "../utils/useSnack";
import { RecommendationKPISection } from "../kpi";

/** Store view KPI section: displays summary metrics (available, allocated, etc.) for the store tab. */
const StoreKPISection = (props) => {
  const { t } = useTranslation();
  const displaySnackMessages = useSnack(props.addSnack);
  const [kpiState, setKpiState] = useState({
    tableConfig: [],
    tableData: {},
  });

  /** Fetch store view summary KPI data on mount and when allocationCode/planType change. */
  const fetchSummary = async () => {
    try {
      props.setProductStoreViewSummaryLoader(true);
      const isV3 = props.isV3?.includes("storeDetailsSummary");
      const payload = {
        allocation_code: props.allocationCode,
        article: props.articles || [],
        ignore_allocation_code: getIgnoreAllocationCode(
          props.originalAllocationCode,
          props.allocationCode
        ),
        plan_status: props.planStatus,
        plan_type: props.planType,
      };
      const response = await props.getStoreViewSummary(payload, isV3);
      if (response?.data?.status) {
        const data = response.data.data;
        setKpiState({
          tableConfig: data.table_config || [],
          tableData:
            (data.table_data && data.table_data[0]) || data.table_data || {},
        });
      }
    } catch (e) {
      const errObj = e?.response?.data;
      displaySnackMessages(
        errObj?.show_message ? errObj.message : ERROR_MESSAGE,
        "error"
      );
    } finally {
      props.setProductStoreViewSummaryLoader(false);
    }
  };

  useEffect(() => {
    if (
      props.allocationCode &&
      props.planType &&
      props.fetchArticleSummary === null
    ) {
      fetchSummary();
    }
  }, [props.planType, props.fetchArticleSummary]);

  useEffect(() => {
    if (props.fetchArticleSummary) {
      fetchSummary()
        .then(() => {
          props.setFetchArticleSummary(false);
          props.setFetchStoreDetails(true);
        })
        .catch(() => {
          props.setFetchArticleSummary(false);
          props.setFetchStoreDetails(true);
        });
    }
  }, [props.fetchArticleSummary]);

  useRefreshSignal(props.productViewRefreshToken, fetchSummary);

  return (
    <RecommendationKPISection
      headerTitle={t("inventorysmart.finalize.recommendation.summary")}
      tableConfig={kpiState.tableConfig}
      tableData={kpiState.tableData}
      loader={props.productStoreViewSummaryLoader}
    />
  );
};

const mapStateToProps = (store) => ({
  productStoreViewSummaryLoader:
    store.inventorysmartReducer.inventorySmartNewFlowProductViewService
      .productStoreViewSummaryLoader,
  allocationCode:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .allocationCode,
  planStatus:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .planStatus,
  planType:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService.planType,
  originalAllocationCode:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .originalAllocationCode,
  articles:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService.articles,
  isV3:
    store?.inventorysmartReducer?.inventorySmartCommonService
      ?.inventorysmartScreenConfig?.isV3,
  fetchArticleSummary:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .fetchArticleSummary,
  productViewRefreshToken:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .productViewRefreshToken,
});

const mapDispatchToProps = (dispatch) => ({
  getStoreViewSummary: (payload, isV3) =>
    dispatch(getStoreViewSummary(payload, isV3)),
  setProductStoreViewSummaryLoader: (val) =>
    dispatch(setProductStoreViewSummaryLoader(val)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  setFetchArticleSummary: (val) => dispatch(setFetchArticleSummary(val)),
  setFetchStoreDetails: (val) => dispatch(setFetchStoreDetails(val)),
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreKPISection);
