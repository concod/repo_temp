import { useEffect, useRef } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import { Button, Tooltip } from "impact-ui-v3";
import { vpaStoreCardStyles } from "./StoreToStore/VPACardStyles";
import { cloneDeep } from "lodash";
import moment from "moment";
import { CREATE_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import {
  setSelectedFilters,
  setFormFilters,
  setInventorySmartFinalizeFilterDependency,
  setRedirectedFrom,
} from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import {
  resetCardsData,
  setVpaConfiguration,
  setAppliedFiltersVPA,
  setSelectedFiltersVPA,
  setS2SPastAllocationTableData,
  setVpaConfigurationS2S,
  setAppliedFiltersVPAS2S,
  setSelectedFiltersVPAS2S,
  setFormDataS2S,
} from "modules/inventorysmart/services-inventorysmart/View-Past-Allocation/view-past-allocation";
import { REDIRECT_FROM_VIEW_PAST_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const ViewPastAllcationCardView = (props) => {
  const classes = vpaStoreCardStyles();
  const navigate = useNavigate();
  const tenantDateFormat =
    localStorage.getItem("tenantDateFormat") || "DD-MM-YYYY";

  const latestVpaConfigurationRef = useRef(null);
  const latestAppliedFiltersVPARef = useRef({});
  const latestSelectedFiltersVPARef = useRef({});

  useEffect(() => {
    if (!props.isStoretoStore) {
      const viewCfg =
        props.filterReducer?.filterDashboardConfiguration
          ?.viewPastAllocationFilterConfiguration;
      latestVpaConfigurationRef.current = viewCfg ? cloneDeep(viewCfg) : null;
      latestAppliedFiltersVPARef.current = cloneDeep(
        viewCfg?.appliedFilterData || {}
      );
      latestSelectedFiltersVPARef.current = cloneDeep(
        props.filterReducer?.selectedFilters || {}
      );
    }
  }, [props.filterReducer]);

  useEffect(() => {
    return () => {
      if (props.isStoretoStore) {
        props.setS2SPastAllocationTableData([]);
      } else {
        props.resetCardsData([]);
      }
    };
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: moment(date).format(tenantDateFormat),
      time: date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    };
  };

  const onReviewClick = (p_tableData) => {
    props.setSelectedFilters(props.selectedFilters);
    props.setRedirectedFrom("viewPastAllocation");
    props.setInventorySmartFinalizeFilterDependency(
      props.inventorysmartPastAllocationFilterDependency
    );
    props.setFormFilters({ selectedDates: props.selectedDates });
    props.setVpaConfiguration(
      cloneDeep(latestVpaConfigurationRef.current || {})
    );
    props.setAppliedFiltersVPA(
      cloneDeep(latestAppliedFiltersVPARef.current || {})
    );
    props.setSelectedFiltersVPA(
      cloneDeep(latestSelectedFiltersVPARef.current || {})
    );
    navigate(
      `${CREATE_ALLOCATION}?step=2&allocation_code=${p_tableData.plan_code}`,
      { state: { isRedirectedFrom: "viewPastAllocation" } }
    );
  };

  const onViewRecommendationClick = (card) => {
    const viewCfg =
      props.filterReducer?.filterDashboardConfiguration
        ?.viewPastAllocationFilterConfigurationS2S;
    props.setVpaConfigurationS2S(cloneDeep(viewCfg || {}));
    props.setAppliedFiltersVPAS2S(cloneDeep(viewCfg?.appliedFilterData || {}));
    props.setSelectedFiltersVPAS2S(
      cloneDeep(props.filterReducer?.selectedFilters || {})
    );
    props.setFormDataS2S({ selectedDates: props.selectedDates });
    navigate(
      `/inventory-smart/create-store-transfer?step=1&allocation_code=${card?.plan_code}&rd=${REDIRECT_FROM_VIEW_PAST_ALLOCATION}`
    );
  };

  const finalData = props.isStoretoStore
    ? props?.s2sPastAllocationTableData
    : props.pastAllocationCardsData;

  return (
    <>
      <div className={classes.mainGridCardContainer}>
        <div className="inv-card-view-header">
          <div className="inv-card-view-header-title">
            View Past Allocation Card View
          </div>
          <div className="inv-card-button-render">
            {props.renderCenterOptions()}
          </div>
        </div>
        {finalData?.length > 0 && (
          <div
            className={classes.cardGridStoreTransfer}
            style={{
              maxHeight: `calc(100vh - ${
                props.showHeader
                  ? 200 - (props.isFilterStripVisible ? 0 : 60)
                  : 256 - (props.isFilterStripVisible ? 0 : 64)
              }px)`,
              overflowY: "scroll",
            }}
          >
            {finalData.map((card) => (
              <div key={card?.plan_code} className={classes.cardStoreTransfer}>
                <div className={classes.cardHeaderStoreTransfer}>
                  <div className={classes.headerRowStoreTransfer}>
                    <div className={classes.headerLabelStoreTransfer}>
                      Plan name
                    </div>
                    <Tooltip
                      title={card?.name}
                      variant="tertiary"
                      orientation="bottom"
                    >
                      <div className={classes.headerValuePlanNameStoreTransfer}>
                        {card?.name}
                      </div>
                    </Tooltip>
                  </div>
                  <div className={classes.headerRowStoreTransfer}>
                    <div className={classes.headerLabelStoreTransfer}>
                      Created by
                    </div>
                    <div className={classes.headerValueCreatedByStoreTransfer}>
                      {card?.created_by}
                    </div>
                  </div>
                  <div className={classes.headerRowStoreTransfer}>
                    <div className={classes.headerLabelStoreTransfer}>
                      Created on
                    </div>
                    <div className={classes.headerValueStoreTransfer}>
                      {formatDate(card?.created_at).date}
                    </div>
                  </div>
                </div>

                <div className={classes.cardBodyStoreTransfer}>
                  <div className={classes.bodyRowStoreTransfer}>
                    <div className={classes.bodyLabelStoreTransfer}>
                      {props.dynamicViewPastCardLabels[
                        "no_allocated_articles"
                      ] || "# Styles allocated"}
                    </div>
                    <div className={classes.tagsContainerStoreTransfer}>
                      {card?.no_allocated_articles}
                    </div>
                  </div>
                  <div className={classes.bodyRowStoreTransfer}>
                    <div className={classes.bodyLabelStoreTransfer}>
                      {props.dynamicViewPastCardLabels["no_stores_allocated"] ||
                        "# Stores"}
                    </div>
                    <div className={classes.bodyValueStoreTransfer}>
                      {card?.no_stores_allocated}
                    </div>
                  </div>
                  <div className={classes.bodyRowStoreTransfer}>
                    <div className={classes.bodyLabelStoreTransfer}>
                      Released on
                    </div>
                    <div className={classes.bodyValueStoreTransfer}>
                      <span className={classes.releaseDateStoreTransfer}>
                        {formatDate(card?.created_at).date}{" "}
                      </span>
                      <span className={classes.releaseTimeStoreTransfer}>
                        {formatDate(card?.created_at).time}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={classes.cardFooterStoreTransfer}>
                  <Button
                    variant="url"
                    onClick={() =>
                      props.isStoretoStore
                        ? onViewRecommendationClick(card)
                        : onReviewClick(card)
                    }
                  >
                    View recommendation &gt;
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={classes.transparentStickyFooterStoreTransfer} />
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    s2sPastAllocationTableData:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .S2SPastAllocationTableData,
    dynamicViewPastCardLabels:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .dynamicViewPastCardLabels,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .selectedFilters,
    inventorysmartPastAllocationFilterDependency:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .inventorysmartPastAllocationFilterDependency,
    pastAllocationCardsData:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .pastAllocationCardsData,
    filterReducer: store.filterReducer,
    isFilterStripVisible: store?.filterReducer?.showFilters,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setS2SPastAllocationTableData: (payload) =>
    dispatch(setS2SPastAllocationTableData(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setFormFilters: (payload) => dispatch(setFormFilters(payload)),
  setInventorySmartFinalizeFilterDependency: (payload) =>
    dispatch(setInventorySmartFinalizeFilterDependency(payload)),
  setRedirectedFrom: (payload) => dispatch(setRedirectedFrom(payload)),
  resetCardsData: () => dispatch(resetCardsData()),
  setVpaConfiguration: (newData) => dispatch(setVpaConfiguration(newData)),
  setAppliedFiltersVPA: (newData) => dispatch(setAppliedFiltersVPA(newData)),
  setSelectedFiltersVPA: (newData) => dispatch(setSelectedFiltersVPA(newData)),
  setVpaConfigurationS2S: (newData) =>
    dispatch(setVpaConfigurationS2S(newData)),
  setAppliedFiltersVPAS2S: (newData) =>
    dispatch(setAppliedFiltersVPAS2S(newData)),
  setSelectedFiltersVPAS2S: (newData) =>
    dispatch(setSelectedFiltersVPAS2S(newData)),
  setFormDataS2S: (newData) => dispatch(setFormDataS2S(newData)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ViewPastAllcationCardView);
