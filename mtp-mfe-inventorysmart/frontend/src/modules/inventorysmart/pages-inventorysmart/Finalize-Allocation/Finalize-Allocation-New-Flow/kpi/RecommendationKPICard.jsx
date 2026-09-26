import React, { useCallback, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "impact-ui-v3";
import useStyles from "./kpiStyles";
import SizeSplitPopover from "./SizeSplitPopover";
import {
  extractSubHeaderData,
  formatValue,
  getValueFromTableData,
} from "./kpiUtils";

import ISStore from "assets/IS_icons/IS_stores_S01.svg";
import ISStorePerStyle from "assets/IS_icons/IS_store_per_styleS02.svg";
import ISLwMargin from "assets/IS_icons/IS_lw_marginPT1.svg";
import ISDcAvailable from "assets/IS_icons/IS_dc_availableWH4.svg";
import ISDcAllocatedQnt from "assets/IS_icons/IS_dc_allocated_qntWH1.svg";
import ISRefs from "assets/IS_icons/IS_JL1.svg";
import ISAP2 from "assets/IS_icons/IS_AP2.svg";
import ISPT2 from "assets/IS_icons/IS_PT2.svg";
import ISLwSale from "assets/IS_icons/IS_PC2.svg";
import ISAllocatedQntBySize from "assets/IS_icons/IS_ST1.svg";
import ISNetDcAvailable from "assets/IS_icons/IS_WH3.svg";
import ISSO3 from "assets/IS_icons/IS_SO3.svg";
import ISAC1 from "assets/IS_icons/IS_AC1.svg";
import ISWH2 from "assets/IS_icons/IS_WH2.svg";
import SalesCash from "assets/Sales_cash.svg";
import StocksIcon from "assets/Stocks.svg";
import MarginIcon from "assets/margin.svg";
import TargetInventoryIcon from "assets/OH4.svg";
import ArrowRightIcon from "assets/impactv3/arrow_right.svg";

const iconMap = {
  style: <ISAP2 />,
  store: <ISStore />,
  store_per_style: <ISStorePerStyle />,
  stylecolor_store: <ISStorePerStyle />,
  sales_unit: <SalesCash />,
  lw_margin: <MarginIcon />,
  allocated_qty_total: <ISDcAllocatedQnt />,
  dc_available: <ISDcAvailable />,
  dc_allocated_qty: <ISDcAllocatedQnt />,
  refs: <ISRefs />,
  // Backend iconType; Figma Summary tile uses SO3 (same as store_oh_oo_it).
  store_oh_it: <ISSO3 />,
  lw_4_sale: <ISLwSale />,
  allocated_qnt_by_size: <ISAllocatedQntBySize />,
  net_dc_available: <ISNetDcAvailable />,
  store_grade_allocated_percentage: <ISPT2 />,
  depth_per_store: <ISAP2 />,
  target_inventory: <TargetInventoryIcon />,
  store_oh_oo_it: <ISSO3 />,
  oh_oo_it: <ISSO3 />,
  pre_allocation_in_stock_percentage: <ISLwMargin />,
  pre_allocation_in_stock: <ISLwMargin />,
  total_allocation_need: <ISAC1 />,
  total_need: <ISAC1 />,
  constraied_forecasted_demand: <ISAC1 />,
  allocation_retail_value: <ISWH2 />,
  post_allocation_in_stock_percentage: <StocksIcon />,
  post_allocation_in_stock: <StocksIcon />,
  remaining_dc_ata: <ISDcAllocatedQnt />,
};

/** When table_config column_name !== extra.iconType, map column → iconMap key. */
const columnIconKey = {};

const resolveIconKey = (config) => {
  const iconType = config?.extra?.iconType;
  if (iconType && iconMap[iconType]) return iconType;

  const columnName = config?.column_name;
  if (columnName) {
    if (iconMap[columnName]) return columnName;
    if (columnIconKey[columnName] && iconMap[columnIconKey[columnName]]) {
      return columnIconKey[columnName];
    }
  }
  return "style";
};

const getIcon = (config) => iconMap[resolveIconKey(config)];

const RecommendationKPICard = ({ config, rowData }) => {
  const classes = useStyles();
  const { t } = useTranslation();
  const arrowRefs = useRef({});
  const [popover, setPopover] = useState({
    open: false,
    dcData: null,
    buttonId: null,
  });

  const value = getValueFromTableData(rowData, config.column_name);
  const displayValue = formatValue(value, config.type, config.extra);
  const subHeaderData = useMemo(() => extractSubHeaderData(config, rowData), [
    config,
    rowData,
  ]);
  const isTypeB = subHeaderData.length > 0;

  const handleClosePopover = useCallback(() => {
    setPopover({
      open: false,
      dcData: null,
      buttonId: null,
    });
  }, []);

  const handleArrowClick = (event, dcData, buttonId) => {
    event.stopPropagation();
    if (!dcData.sizeDetails) return;
    const buttonEl = arrowRefs.current[buttonId];
    if (!buttonEl) return;
    setPopover({
      open: true,
      dcData,
      buttonId,
    });
  };

  return (
    <div
      data-kpi-card="true"
      data-kpi-type={isTypeB ? "b" : "a"}
      className={classes.card}
    >
      <div className={classes.iconSlot}>{getIcon(config)}</div>
      {isTypeB ? (
        <>
          <div className={classes.typeBText}>
            <div className={classes.label}>{config.label}</div>
            <div className={classes.value}>{displayValue}</div>
          </div>
          <div className={classes.divider} />
          <div className={classes.chipsColumn}>
            {subHeaderData.map((subHeader, idx) => {
              const shDisplay = formatValue(
                subHeader.value,
                subHeader.type,
                subHeader.extra
              );
              const buttonId = `${config.column_name || "kpi"}-dc-${idx}`;
              const canOpenSizes = Boolean(subHeader.sizeDetails);
              return (
                <div
                  key={subHeader.column_name || idx}
                  className={classes.chip}
                >
                  <div className={classes.chipLabel}>{subHeader.label}</div>
                  <div className={classes.chipValue}>{shDisplay}</div>
                  {canOpenSizes ? (
                    <button
                      type="button"
                      ref={(el) => {
                        arrowRefs.current[buttonId] = el;
                      }}
                      className={`${classes.chipArrow} ${classes.chipArrowButton}`}
                      onClick={(event) =>
                        handleArrowClick(event, subHeader, buttonId)
                      }
                      aria-label={t("inventorysmart.viewSizes")}
                    >
                      <ArrowRightIcon />
                    </button>
                  ) : (
                    <span className={classes.chipArrow}>
                      <ArrowRightIcon />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <SizeSplitPopover
            open={popover.open}
            dcData={popover.dcData}
            buttonId={popover.buttonId}
            onClose={handleClosePopover}
            arrowRefs={arrowRefs}
          />
        </>
      ) : (
        <div className={classes.typeAText}>
          <div className={classes.label}>{config.label}</div>
          <div className={classes.typeAValueRow}>
            <div className={classes.value}>{displayValue}</div>
          </div>
        </div>
      )}
    </div>
  );
};

RecommendationKPICard.propTypes = {
  config: PropTypes.object.isRequired,
  rowData: PropTypes.object,
};

RecommendationKPICard.defaultProps = {
  rowData: {},
};

export default RecommendationKPICard;
