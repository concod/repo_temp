import { Popover } from "impact-ui-v3";

import {
  ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import WarningIcon from "assets/IS_icons/IS_warning.svg";
import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { setInvalidAllocation } from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import {
  clearNotification,
  setMoveToTiageLoader,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { reCreateAllocationApi } from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import { addSnack } from "core/actions/snackbarActions";
import { DASHBOARD } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { useNavigate } from "react-router-dom-v5-compat";
import { deletePlans } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { makeStyles } from "@mui/styles";
import { replaceSpecialCharacter } from "../../../../../core/Utils/functions/utils";
import { autoFinalizeOrderBatchingData } from "../../../services-inventorysmart/Order-Batching/order-batching-services";

const useStyles = makeStyles((theme) => ({
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "#0D152CCC",
    zIndex: 1300,
    pointerEvents: "auto",
  },
  popoverCenter: {
    position: "fixed !important",
    top: "50% !important",
    left: "50% !important",
    transform: "translate(-50%, -50%) !important",
    width: "526px",
  },
  warningContainer: {
    background: "#FFF8D5",
    borderRadius: "4px",
    padding: "8px 16px",
    marginBottom: "8px",
  },
  warningIconContainer: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },
  warningMessage: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0D152C",
  },
  allocationContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "8px 16px",
    background: "#F5F6FA",
    borderRadius: "8px",
  },
  title: {
    fontSize: "16px",
    fontWeight: "500",
    color: "#1F2B4D",
  },
  titleSubTitle: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#1F2B4D",
  },
}));

