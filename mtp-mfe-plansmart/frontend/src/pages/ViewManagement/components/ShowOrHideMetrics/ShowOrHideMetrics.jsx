import React, { useState } from "react";
import { connect, useDispatch } from "react-redux";

import { List, ListItem, ListItemIcon } from "@mui/material";
import { Checkbox } from "impact-ui-v3";
import PropTypes from "prop-types";
import ShowLessIcon from "assets/viewManagement/ShowLessIcon.svg";
import ShowMoreIcon from "assets/viewManagement/ShowMoreIcon.svg";
import {
  setActiveViewMetricsData,
  setActiveViewVersionToggle,
  setActiveViewVarianceToggle,
  activeViewShowOrHideMetricsDataSelector
} from "../../viewManagement.slice";

import {
  currentVersionSelector,
  varianceVersionMappingSelector
} from "../../../PlanningScreen/slice/planningScreen.slice";

import { dividerConstants } from "../../viewManagement.constant";

import "./ShowOrHideMetrics.scss";
import { isEmpty, omitBy } from "lodash";

const ShowOrHideMetrics = ({
  currentVersion,
  setActiveViewMetricsData,
  setActiveViewVersionToggle,
  setActiveViewVarianceToggle,
  showHideMetricsData,
  setShowHideMetricsDataAction,
  tableRef,
  versionVarianceMap
}) => {
  const dispatch = useDispatch();
  const [metrics, setMetrics] = useState(showHideMetricsData);

  const [openStates, setOpenStates] = useState({});

  const toggleOpen = (label) => {
    setOpenStates((prevOpenStates) => ({
      ...prevOpenStates,
      [label]: !prevOpenStates[label]
    }));
  };

  const isMetricValueSelected = (metricData, metricOption) => {
    let isMetricChecked = false;

    metricData?.forEach((item) => {
      if (metricOption.includes(item.label) && item.isChecked) {
        isMetricChecked = true;
      }
    });

    return isMetricChecked;
  };

  /**
   * Return updated show/hide metric data based on checkbox change.
   *
   * groupIndex: Index of the group within the showHideMetricsData array.
   * itemIndex: Index of the item within the group specified by groupIndex.
   * childIndex: Index for group category children.
   */
  const handleMetricCheckBoxToggle = (
    groupIndex,
    itemIndex,
    childIndex = null
  ) => {
    const newData = metrics.map((group, gIndex) => {
      if (gIndex !== groupIndex) return group;
      return group.map((listItem, iIndex) => {
        if (iIndex !== itemIndex) return listItem;
        const newItem = { ...listItem };
        if (childIndex === null) {
          const newCheckedState = !newItem.isChecked;
          return {
            ...newItem,
            isChecked: newCheckedState,
            children: newItem.children
              ? newItem.children.map((child) => ({
                  ...child,
                  isChecked: newCheckedState
                }))
              : newItem.children
          };
        }
        const newChildren = newItem.children.map((child, cIndex) => {
          if (cIndex !== childIndex) return child;
          return {
            ...child,
            isChecked: !child.isChecked
          };
        });
        return {
          ...newItem,
          children: newChildren,
          isChecked: newChildren.some((child) => child.isChecked)
        };
      });
    });

    const updatedVersionVarianceMap = omitBy(
      versionVarianceMap,
      (value) => value === currentVersion
    );

    const isVersionMetricSelected = isMetricValueSelected(
      newData[1],
      Object.values(updatedVersionVarianceMap)
    );
    const isVarianceMetricSelected = isMetricValueSelected(
      newData[1],
      Object.keys(updatedVersionVarianceMap)
    );

    setActiveViewMetricsData(newData);
    setMetrics(newData);
    setActiveViewVersionToggle(isVersionMetricSelected);
    setActiveViewVarianceToggle(isVarianceMetricSelected);
    applyShowHideMetricsChange(setShowHideMetricsDataAction, tableRef, newData);
  };

  const applyShowHideMetricsChange = (
    setMetricsDataAction,
    tableRef,
    metricData
  ) => {
    if (isEmpty(metricData)) return;
    dispatch(setMetricsDataAction(metricData));
    tableRef?.current?.api?.onFilterChanged();
  };

  const renderListItem = (item, groupIndex, itemIndex, childIndex = null) => {
    return (
      <ListItem
        dense
        button
        onClick={(event) => {
          event.stopPropagation();
        }}
        key={item.label}
        className="list-item-container"
      >
        <ListItemIcon>
          <Checkbox
            label={item.label}
            checked={item?.isChecked}
            disabled={item?.isEditable === false}
            onChange={() => {
              if (item?.isEditable !== false) {
                handleMetricCheckBoxToggle(groupIndex, itemIndex, childIndex);
              }
            }}
          />
        </ListItemIcon>
        {childIndex === null &&
          item.children &&
          (openStates[item.label] ? (
            <ShowLessIcon
              onClick={(event) => {
                event.stopPropagation();
                toggleOpen(item.label);
              }}
            />
          ) : (
            <ShowMoreIcon
              onClick={(event) => {
                event.stopPropagation();
                toggleOpen(item.label);
              }}
            />
          ))}
      </ListItem>
    );
  };

  return (
    <div className="section-container">
      {metrics?.map((group, index) => (
        <div key={`group-${index}`}>
          <span className="divider-heading">{dividerConstants[index]}</span>
          <List component="div" disablePadding>
            {group.map((listItem, listItemIndex) => (
              <React.Fragment key={listItem.label}>
                {renderListItem(listItem, index, listItemIndex)}
                {listItem.children &&
                  openStates[listItem.label] &&
                  listItem.children.map((child, childIndex) => (
                    <div key={child?.label} style={{ paddingLeft: "20px" }}>
                      {renderListItem(child, index, listItemIndex, childIndex)}
                    </div>
                  ))}
              </React.Fragment>
            ))}
          </List>
        </div>
      ))}
    </div>
  );
};

const mapStateToProps = (state) => ({
  currentVersion: currentVersionSelector(state),
  showHideMetricsData: activeViewShowOrHideMetricsDataSelector(state),
  versionVarianceMap: varianceVersionMappingSelector(state)
});

const mapDispatchToProps = (dispatch) => {
  return {
    setActiveViewMetricsData: (payload) =>
      dispatch(setActiveViewMetricsData(payload)),
    setActiveViewVersionToggle: (payload) =>
      dispatch(setActiveViewVersionToggle(payload)),
    setActiveViewVarianceToggle: (payload) =>
      dispatch(setActiveViewVarianceToggle(payload))
  };
};

ShowOrHideMetrics.propTypes = {
  setActiveViewMetricsData: PropTypes.func,
  setActiveViewVersionToggle: PropTypes.func,
  setActiveViewVarianceToggle: PropTypes.func,
  tableRef: PropTypes.object
};

export default connect(mapStateToProps, mapDispatchToProps)(ShowOrHideMetrics);
