import React, { useEffect, useState } from "react";
import { connect, useSelector } from "react-redux";

import { isEmpty } from "lodash";

import {
  Divider,
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";

import { showHideMetricsDataSelector } from "../../../../slice/planningScreen.slice";

import {
  selectedTableViewNameSelector,
  setSelectedMetricsPayload,
  tableViewConfigurationSelector
} from "../../../../../../core/Utils/agGrid/TableViewManagement/table-view/table-view-panel-service";

const PreferencesShowHideMetrics = ({
  setSelectedShowHideMetricPayloadAction
}) => {
  const [metrics, setMetrics] = useState([]);
  const [openStates, setOpenStates] = useState({});

  const defaultMetricData = useSelector(showHideMetricsDataSelector);
  const tableViewConfigurationData = useSelector(
    tableViewConfigurationSelector
  );
  const selectedTableView = useSelector(selectedTableViewNameSelector);

  const selectedViewConfig = tableViewConfigurationData?.filter(
    (item) => item.id === selectedTableView
  )[0];

  useEffect(() => {
    const currentMetrics = !isEmpty(
      selectedViewConfig?.custom_tab_preferences?.show_hide_metrics
    )
      ? selectedViewConfig?.custom_tab_preferences?.show_hide_metrics
      : defaultMetricData;
    setSelectedShowHideMetricPayloadAction(currentMetrics);
    setMetrics(currentMetrics);
  }, [selectedTableView]);

  const toggleOpen = (label) => {
    setOpenStates((prevOpenStates) => ({
      ...prevOpenStates,
      [label]: !prevOpenStates[label]
    }));
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
          return { ...child, isChecked: !child.isChecked };
        });
        return {
          ...newItem,
          children: newChildren,
          isChecked: newChildren.some((child) => child.isChecked)
        };
      });
    });

    setSelectedShowHideMetricPayloadAction(newData);
    setMetrics(newData);
  };

  const renderListItem = (item, groupIndex, itemIndex, childIndex = null) => {
    return (
      <ListItem
        dense
        button
        onClick={(event) => {
          event.stopPropagation();
          if (item.isEditable !== false) {
            handleMetricCheckBoxToggle(groupIndex, itemIndex, childIndex);
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
    <>
      {metrics.map((group, index) => (
        <>
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
          {index !== metrics.length - 1 && <Divider />}
        </>
      ))}
    </>
  );
};

const mapDispatchToProps = (dispatch) => {
  return {
    setSelectedShowHideMetricPayloadAction: (payload) =>
      dispatch(setSelectedMetricsPayload(payload))
  };
};

export default connect(null, mapDispatchToProps)(PreferencesShowHideMetrics);
