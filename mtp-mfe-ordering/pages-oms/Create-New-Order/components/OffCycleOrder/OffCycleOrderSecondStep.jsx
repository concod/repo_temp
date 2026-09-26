import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { connect } from "react-redux";
import { Button, Prompt, Loader } from "impact-ui-v3";
import { Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import moment from "moment";
import InfoIcon from "@mui/icons-material/Info";
import makeStyles from "@mui/styles/makeStyles";
import { getOmsCoreFiscalCalendar } from "modules/oms/services-oms/common/common-services";
import {
  setOffCycleOrderDeepDiveFilters,
  CNO_OFFCYCLE_DEEP_DIVE_FILTERS,
  discardOffCycleOrderDraft,
} from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service.js";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import OffCycleProductDetailsTable from "./OffCycleProductDetailsTable";
import HighLevelAggregateView from "./HighLevelAggregateView";
import OffCycleOrderDeepDive from "modules/oms/pages-oms/OffCycle Order/OffCycleOrder-Deep-Dive";
import { DECISION_DASHBOARD } from "modules/oms/constants-oms/routeConstants";
import OffCycleApprovalFlowDialog from "modules/oms/pages-oms/OffCycle Order/OffCycleOrder-Approval-Flow/OffCycleApprovalFlowDialog";
import ExitWarningPrompt from "modules/oms/pages-oms/OffCycle Order/OffCycleOrder-Deep-Dive/ExitWarningPrompt";

const useStyles = makeStyles({
  selectProductInfo: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    backgroundColor: "#e3f2fd",
    borderRadius: "4px",
  },
  selectProductInfoIcon: {
    fontSize: "16px",
    color: "#1976d2",
    fontWeight: "bold",
  },
  selectProductInfoText: {
    fontSize: "14px",
    color: "#1565c0",
    fontWeight: 500,
  },
  discardPromptContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    margin: "0.5rem",
  },
});

/**
 * Off-Cycle Order Second Step Component
 * Shows optimization results with Deep Dive, Aggregate View, and Product Details
 * Accessible only after backend optimization is complete (via notification)
 */
