import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Button, useTranslation } from "impact-ui-v3";
import { Divider } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { Card } from "@mui/material";
import GroupIcon from "assets/IS_icons/IS_group.svg";
import StoreIcon from "assets/IS_icons/IS_store.svg";
import SkuIcon from "assets/IS_icons/IS_sku.svg";
import DataPointIcon from "assets/IS_icons/IS_data_points.svg";
import makeStyles from "@mui/styles/makeStyles";
import colors from "core/Styles/colours";
import Illustration from "assets/IS_icons/IS_illustration.svg";
import { setInventorysmartReloadOrderBatchingData } from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-services";

const useStyles = makeStyles(() => ({
  // Overlay styles for the popup
  popupOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  popupCard: {
    width: "900px",
    maxHeight: "90vh",
    backgroundColor: colors.white,
    borderRadius: "25px",
    boxShadow: "0px 24px 48px rgba(0, 0, 0, 0.15)",
    overflow: "auto",
    position: "relative",
    padding: "16px",
  },
  contentBody: {
    borderRadius: "10px",
    padding: "20px",
  },
  contentBodyText: {
    fontFamily: "Manrope",
    fontWeight: 600,
    fontSize: "14px",
    gap: "16px",
  },
  cardContentMainText: {
    fontFamily: "Manrope",
    fontWeight: 700,
    fontSize: "28px",
  },
  cardContentSubText: {
    fontFamily: "Manrope",
    fontWeight: 700,
    fontSize: "18px",
  },
  infoText: {
    fontFamily: "Manrope",
    fontWeight: 600,
    fontSize: "16px",
  },
  wrapper: {
    border: "1.5px solid #F4F4F4",
    borderRadius: "20px",
    marginBottom: "42px",
  },
}));

const NewOrderBatchingSummaryPopUp = (props) => {
  const { t } = useTranslation();
  const [summaryData, setSummaryData] = useState([]);
  const [dataPoints, setDataPoints] = useState(0);
  const globalClasses = globalStyles();
  const classes = useStyles();

  const mappingData = [
    {
      icon: <SkuIcon />,
      key_count: 140, // need this from BE, match with a key in the response
      type: "SKU's",
      operation: "*",
      backgroundColor: "#EFEFF9",
      textColor: "#7879CC",
      key: "articles",
    },
    {
      icon: <StoreIcon />,
      key_count: 75,
      type: "Stores",
      operation: "*",
      backgroundColor: "#E9F3F2",
      textColor: "#33B6B1",
      key: "stores",
    },
    {
      icon: <GroupIcon />,
      key_count: 10,
      type: "DCs",
      operation: "=",
      backgroundColor: "#F9EDF1",
      textColor: "#C87390",
      key: "dcs",
    },
  ];

  const returnToViewMode = () => {
    props.setShowSummaryPopUp(false);
    props.displaySnackMessages("Updated values successfully", "success");
    props.handlePostLockRelease();
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      returnToViewMode();
    }, 20000); // close after 20 seconds
    return () => {
      clearTimeout(timeout); // clear the timeout if the component is unmounted
    };
  }, []);

  useEffect(() => {
    if (props.displaySummaryOnUpdate) {
      let calculatedDataPoints = 1;
      let summaryDetails = mappingData.map((item) => {
        calculatedDataPoints *= props.displaySummaryOnUpdate[item.key];
        return {
          ...item,
          key_count: props.displaySummaryOnUpdate[item.key],
        };
      });
      setDataPoints(calculatedDataPoints);
      setSummaryData(summaryDetails);
    }
  }, [props.displaySummaryOnUpdate]);

  return (
    <div className={classes.popupOverlay}>
      <Card className={classes.popupCard}>
        <div
          className={`${globalClasses.paddingAround} ${globalClasses.alignTextCenter}`}
        >
          <div className={globalClasses.marginBottom}>
            <Illustration />
          </div>
          <div className={classes.wrapper}>
            <div className={globalClasses.marginVertical1rem}>
              {" "}
              <span
                className={classes.cardContentMainText}
                style={{ color: colors.lightNeutrals }}
              >
                Operation running for
              </span>
            </div>
            <div
              className={`${globalClasses.flexRow} ${globalClasses.marginVertical1rem}`}
              style={{ padding: "0 25px" }}
            >
              {summaryData.length &&
                summaryData.map((item) => {
                  return (
                    <div className={globalClasses.centerAlign}>
                      <Card
                        style={{
                          backgroundColor: item.backgroundColor,
                        }}
                        className={classes.contentBody}
                      >
                        <div
                          className={`${classes.contentBodyText} ${globalClasses.flexRow}`}
                        >
                          {item.icon}
                          <div
                            className={`${globalClasses.flexRow} ${globalClasses.flexColumn} ${globalClasses.gap}`}
                          >
                            <span
                              className={classes.cardContentMainText}
                              style={{ color: item.textColor }}
                            >
                              {item.key_count}
                            </span>
                            <span className={classes.cardContentSubText}>
                              {item.type}
                            </span>
                          </div>
                        </div>
                      </Card>
                      <div className={globalClasses.marginHorizontal}>
                        <span
                          className={classes.cardContentMainText}
                          style={{ color: colors.neutralBorder }}
                        >
                          {item.operation}
                        </span>
                      </div>
                    </div>
                  );
                })}
              <Card
                style={{ backgroundColor: "#FEF1E1" }}
                className={classes.contentBody}
              >
                <div
                  className={`${classes.contentBodyText} ${globalClasses.flexRow} `}
                >
                  <DataPointIcon />
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.flexColumn} ${globalClasses.gap}`}
                  >
                    <span
                      className={classes.cardContentMainText}
                      style={{ color: "#F9AA4B" }}
                    >
                      {dataPoints}
                    </span>
                    <span className={classes.cardContentSubText}>
                      Data points
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
          <Button
            size="large"
            type="default"
            variant="primary"
            onClick={() => returnToViewMode()}
          >
            {t("inventorysmart.returnToOrderBatching", {
              module_label: props?.orderBatchingModuleLabel || "Order Batching",
            })}
          </Button>
          <Divider className={globalClasses.marginVertical1rem} />
          <span
            className={classes.infoText}
            style={{ color: colors.neutralText }}
          >
            Don't worry. You will get a notification once the optimization is
            complete
          </span>
        </div>
      </Card>
    </div>
  );
};

export const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    displaySummaryOnUpdate:
      inventorysmartReducer.inventorySmartOrderBatchingService
        .displaySummaryOnUpdate,
    orderBatchingModuleLabel:
      inventorysmartReducer?.inventorySmartCommonService?.orderBatchingConfig
        ?.module_label,
  };
};

export const mapDispatchToProps = (dispatch) => {
  return {
    setInventorysmartReloadOrderBatchingData: (payload) =>
      dispatch(setInventorysmartReloadOrderBatchingData(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NewOrderBatchingSummaryPopUp);
