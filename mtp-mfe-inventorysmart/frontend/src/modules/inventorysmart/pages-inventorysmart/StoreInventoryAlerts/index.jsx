import { cloneDeep, isEmpty } from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import AlertsAction from "./components/AlertsAction";
import { getModuleBasedTenantConfig } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import KPIAlertsData from "modules/inventorysmart/pages-inventorysmart/KPI/component/KPIAlertsData";
import { Link } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { Tooltip } from "impact-ui-v3";
import SettingsIcon from "../../../../assets/impactv3/description_icon.svg";
import SeperatorIcon from "../../../../assets/impactv3/seperator_icon.svg";
import IAAlertIcon from "../../../../assets/impactv3/Vector.svg";
import CustomAlertIcon from "../../../../assets/impactv3/PersonUser.svg";
import Icon from '@mui/material/Icon';

const StoreInventoryAlerts = (props) => {
  const textRefs = useRef({});
  const globalClasses = globalStyles()
  const classes = useStyles()
  const agGridInstance = useRef(null);
  const inventoryAlertsCount = useRef([]);
  const [showActionLoader, setShowActionLoader] = useState(false);
  const [showAlertAction, setShowAlertsAction] = useState(false);
  const [
    storeInventoryAlertsTableColumns,
    setStoreInventoryAlertsTableColumns,
  ] = useState([]);
  const [selectedAlertsTableData, setSelectedAlertsTableData] = useState(null);
  const [selectedAlertIndex, setSelectedAlertIndex] = useState(-1)

  // Component to conditionally render tooltip only when text has ellipsis
  const ConditionalTooltip = ({ children, title, itemKey }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    
    useEffect(() => {
      const element = textRefs.current[itemKey];
      if (element) {
        const hasOverflow = element.scrollWidth > element.clientWidth;
        setShowTooltip(hasOverflow);
      }
    }, [itemKey, props.data]);

    if (showTooltip) {
      return (
        <Tooltip orientation="right" title={title} variant="tertiary">
          {children}
        </Tooltip>
      );
    }
    return children;
  }

  useEffect(() => {
    const fetchColumnData = async () => {
      let formattedColumns = agGridColumnFormatter(props.columnConfig);
      setStoreInventoryAlertsTableColumns(formattedColumns);
    };
    fetchColumnData();
  }, [props.columnConfig]);

  useEffect(() => {
    if (props.inventoryDashboardAlertCount?.[props.screen]?.length > 0) {
      inventoryAlertsCount.current = cloneDeep(
        props.inventoryDashboardAlertCount?.[props.screen]
      );
    }
  }, [props.inventoryDashboardAlertCount?.[props.screen]]);

  const handleAlertsAction = (data) => {
    setSelectedAlertsTableData(data);
    setShowAlertsAction(true);
  };


  const resetPopupsAndTables = () => {
    setShowAlertsAction(false);
  };

    const onNewReviewClick = (index) => {
    resetPopupsAndTables();
    handleAlertsAction(props?.data[index]);
    setSelectedAlertIndex(index);
  };

  function trimWithEllipsis(str, n) {
    if (!str) return '';
    return str.length > n ? str.slice(0, n) + '…' : str;
  }

  // Get grouped alerts for forecast tab
  const getGroupedAlerts = () => {
    const iaAlerts = [];
    const customAlerts = [];
    props.data?.forEach((alert, index) => {
      if (alert.is_ia_alert === true) {
        iaAlerts.push({ ...alert, originalIndex: index });
      } else {
        customAlerts.push({ ...alert, originalIndex: index });
      }
    });
    return { iaAlerts, customAlerts };
  };

  // Render a single alert row
  const renderAlert = (item, index) => {
    const isDisabled = item?.article_count === 0;
    const actualIndex = item.originalIndex ?? index;

    return (
      <React.Fragment key={actualIndex}>
        <div
          className={classes.alertsRowsStyles} style={{
            borderLeft: selectedAlertIndex === actualIndex ? "2.5px solid #4361EE" : null,
          }}>
          {storeInventoryAlertsTableColumns.map((col, idx) => {
            const flexBasis = idx === 1 ? '50%' : '15%'
            const isLink = col.field === 'action'
            let label = col.label
            if (idx === 2) {
              // Checks for the specific alerts and if we have forecast label key in extras, else takes default label
              if (item['name'] === "New Store Reserve") {
                label = "#Stores"
              } else if (item['name'] === "New Store Available to Allocate") {
                label = "#New Stores"
              } else if (props?.tabValue === "forecast" && col?.extra?.forecast_label) {
                label = col.extra.forecast_label
              }
            }
            let value = item[col?.field] ?? '';

            const itemKey = `${actualIndex}_${idx}`;
            const tooltipTitle = idx === 2 ? `${label} ${item[col?.field]}` : item[col?.field];

            return (
              <div key={idx} className={classes.alertsTextWrapper} style={{ flexBasis }}>
                {!isLink ?
                  <ConditionalTooltip title={tooltipTitle} itemKey={itemKey}>
                    <span className={classes.alertsContentWrapper}>
                      {idx !== 0 && (
                        <span className={`${classes.alertsIconWrapper} ${globalClasses.shrink0}`}>
                          <SeperatorIcon />
                        </span>
                      )}
                      {idx === 2 && (
                        <span className={`${classes.alertsLabelStyles} ${classes.alertsLabelWrapper} ${globalClasses.shrink0}`}>
                          {`${label}`}
                        </span>
                      )}
                      {idx === 1 && (
                        <SettingsIcon className="setting-icon" fontSize="21" />
                      )}
                      <span 
                        ref={el => textRefs.current[itemKey] = el} 
                        className={`${classes.alertsValuesStyles} ${classes.textOverFlowStyles}`}
                      >
                        {value}
                      </span>
                    </span>
                  </ConditionalTooltip>
                  : ""
                }
                {isLink && (
                  <Link
                    underline="hover"
                    onClick={() => onNewReviewClick(actualIndex)}
                    className={
                      isDisabled
                        ? `${classes.alertsLinkDisabledStyles} ${classes.textOverFlowStyles}`
                        : selectedAlertIndex !== actualIndex ? `${classes.alertsLinkStyles} ${classes.textOverFlowStyles}` : `${classes.alertsLinkStyles} ${classes.textOverFlowStyles} ${classes.noPointer}`
                    }
                    style={{
                      whiteSpace: 'nowrap',
                      marginLeft: 'auto',
                    }}
                  >
                    {`${item[col?.field]}>`}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
        {showAlertAction && selectedAlertIndex === actualIndex ? (
          <div>
            <AlertsAction
              ref={inventoryAlertsCount}
              screen={props.screen}
              data={item}
              setShowActionLoader={setShowActionLoader}
              canEdit={props.canEdit}
              canDelete={props.canDelete}
              canCreate={props.canCreate}
              tabValue={props.tabValue}
              setSelectedAlertIndex={setSelectedAlertIndex}
            />
          </div>
        ) : ""}
      </React.Fragment>
    );
  };

  // Get grouped data for forecast tab
  const { iaAlerts, customAlerts } = getGroupedAlerts();

  return (
    <>
      <Loader
        loader={
          props.storeInventoryAlertsTableConfigLoader ||
          props.storeInventoryAlertsTableDataLoader ||
          showActionLoader
        }
        text="Loading Alerts"
        size="medium"
        minHeight={"120px"}
      > 
        <div className={`${classes.noBottomMarginOnTable} ${props?.isWithinTabs ? globalClasses.paddingTop_8 : ""}`}>
          {!isEmpty(props?.alertsTotalCount[props?.tabValue]) && <div className={`${globalClasses.marginBottom_16}`}>
            <KPIAlertsData
              data={
                {
                  // Right now filtering only Overall count.
                  // After Review Flow will enable other statuses.
                  data: props?.alertsTotalCount[props?.tabValue].filter((thisStatus)=>{
                    return ["Overall","Reviewed","Pending"].includes(thisStatus.label)
                  }),
                  label: "Alerts",
                  type: "Alerts"
                }
              }
            />
          </div>}
          {props.tabValue === "forecast" ? (
            <>
              {/* IA Alerts */}
              {iaAlerts.length > 0 && (
                <>
                  <div className={classes.alertGroupHeader}>
                    <span className={classes.alertGroupIcon}>
                      <IAAlertIcon />
                    </span>
                    <span className={classes.alertGroupTitle}>IA Alerts</span>
                    <span className={classes.alertGroupSeparatorLine}></span>
                  </div>
                  {iaAlerts.map((alert, index) => renderAlert(alert, index))}
                </>
              )}
              {/* Configured Alerts */}
              {customAlerts.length > 0 && (
                <>
                  <div className={classes.alertGroupHeader}>
                    <CustomAlertIcon className={classes.alertGroupIcon} />
                    <span className={classes.alertGroupTitle}>Configured Alerts</span>
                    <span className={classes.alertGroupSeparatorLine}></span>
                  </div>
                  {customAlerts.map((alert, index) => renderAlert(alert, index))}
                </>
              )}
            </>
          ) : (
            props.data?.map((item, index) => renderAlert(item, index))
          )}
        </div>
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    storeInventoryAlertsTableConfigLoader:
      store.inventorysmartReducer.inventorySmartStoreInventoryAlertsService
        .storeInventoryAlertsTableConfigLoader,
    storeInventoryAlertsTableDataLoader:
      store.inventorysmartReducer.inventorySmartStoreInventoryAlertsService
        .storeInventoryAlertsTableDataLoader,
    inventoryDashboardAlertCount:
      store.inventorysmartReducer.inventorySmartKPIService
        .inventoryDashboardAlertCount,
    alertsTotalCount:
      store.inventorysmartReducer.inventorySmartStoreInventoryAlertsService
        .alertsTotalCount,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getModuleBasedTenantConfig: (module) =>
    dispatch(getModuleBasedTenantConfig(module)),
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreInventoryAlerts);