const InvalidAllocation = (props) => {
  const [showInValidModal, setShowInValidModal] = useState(false);
  const [statusApiResponse, setStatusApiResponse] = useState({});

  const classes = useStyles();
  const allocationCode = new URLSearchParams(window.location.search).get(
    "allocation_code"
  );
  const navigate = useNavigate();

  useEffect(() => {
    let l_response = props.resposne.data;
    setShowInValidModal(l_response?.reallocate);
    setStatusApiResponse(l_response);
    props.setInvalidAllocation(l_response?.reallocate);
  }, [props.resposne]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onCloseModalHandler = () => {
    if(props?.closeCallback){
      props.closeCallback()
    }
    if (
      props.onCancelCallBack &&
      props.finalizeAllocationConfig?.checkCrossCountry
    ) {
      props.onCancelCallBack();
    }
    setShowInValidModal(false);
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    props.setMoveToTiageLoader(false);
  };

  const reCreateAllocation = async () => {
    try {
      props.setMoveToTiageLoader(true);
      setShowInValidModal(false);
      let l_createAllocationResponse = await props.reCreateAllocationApi({
        allocation_code: allocationCode,
      });
      displaySnackMessages(l_createAllocationResponse.data.message, "info");
      let allocated_code = new URLSearchParams(window.location.search).get(
        "allocation_code"
      );
      await props.clearNotification({
        event_id: [allocated_code],
        delete_type: "hard_delete",
      });
      setTimeout(() => {
        navigate(`${DASHBOARD}?step=0`);
      }, 500);
      props.setMoveToTiageLoader(false);
    } catch (e) {
      handleErrorMessage(e);
      props.setShowTables && props.setShowTables(false);
    } finally {
      props.setMoveToTiageLoader(false);
    }
  };

  async function excludeExceptionAndFinalise() {
    try {
      setShowInValidModal(false);
      props.setMoveToTiageLoader(true);
      let l_finalizeResponse = await props.changePlanStatus({
        allocation_code: props.originalAllocationCode
          ? props.originalAllocationCode
          : props.allocationCode || props.autoAllocationCodeFromDashboard,
        ...(props?.resposne?.data?.articles_to_finalise &&
          props?.resposne?.data?.articles_to_finalise.length > 0 ? { article: props?.resposne?.data?.articles_to_finalise }
          : {}),
        edited_allocation_code: props.originalAllocationCode
          ? props.allocationCode
          : null,
        status: props.finalizeButtonType === "finalizeButton" ? 3 : 2,
        ...(props.finalizeAllocationConfig?.checkCrossCountry
          ? { check_cross_country: true }
          : {}),
        check_reallocation: true,
        plan_type: props?.planType,
      });
      if(l_finalizeResponse.data.status){
        if(!l_finalizeResponse.data?.data?.status){
          displaySnackMessages(l_finalizeResponse?.data?.data?.message, "error");
        }
        else if(l_finalizeResponse.data?.data?.reallocate){
          props.setShowTables && props.setShowTables(false);
          props.updatePlanStatusResponse && props.updatePlanStatusResponse(l_finalizeResponse.data);
        }
        else {
          if (props.finalizeDownstreamEnabled) {
            const autoFinalizeResponse = await props.autoFinalizeOrderBatchingData(
              {
                payload: [
                  {
                    allocation_code:
                    l_finalizeResponse.data?.data?.allocation_code || allocationCode,
                  },
                ],
              }
            );
          }
          displaySnackMessages(l_finalizeResponse.data?.data?.message, "success");
          setTimeout(() => {
            navigate(`${DASHBOARD}`);
          }, 500);
        }
      }
    } catch (e) {
      handleErrorMessage(e);
      props.setShowTables && props.setShowTables(false);
    } finally {
      props.setMoveToTiageLoader(false);
    }
  }

  const discardAllocation = async () => {
    try {
      props.setMoveToTiageLoader(true);
      let l_createAllocationResponse = await props.deletePlans({
        plan_codes: [allocationCode],
      });
      displaySnackMessages(l_createAllocationResponse.data.message, "success");
      setTimeout(() => {
        navigate(`${DASHBOARD}?step=0`);
      }, 1000);
      props.setMoveToTiageLoader(false);
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  return (
    <>
      {showInValidModal && (
        <div className={classes.overlay}>
        <Popover
          anchorReference="none"
          className={classes.popoverCenter}
          open={showInValidModal}
          onClose={() => onCloseModalHandler()}
          onPrimaryButtonClick={() => {
            //call finalize allocation api
            excludeExceptionAndFinalise();
          }}
          primaryButtonProps={{
            disabled: !props?.resposne?.data?.articles_to_finalise?.length
          }}
          onSecondaryButtonClick={() => reCreateAllocation()}
          primaryButtonLabel="Exclude exception & finalise"
          secondaryButtonLabel="Re-optimize allocation"
          title="Warning"
          closeOnBackdropClick={false}
        >
          <section>
            {statusApiResponse?.message && (
              <div className={classes.warningContainer}>
                <figure className={classes.warningIconContainer}>
                  <div>
                    <WarningIcon />
                  </div>
                  <figcaption>
                    <p className={classes.warningMessage}>
                      {statusApiResponse?.message}
                    </p>
                  </figcaption>
                </figure>
              </div>
            )}
            {statusApiResponse?.articles_with_inv_change.length > 0 && (
              <div className={classes.allocationContainer}>
                <p className={classes.title}>
                  {statusApiResponse?.article_label
                    ? statusApiResponse?.article_label + ":"
                    : "Materials:"}
                </p>
                <p className={classes.titleSubTitle}>
                  {statusApiResponse?.articles_with_inv_change.map(item => replaceSpecialCharacter(item)).join(", ")}
                </p>
              </div>
            )}
          </section>
        </Popover>
        </div>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    finalizeAllocationConfig:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartFinalizeAllocationConfig,
    finalizeDownstreamEnabled:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartFinalizeAllocationConfig?.finalizeDownstreamEnabled,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInvalidAllocation: (payload) => dispatch(setInvalidAllocation(payload)),
  setMoveToTiageLoader: (payload) => dispatch(setMoveToTiageLoader(payload)),
  reCreateAllocationApi: (payload) => dispatch(reCreateAllocationApi(payload)),
  deletePlans: (payload) => dispatch(deletePlans(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  clearNotification: (payload) => dispatch(clearNotification(payload)),
  autoFinalizeOrderBatchingData: (payload) =>
    dispatch(autoFinalizeOrderBatchingData(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(InvalidAllocation);
