import React, { useState } from "react";
import {
  Checkbox,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from "@mui/material";
import PropTypes from "prop-types";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import * as planningScreenActions from "../../../pages/PlanningScreen/slice/planningScreen.slice";
import * as masterPlanActions from "../../../pages/MasterPlan/masterPlan.slice";
import { handleCheckboxToggle, getMetricData } from "./showOrHideMetrics.util";
import "./showOrHideMetrics.scss";

function ShowOrHideMetrics(props) {
  const {
    setShowHideMetricsData,
    tableRef,
    masterPlanShowHideMetricsData,
    budgetShowHideMetricsData,
    planScreen
  } = props;

  const showHideMetricsData = getMetricData(
    planScreen,
    masterPlanShowHideMetricsData,
    budgetShowHideMetricsData
  );

  const [openStates, setOpenStates] = useState({});

  const toggleOpen = (label) => {
    setOpenStates((prevOpenStates) => ({
      ...prevOpenStates,
      [label]: !prevOpenStates[label]
    }));
  };

  const renderListItem = (item, groupIndex, itemIndex, childIndex = null) => {
    return (
      <ListItem
        dense
        button
        onClick={(event) => {
          event.stopPropagation();
          if (item.isEditable !== false) {
            handleCheckboxToggle(
              groupIndex,
              itemIndex,
              showHideMetricsData,
              setShowHideMetricsData,
              tableRef,
              childIndex
            );
          }
        }}
        key={item.label}
      >
        <ListItemIcon>
          <Checkbox
            edge="start"
            checked={item?.isChecked}
            disableRipple
            disabled={item?.isEditable === false}
          />
        </ListItemIcon>
        <ListItemText primary={item.label} />
        {childIndex === null && item.children && (
          <IconButton
            edge="end"
            aria-label="toggle"
            onClick={(event) => {
              event.stopPropagation();
              toggleOpen(item.label);
            }}
          >
            {openStates[item.label] ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        )}
      </ListItem>
    );
  };

  return (
    showHideMetricsData &&
    showHideMetricsData.length > 0 && (
      <div className="sidebar">
        {showHideMetricsData.map((group, index) => (
          <>
            <List component="div" disablePadding>
              {group.map((listItem, listItemIndex) => (
                <React.Fragment key={listItem.label}>
                  {renderListItem(listItem, index, listItemIndex)}
                  {listItem.children &&
                    openStates[listItem.label] &&
                    listItem.children.map((child, childIndex) => (
                      <div key={child?.label} style={{ paddingLeft: "20px" }}>
                        {renderListItem(
                          child,
                          index,
                          listItemIndex,
                          childIndex
                        )}
                      </div>
                    ))}
                </React.Fragment>
              ))}
            </List>
            {index !== showHideMetricsData.length - 1 && <Divider />}
          </>
        ))}
      </div>
    )
  );
}

const mapState = (state) => ({
  masterPlanShowHideMetricsData: masterPlanActions.showHideMetricsDataSelector(
    state
  ),
  budgetShowHideMetricsData: planningScreenActions.showHideMetricsDataSelector(
    state
  )
});

const mapDispatch = (dispatch) => {
  return {
    ...bindActionCreators(
      { ...planningScreenActions, ...masterPlanActions },
      dispatch
    )
  };
};

ShowOrHideMetrics.propTypes = {
  masterPlanShowHideMetricsData: PropTypes.array,
  budgetShowHideMetricsData: PropTypes.array,
  setShowHideMetricsData: PropTypes.func,
  tableRef: PropTypes.object,
  planScreen: PropTypes.string
};

export default connect(mapState, mapDispatch)(ShowOrHideMetrics);
