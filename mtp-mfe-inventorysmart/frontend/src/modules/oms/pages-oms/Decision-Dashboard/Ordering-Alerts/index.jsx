import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import LoadingOverlay from "core/Utils/Loader/loader";
import Icon from "@mui/material/Icon";
import makeStyles from "@mui/styles/makeStyles";
import { Button } from "impact-ui-v3";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { useStyles } from "modules/oms/styles-oms/orderingCustomStyles";
import OrderAlertAction from "./components/OrderAlertAction";
import DescriptionIcon from "assets/impactv3/description_icon.svg";
import FrequencyIcon from "assets/impactv3/frequency_icon.svg";
import SeperatorIcon from "assets/impactv3/seperator_icon.svg";
import {
  getExpediteOrdersConfig,
  setExpediteOrdersConfig,
} from "modules/oms/services-oms/Decision-Dashboard/expedite-order-service";
import { EllipsisTooltipCell } from "./EllipsisTooltipCell";
import useWindowSize from "./useWindowSize";

const OrderingDashboardAlerts = (props) => {
  const agGridInstance = useRef(null);
  const classes = useStyles();
  const customClasses = customStyles();

  const [showActionLoader, setShowActionLoader] = useState(false);
  const [showAlertAction, setShowAlertAction] = useState(false);
  const [orderingAlertsTableColumns, setOrderingAlertsTableColumns] = useState(
    []
  );
  const [selectedAlertsTableData, setSelectedAlertsTableData] = useState(null);
  const [selectedAlertIndex, setSelectedAlertIndex] = useState(-1);

  const size = useWindowSize();

  useEffect(() => {
    setShowAlertAction(false);
    const fetchColumnData = async () => {
      let formattedColumns = agGridColumnFormatter(
        props.columnConfig,
        null,
        null,
        null,
        null,
        null,
        null,
        true
      );
      setOrderingAlertsTableColumns(formattedColumns);
    };
    fetchColumnData();
  }, [props.columnConfig]);

  // ─── Expedite Orders Config ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await props.getExpediteOrdersConfig();
        props.setExpediteOrdersConfig(config || {});
      } catch {
        props.setExpediteOrdersConfig({});
      }
    };
    fetchConfig();
  }, []);

  const handleAlertsAction = (data) => {
    setSelectedAlertsTableData(data);
    setShowAlertAction(true);
  };

  const resetPopupsAndTables = () => {
    setShowAlertAction(false);
  };

  const loadAlertsTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onReviewClick = (data, rowIndex = 0) => {
    resetPopupsAndTables();
    handleAlertsAction(data);
    setSelectedAlertIndex(rowIndex);
  };

  const getFlexStyle = (col, colIndex, isLink) => {
    if (isLink) {
      if (size.width < 1100) return { flex: "0 0 23%" };
      if (size.width < 1290) return { flex: "0 0 20%" };
      if (size.width < 1375) return { flex: "0 0 16%" };
      return { flex: "0 0 15%" };
    } else if (colIndex === 1) {
      return { flexGrow: 1, minWidth: 0 };
    } else if (col.width < 200) {
      return { flex: "0 0 8%" };
    } else {
      if (size.width < 1100) return { flex: "0 0 19%" };
      if (size.width < 1375) return { flex: "0 0 17%" };
      return { flex: "0 0 12%" };
    }
  };

  const showIconButton = (col) => {
    if (col?.extra?.showIcon) {
      if (col?.column_name === "description") {
        if (size.width < 1375)
          return (
            <Icon sx={{ marginTop: "-1.5px" }}>
              <DescriptionIcon />
            </Icon>
          );
        return <span className={classes.alertsLabelStyles}>Description</span>;
      }
      return (
        <Icon sx={{ marginTop: "-1.5px" }}>
          <FrequencyIcon />
        </Icon>
      );
    }
    return null;
  };

  const getTootlipLabel = (label, cellValue, col) => {
    if (col?.extra?.showTooltipWithLabel) {
      return `${label}: ${cellValue}`;
    } else return cellValue;
  };

  return (
    <>
      <LoadingOverlay
        text="Loading Alerts"
        loader={props.orderAlertsTableDataLoader || props.data.length == 0}
        minHeight={"120px"}
      >
        {props.data?.map((item, rowIndex) => {
          const { article_count } = item;
          const isDisabled = article_count === 0;
          const isSelected = selectedAlertIndex === rowIndex;

          return (
            <div key={rowIndex}>
              <div
                className={classes.alertsRowsStyles}
                style={{
                  borderLeft: isSelected ? "2.5px solid #4361EE" : undefined,
                }}
              >
                {orderingAlertsTableColumns.map((col, colIndex) => {
                  // temp change for hiding frequency column
                  // if (col.field === "frequency") {
                  //   col.is_hidden = true;
                  // }
                  if (col.is_hidden) return null;

                  const { field, label } = col;
                  const isLink = field === "action";
                  const flexStyle = getFlexStyle(col, colIndex, isLink);

                  const cellValue = item[col?.field];

                  return (
                    <div
                      key={colIndex}
                      style={{
                        ...flexStyle,
                        gap: 5,
                      }}
                    >
                      {!isLink ? (
                        <span className={customClasses.cardItemCell}>
                          {colIndex !== 0 && (
                            <span style={{ marginTop: 4 }}>
                              <SeperatorIcon />
                            </span>
                          )}

                          {showIconButton(col)}

                          {col?.extra?.showColumnName && (
                            <span className={classes.alertsLabelStyles}>
                              {label}
                            </span>
                          )}

                          {col?.extra?.showTooltip ? (
                            <span className={customClasses.cardItemEllipsis}>
                              <EllipsisTooltipCell
                                value={cellValue}
                                tooltip={getTootlipLabel(label, cellValue, col)}
                                className={`${classes.alertsValuesStyles} ${customClasses.cardItemEllipsis}`}
                                orientation="right"
                              />
                            </span>
                          ) : (
                            <span className={classes.alertsValuesStyles}>
                              {cellValue}
                            </span>
                          )}
                        </span>
                      ) : (
                        <Button
                          size="medium"
                          type="default"
                          variant="url"
                          underline="none"
                          disabled={isDisabled}
                          onClick={() => onReviewClick(item, rowIndex)}
                          className={
                            isDisabled
                              ? classes.alertsLinkDisabledStyles
                              : classes.alertsLinkStyles
                          }
                        >
                          {`${cellValue}>`}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {showAlertAction && isSelected && (
                <OrderAlertAction
                  data={selectedAlertsTableData}
                  setShowActionLoader={setShowActionLoader}
                  canEdit={props.canEdit}
                  canDelete={props.canDelete}
                  canCreate={props.canCreate}
                  setReloadKpi={props.setReloadKpi}
                  setReloadAlerts={props.setReloadAlerts}
                  setSelectedAlertIndex={setSelectedAlertIndex}
                  isCalledFromVendorStore={props?.isCalledFromVendorStore}
                  dashboardApiFlags={props.dashboardApiFlags}
                />
              )}
            </div>
          );
        })}
      </LoadingOverlay>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    orderAlertsTableDataLoader:
      store.omsReducer.omsOrderingAlertsService.orderAlertsTableDataLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  getExpediteOrdersConfig: () => dispatch(getExpediteOrdersConfig()),
  setExpediteOrdersConfig: (config) =>
    dispatch(setExpediteOrdersConfig(config)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderingDashboardAlerts);

const customStyles = makeStyles((theme) => ({
  cardItemEllipsis: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  cardItemCell: {
    display: "inline-flex",
    gap: 5,
    width: "100%",
  },
}));
