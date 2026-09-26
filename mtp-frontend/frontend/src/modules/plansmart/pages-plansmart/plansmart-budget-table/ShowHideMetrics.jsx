import React from "react";
import {
  Checkbox,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { useEffect } from "react";
import { useState } from "react";
import get from "lodash/get";
import {
  MAX_ROW_ALLOWED_FOR_COMPARE,
  SHOW_METRIC_MAX_ROW_ALLOWED_ERROR_MSG,
} from "modules/plansmart/constants-plansmart/stringConstants";
import { trackShowHideMetric } from "./budget-table-functions";
import colours from "core/Styles/colours";

const useStyles = makeStyles((theme) => ({
  container: {
    padding: "0px",
    height: "500px",
    overflowY: "auto",
  },
  nested: {
    paddingLeft: "20px",
  },
  divider: {
    borderColor: colours.gullGray,
  },
}));

const RenderListItems = ({
  row,
  keyValueObject,
  handleCheckbox,
  handleChecked,
  level,
  inx,
}) => {
  const [open, setOpen] = useState(false);
  const classes = useStyles(level);
  const isChecked = handleChecked(row.data);
  return (
    <>
      {row.label !== "undefined" && (
        <ListItem
          dense
          key={`${row.key}-${row.label}-${inx}`}
          secondaryAction={
            row.subRows.length > 0 && (
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={() => setOpen(!open)}
              >
                {open ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            )
          }
        >
          <ListItemIcon>
            <Checkbox
              disableRipple
              edge="start"
              checked={isChecked}
              onChange={() => handleCheckbox(keyValueObject, isChecked)}
            />
          </ListItemIcon>
          <ListItemText primary={row.label} />
        </ListItem>
      )}
      {row.subRows.length > 0 && (
        <List disablePadding component="div" className={classes.nested}>
          <Collapse in={open}>
            <GroupedAccordion
              rows={row.subRows}
              handleCheckbox={handleCheckbox}
              handleChecked={handleChecked}
              keyValueObject={keyValueObject}
              level={level + 1}
            />
          </Collapse>
        </List>
      )}
    </>
  );
};

const GroupedAccordion = ({
  rows,
  keyValueObject = {},
  handleCheckbox,
  handleChecked,
  level = 0,
}) => {
  return (
    <div>
      {rows.map((row, inx) => {
        const localKeyObj = {
          ...keyValueObject,
          [row.key]: row.label,
        };
        return (
          <RenderListItems
            row={row}
            keyValueObject={localKeyObj}
            handleCheckbox={handleCheckbox}
            handleChecked={handleChecked}
            level={level}
            inx={inx}
          />
        );
      })}
    </div>
  );
};

const ReferenceList = ({ list, handleChecked, handleCheckbox }) => (
  <List disablePadding component="div">
    {list.map((row, inx) => {
      const isChecked = handleChecked(row.data);
      return (
        <ListItem dense key={`${row.key}-${row.anotherKey}-${inx}`}>
          <ListItemIcon>
            <Checkbox
              disableRipple
              edge="start"
              checked={isChecked}
              onChange={() => handleCheckbox(row, isChecked)}
            />
          </ListItemIcon>
          <ListItemText primary={row.anotherKey} />
        </ListItem>
      );
    })}
  </List>
);

function AddHideMetrics(props) {
  const { hiddenMetrics, setHiddenMetrics, groupKeys, bucketSelection } = props;
  const classes = useStyles();
  // const groupKeys = ["category", "bucket_category"];
  const referenceGroupObj = {
    initialGroup: ["planCode"],
    referenceGroup: ["reference"],
    extraKeyToAdd: ["referenceLabel"],
  };
  const [groupedRows, setGroupedRows] = useState([]);
  const [localHiddenMetric, setLocalHiddenMetric] = useState(hiddenMetrics);
  const [referenceGroupList, setReferenceGroupList] = useState([]);
  const [bucketGroupList, setBucketGroupList] = useState([]);
  const updateState = () => {
    const rowData = get(props.tableRef, "current.props.rowData", []);
    const result = groupByKeys(rowData, 0, groupKeys, groupKeys.length - 1);
    const referenceList = getReferenceList(rowData, referenceGroupObj);
    setReferenceGroupList(referenceList);
    setGroupedRows(result);
    if (bucketSelection) {
      const bucketList = groupByKeys(rowData, 0, ["bucket"], 1, ["bucket"]);
      setBucketGroupList(bucketList);
    }
  };
  useEffect(() => {
    props.api.setAlwaysShowVerticalScroll(true);
    updateState();
    props.api.addEventListener("modelUpdated", updateState);

    return () => props.api.removeEventListener("modelUpdated", updateState);
  }, []);

  const updateHiddenMetrics = (newHiddenObj) => {
    if (setHiddenMetrics) {
      setHiddenMetrics(newHiddenObj);
    }
    setLocalHiddenMetric(newHiddenObj);
    props.tableRef.current.api.onFilterChanged();
    props.tableRef.current.api.refreshToolPanel();
  };

  const handleCheckBox = (checkListKey, currentCheckValue) => {
    let newHiddenObj = {
      ...localHiddenMetric,
    };
    props.tableRef.current.props.rowData.forEach((row) => {
      const valueCheck = Object.keys(checkListKey).reduce(
        (checkResult, key) => {
          return checkResult === null
            ? row[key] === checkListKey[key]
            : checkResult && row[key] === checkListKey[key];
        },
        null
      );
      if (valueCheck) {
        newHiddenObj = trackShowHideMetric(
          newHiddenObj,
          row,
          currentCheckValue
        );
        row.hide = currentCheckValue;
      }
    });
    updateHiddenMetrics(newHiddenObj);
  };

  const handleReferenceCheckbox = (refRowData, currentCheckValue) => {
    let newHiddenObj = {
      ...localHiddenMetric,
    };
    const visibleMetrics = referenceGroupList.filter((data) =>
      handleChecked(data?.data, true)
    );
    if (
      !currentCheckValue &&
      visibleMetrics.length + 1 > MAX_ROW_ALLOWED_FOR_COMPARE - 1
    ) {
      props.showSnackMessage(SHOW_METRIC_MAX_ROW_ALLOWED_ERROR_MSG, "error");
      return;
    }
    props.tableRef.current.props.rowData.forEach((row) => {
      if (
        row[refRowData.key] === refRowData.label &&
        (row.comparePlan === refRowData.comparePlan
          ? row.comparePlan
            ? row.planCode === refRowData.planCode
            : true
          : false)
      ) {
        newHiddenObj = trackShowHideMetric(
          newHiddenObj,
          row,
          currentCheckValue,
          true
        );
        row.hideReference = currentCheckValue;
      }
    });
    updateHiddenMetrics(newHiddenObj);
  };
  const handleChecked = (list = [], isReference = false, isBucket = false) => {
    const hierarchyKey = isBucket
      ? "hideBucket"
      : isReference
      ? "hideReference"
      : "hide";
    const noHiddenList = list.filter((data) => !data?.[hierarchyKey]);
    return noHiddenList.length !== 0;
  };
  const handleBucketCheckbox = (selectedRowData, currentCheckValue) => {
    let newHiddenObj = {
      ...localHiddenMetric,
    };
    props.tableRef.current.props.rowData.forEach((row) => {
      if (row[selectedRowData.key] === selectedRowData.anotherKey) {
        newHiddenObj = trackShowHideMetric(
          newHiddenObj,
          row,
          currentCheckValue,
          false,
          true
        );
        row.hideBucket = currentCheckValue;
      }
    });
    updateHiddenMetrics(newHiddenObj);
  };

  return (
    <div className={classes.container}>
      <List disablePadding component="div">
        <GroupedAccordion
          rows={groupedRows}
          handleCheckbox={handleCheckBox}
          handleChecked={(list) => handleChecked(list)}
        />
      </List>
      <Divider classes={{ root: classes.divider }} />
      <ReferenceList
        list={referenceGroupList}
        handleChecked={(list) => handleChecked(list, true)}
        handleCheckbox={handleReferenceCheckbox}
      />
      {bucketSelection && bucketGroupList.length > 0 && (
        <>
          <Divider classes={{ root: classes.divider }} />
          <ReferenceList
            list={bucketGroupList}
            handleChecked={(list) => handleChecked(list, false, true)}
            handleCheckbox={handleBucketCheckbox}
          />
        </>
      )}
    </div>
  );
}

export default AddHideMetrics;

//Utility

const getReferenceList = (list, groupKey) => {
  const { initialGroup, referenceGroup, extraKeyToAdd } = groupKey;
  const result = [];
  const referenceList = groupByKeys(list, 0, initialGroup, 0);
  referenceList.reverse().forEach((planDetail) => {
    const groupByReference = groupByKeys(
      planDetail.data,
      0,
      referenceGroup,
      0,
      extraKeyToAdd,
      true
    );
    result.push(...groupByReference);
  });
  return result.filter((ref) =>
    ref.label === "current" && !ref.comparePlan ? false : true
  );
};

const groupByKeys = (
  list,
  curInx,
  groupKeys,
  groupKeysLength,
  extraKeys = [],
  needPlanCode = false
) => {
  if (curInx > groupKeysLength) {
    return [];
  }
  const groupByKey = groupKeys[curInx];
  const extraKey = extraKeys.length > 0 && extraKeys[curInx];
  const groupByObj = list.reduce((initialObj, data) => {
    const initialObjData = get(initialObj, `${data[groupByKey]}.data`, []);
    return {
      ...initialObj,
      [data[groupByKey]]: {
        key: groupByKey,
        data: [...initialObjData, data],
        anotherKey: extraKey && data[extraKey],
        planCode: needPlanCode && data?.planCode,
        comparePlan: data?.comparePlan,
      },
    };
  }, {});
  return Object.keys(groupByObj).map((key) => {
    const obj = {
      label: key,
      key: groupByKey,
      extraKey: extraKey,
      anotherKey: groupByObj[key]?.anotherKey,
      planCode: groupByObj[key]?.planCode,
      comparePlan: groupByObj[key]?.comparePlan,
      data: groupByObj[key].data,
      subRows: groupByKeys(
        groupByObj[key].data,
        curInx + 1,
        groupKeys,
        groupKeysLength,
        extraKeys,
        needPlanCode
      ),
    };
    return obj;
  });
};