const OffCycleOrderSecondStep = (props) => {
  const globalClasses = globalStyles();
  const customClasses = useStyles();

  const location = useLocation();
  const navigate = useNavigate();

  const [draftId, setDraftId] = useState(null);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const [selectedProductsCount, setSelectedProductsCount] = useState(0);
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);
  const [showWarningPrompt, setShowWarningPrompt] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [getCheckConfig, setGetCheckConfig] = useState(null);
  const [reloadProductDetailsTable, setReloadProductDetailsTable] = useState(0);
  const [reloadDeepDive, setReloadDeepDive] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [weekRange, setWeekRange] = useState({});

  useEffect(() => {
    // Extract draft_id from URL params or location state
    const urlParams = new URLSearchParams(location.search);
    const draftIdParam = urlParams.get("draft_id");

    if (draftIdParam) {
      setDraftId(draftIdParam);
    }
  }, [location]);

  //Fetches the Filters for Deep Dive and Sets the State
  useEffect(() => {
    const getDeepDiveFilters = async () => {
      try {
        const deepDiveFiltersResponse = await props?.tenantConfigApiCache(1, {
          attribute_name: CNO_OFFCYCLE_DEEP_DIVE_FILTERS,
        });
        const DEEP_DIVE_FILTERS =
          deepDiveFiltersResponse.data.data[0]?.attribute_value?.value || [];
        props?.setDeepDiveFilters(DEEP_DIVE_FILTERS);
      } catch (error) {
        console.log("Error in Fetching Deep Dive Filters", error);
      }
    };
    if (props?.deepDiveFilters?.length === 0) {
      getDeepDiveFilters();
    }
  }, []);

  //Fetches Fiscal Calendar
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        setShowLoader(true);
        let startYear = moment().year();
        let endYear = moment().year() + 2;
        let queryParams = `?start_fiscal_year=${startYear}&end_fiscal_year=${endYear}`;
        const getFinancialCalendarData = await getOmsCoreFiscalCalendar(
          queryParams
        );
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
        setShowLoader(false);
      } catch (error) {
        setShowLoader(false);
        console.log(error);
      }
    };
    fetchFilters();
  }, []);

  const handleConfirmExit = () => {
    setShowWarningPrompt(false);
    // Go back to Step 1 (Ordering Constraints) using the callback from container
    if (props.onGoToStep1) {
      props.onGoToStep1();
    }
  };

  const handleCancelExit = () => {
    setShowWarningPrompt(false);
  };

  const handleShowWarningPrompt = () => {
    if (
      Object.values(props.offCycleOrderHasUnsavedChanges).some(
        (value) => value === true
      )
    ) {
      setHasUnsavedChanges(true);
      setShowWarningPrompt(true);
    } else {
      setHasUnsavedChanges(false);
      setShowWarningPrompt(true);
    }
  };

  const handleDiscardDraft = () => {
    setShowDiscardPrompt(true);
  };

  const handleConfirmDiscard = async () => {
    try {
      const payload = {
        draft_id: [draftId],
      };

      const response = await props.discardOffCycleOrderDraft(payload);

      if (response?.data?.status) {
        props.closeSnack();
        props.addSnack({
          message: "Draft discarded successfully",
          options: {
            variant: "success",
          },
        });
        navigate(DECISION_DASHBOARD);
      } else {
        props.closeSnack();
        props.addSnack({
          message: response?.data?.message || ERROR_MESSAGE,
          options: {
            variant: "error",
          },
        });
      }
    } catch (error) {
      console.error("Error discarding draft:", error);
      props.closeSnack();
      props.addSnack({
        message: ERROR_MESSAGE,
        options: {
          variant: "error",
        },
      });
    } finally {
      setShowDiscardPrompt(false);
    }
  };

  const handleCancelDiscard = () => {
    setShowDiscardPrompt(false);
  };

  const handleApproveOrders = () => {
    setShowApprovalModal(true);
  };

  // Callback to receive selection data from child table
  const handleSelectionChange = (count, articles, getCheckConfigFn) => {
    setSelectedProductsCount(count);
    setSelectedArticles(articles);
    setGetCheckConfig(() => getCheckConfigFn);
  };

  // reload components after HighLevelAggregateView save
  const handleAggregateViewSaveSuccess = () => {
    setReloadProductDetailsTable((prev) => prev + 1);
    setReloadDeepDive((prev) => prev + 1);
  };

  // reload components after Product Details Table save/set all
  const handleProductDetailsSaveSuccess = () => {
    setReloadProductDetailsTable((prev) => prev + 1);
    setReloadDeepDive((prev) => prev + 1);
  };

  // reload components after Approval Flow Dialog close
  const reloadStepperComponents = () => {
    setReloadProductDetailsTable((prev) => prev + 1);
    setReloadDeepDive((prev) => prev + 1);
  };

  const showLoadingDraft = () => {
    return (showLoader || !draftId) && !showDiscardPrompt && !showWarningPrompt;
  };

  return (
    <div>
      <div style={{ paddingBottom: "30px" }}>
        {/* Draft Info */}
        {draftId && (
          <>
            {!showLoader && (
              <OffCycleOrderDeepDive
                draftId={draftId}
                fiscalCalendarDetails={fiscalCalendarDetails}
                onFilterApply={() =>
                  setReloadProductDetailsTable((prev) => prev + 1)
                }
                reloadTrigger={reloadDeepDive}
                onWeekRangeChange={setWeekRange}
              />
            )}

            <HighLevelAggregateView
              draftId={draftId}
              deepDiveFilters={props.deepDiveFiltersPayload?.filters || []}
              reloadTrigger={reloadProductDetailsTable}
              onSaveSuccess={handleAggregateViewSaveSuccess}
              weekRange={weekRange}
            />

            <OffCycleProductDetailsTable
              draftId={draftId}
              onSelectionChange={handleSelectionChange}
              deepDiveFilters={props.deepDiveFiltersPayload?.filters || []}
              reloadTrigger={reloadProductDetailsTable}
              onSaveSuccess={handleProductDetailsSaveSuccess}
              weekRange={weekRange}
            />
          </>
        )}

        {showLoadingDraft() && (
          <div className={globalClasses.centerAlign}>
            <Loader progress="50%" size="large" text="Loading..." />
          </div>
        )}
      </div>

      <div className={globalClasses.stickyFooter}>
        <Button variant="tertiary" onClick={handleShowWarningPrompt}>
          {"< Back to off cycle order input plan"}
        </Button>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {selectedProductsCount === 0 && (
            <div className={customClasses.selectProductInfo}>
              <InfoIcon
                fontSize="small"
                className={customClasses.selectProductInfoIcon}
              />
              <Typography className={customClasses.selectProductInfoText}>
                Select atleast one product to approve the order.
              </Typography>
            </div>
          )}
          <Button variant="outlined" onClick={handleDiscardDraft}>
            Discard Draft
          </Button>
          <Button
            variant="primary"
            onClick={handleApproveOrders}
            disabled={selectedProductsCount === 0}
          >
            Approve orders
          </Button>
        </div>
      </div>

      {/* Discard Confirmation Dialog */}
      <Prompt
        isOpen={showDiscardPrompt}
        variant="warning"
        title="Discard Draft"
        primaryButtonLabel="Yes, Discard"
        secondaryButtonLabel="Cancel"
        onPrimaryButtonClick={handleConfirmDiscard}
        onSecondaryButtonClick={handleCancelDiscard}
        handleClose={handleCancelDiscard}
      >
        <div className={customClasses.discardPromptContent}>
          <p>Are you sure you want to discard this draft?</p>
          <p>This action cannot be undone.</p>
        </div>
      </Prompt>

      {/* Warning Dialog */}
      <ExitWarningPrompt
        showWarningPrompt={showWarningPrompt}
        hasUnsavedChanges={hasUnsavedChanges}
        handleConfirmExit={handleConfirmExit}
        handleCancelExit={handleCancelExit}
      />

      {/* Approval Flow Dialog */}
      {showApprovalModal && (
        <OffCycleApprovalFlowDialog
          setShowApprovalModal={setShowApprovalModal}
          draftId={draftId}
          selectedArticles={selectedArticles}
          deepDiveFilters={props.deepDiveFilters}
          deepDiveFiltersPayload={props.deepDiveFiltersPayload?.filters || []}
          getCheckConfigurationForProductDetails={getCheckConfig}
          weekRange={weekRange}
          reloadComponent={reloadStepperComponents}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    deepDiveFilters:
      store.omsReducer.offCycleOrderService.offCycleOrderDeepDiveFilters,
    deepDiveFiltersPayload:
      store.omsReducer.offCycleOrderService.offCycleOrderDeepDiveFiltersPayload,
    offCycleOrderHasUnsavedChanges:
      store.omsReducer.offCycleOrderService.offCycleOrderHasUnsavedChanges,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setDeepDiveFilters: (payload) =>
    dispatch(setOffCycleOrderDeepDiveFilters(payload)),
  tenantConfigApiCache: (application, queryParam) =>
    dispatch(tenantConfigApiCache(application, queryParam)),
  discardOffCycleOrderDraft: (payload) =>
    dispatch(discardOffCycleOrderDraft(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OffCycleOrderSecondStep);
