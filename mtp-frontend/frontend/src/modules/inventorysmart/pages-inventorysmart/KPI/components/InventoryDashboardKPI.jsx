import { Grid, Typography, Box, Tooltip } from "@mui/material";
import React from "react";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { ACTUAL_PREDICTED } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import { Inventory2Outlined } from "@mui/icons-material";
import classNames from "classnames";
import ISKpiIcon1 from "assets/IS_icons/IS_kpiIcon1.svg?url"
import ISKpiIcon2 from "assets/IS_icons/IS_kpiIcon2.svg?url"
import ISKpiIcon3 from "assets/IS_icons/IS_kpiIcon3.svg?url"
import ISKpiIcon4 from "assets/IS_icons/IS_kpiIcon4.svg?url"
import ISKpiIcon5 from "assets/IS_icons/IS_kpiIcon5.svg?url"

const InventoryDashboardKPI = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const DynamicKpiTag = `ISKpiIcon${(props.index % 5) + 1}`;
  const KpiIconsArray = [ISKpiIcon1, ISKpiIcon2, ISKpiIcon3, ISKpiIcon4, ISKpiIcon5]

  return (
    <>
      <Box className={`${classes.kpiIconContainer}`}>
        <img src={KpiIconsArray[(props.index % 5)]} alt={DynamicKpiTag} className={`${classes.kpiIconNew}`} />
      </Box>
      <Box
        className={classes.kpiCardTex}>
        <Box>
          <Tooltip title={props.kpi.label}
            className={`${globalClasses.cursorDefault}`}>
            <Typography variant={"h5"} className={classes.kpiLabelIS}>
              {props.kpi.label}
            </Typography>
          </Tooltip>
        </Box>
        <Box>
          <Tooltip
            title={`
            ${props.kpi.value?.toLocaleString()}
            ${props.kpi.label?.includes("%") ? "%" : ''}`
            }
            className={`${globalClasses.cursorDefault}`}>
            <Typography className={classes.kpiNumberValue}>
              {props.kpi.value?.toLocaleString()}{" "}
              {props.kpi.label?.includes("%") && "%"}
            </Typography>
          </Tooltip>
        </Box>
        <Box>
          <Typography className={classes.kpiActual}>
            {ACTUAL_PREDICTED}
          </Typography>
        </Box>
      </Box>
    </>
  );
};

export default InventoryDashboardKPI;
