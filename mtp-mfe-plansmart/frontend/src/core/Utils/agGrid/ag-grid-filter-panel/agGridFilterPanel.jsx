import React, { useEffect, useState } from "react";
import { Button, Typography } from "@mui/material";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import makeStyles from "@mui/styles/makeStyles";
import { Panel, Badge, Select } from "impact-ui";
import Form from "core/Utils/form/index";
import BackupTableIcon from "@mui/icons-material/BackupTable";
import _, { cloneDeep, isEmpty, isNil } from "lodash";
import {
  FORMAT_DROPDOWN,
  initialTotalSubtotalConfig,
  summarizedByDropdownOptions,
} from "../constants";
import globalStyles from "core/Styles/globalStyles";
import { pxToRem, splitStringFromLastUnderscore } from "../../functions/utils";
import colours from "core/Styles/colours";
import { displaySnackMessages } from "../../utils";
import { useDispatch } from "react-redux";
import TotalSubTotalCheckBoxDropdownComponent from "./total-subtotal-checkbox-dropdown-component";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";

const useStyles = makeStyles((theme) => ({
  panelContainer: {
    "& .panel-container": {
      top: `calc(${theme.customVariables.headerHeight} + 2rem)`,
    },
  },
  headerTextMargin: {
    marginBottom: "0.5rem",
    font: `normal normal 600 ${pxToRem(14)}/normal Poppins`,
    color: colours.codGray,
  },
  chipsContainer: {
    border: `1px solid ${theme.palette.colours.tableBorderColor}`,
    borderRadius: "0.25rem",
    flexWrap: "wrap",
    gap: "0.5rem",
    padding: "0.5rem",

    "& .ligth-badge": {
      opacity: 0.5,
    },
  },
  swapButton: {
    minWidth: "unset",
    padding: "0.5rem",
  },
  dashContainer: {
    borderStyle: "dashed",
    borderColor: `${theme.palette.common.black}`,
    minHeight: "2.75rem",
  },
  horizontalLine: {
    width: "100%",
    borderBottom: pxToRem(1),
    color: colours.gallery,
    margin: `${pxToRem(16)} ${pxToRem(0)}`,
  },
  labelDropdownContainer: {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(4),
    fontSize: pxToRem(12),
    height: pxToRem(26),
    padding: `${pxToRem(4)} ${pxToRem(8)}`,
    fontSize: pxToRem(12),
    lineHeight: pxToRem(18),
    borderRadius: pxToRem(4),
    background: colours.white,
    border: `${pxToRem(1)} solid ${colours.endavour}`,
    color: colours.endavour,
    "& .select-main-container .select-container .select-button": {
      width: "fit-content",
      minWidth: pxToRem(0),
      padding: pxToRem(4),
      height: pxToRem(18),
      fontSize: pxToRem(12),
    },
  },
  totalSubTotalSection: {
    width: "60%",
    // display: "grid",
    // gridTemplateColumns: "1fr 1fr",
    // gap: pxToRem(10),
    marginTop: pxToRem(28),
  },
  totalSubTotalInnerSection: {
    marginTop: pxToRem(8),
    display: "flex",
    flexDirection: "column",
    gap: pxToRem(14),
  },
}));

const FilterPanel = (props) => {
  const { rows = [], columns = [], agGrid, rowData, isRendered } = props;
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [isOpen, setIsOpen] = useState(false);
  const [formatConfig, setFormatConfig] = useState([]);
  const [formatDependency, setFormatDependency] = useState({});
  const [filterDropdownConfig, setFilterDropdownConfig] = useState([]);
  const [filterFormConfig, setFilterFormConfig] = useState([]);
  const [
    filterDropDownFormatDependency,
    setFilterDropDownFormatDepency,
  ] = useState({});
  const [initialFilterDropdownValues, setInitialFilterDropdownValues] = useState({});
  const [fields, setFields] = useState([]);
  //rows config
  const [rowFields, setRowFields] = useState([]);
  //columns config
  const [columnFields, setColumnFields] = useState([]);
  //filters config
  const [filtersFields, setFiltersFields] = useState([]);
  const [pivotDataForFilterFields, setPivotDataForFilterFields] = useState([]);
  const [valuesFields, setValuesFields] = useState([]);
  //values config
  const [valuesConfig, setValuesConfig] = useState({});
  //total-subtotal config
  const [totalSubtotalConfig, setTotalSubtotalConfig] = useState(
    initialTotalSubtotalConfig
  );
  const [moveToRowLabel, setMoveToRowLabel] = useState(false);
  const [initialAppliedRowData, setInitialAppliedRowData] = useState([]);
  const [rowChipDroppedIn, setRowChipDroppedIn] = useState(false);
  const [rowChipDroppedOut, setRowChipDroppedOut] = useState({
    droppedOut: false,
    chipData: {},
  });
  const formatOptions = [
    { value: "default", label: "Default" },
    { value: "row_repetition", label: "Row repetition" },
    { value: "with_indentation", label: "With Indentation" },
  ];
  const [currentSummarizedByOptions, setCurrentSummarizedByOptions] = useState(
    summarizedByDropdownOptions
  );
  const dispatch = useDispatch();

  useEffect(() => {
    const config = cloneDeep(FORMAT_DROPDOWN)?.map((item) => {
      const defaultSelected = {};
      defaultSelected[item.column_name] = formatOptions[0].value;
      setFormatDependency(defaultSelected);
      return {
        ...item,
        options: formatOptions,
      };
    });
    setFormatConfig(config);
    setColumnFields(columns);
    setRowFields(rows);
  }, []);

  
   const getColumnConfigWithSubheadersOnTopLevel = (column) => {
    const { sub_headers } = column;
  
    if (isEmpty(sub_headers)) {
      return column;
    } else {
      const subHeaders = column.sub_headers.map((item) => {
        return getColumnConfigWithSubheadersOnTopLevel(item);
      });
      return subHeaders;
    }
  };

  /**
   * prepareFilterDropdownData function is being
   * used to prepare dropdown data of filter
   * fields
   */
  const prepareFilterDropdownData = () => {
    try {
      const columnsList = agGrid?.api
        ?.getColumnDefs()
        .filter(
          (item) => item.colId !== "Selection" && !isNil(item.column_name)
        )
        .map((col) => getColumnConfigWithSubheadersOnTopLevel(cloneDeep(col)));
      let columnData = columnsList.flat(Infinity).map((item) => {
        return {
          value: item?.column_name,
          label: item?.label,
          id: item?.column_name,
        };
      });
      setFields(columnData);
      let dropDownDetailsObj = {};
      let filterArray = [];
      let defaultValues = {};
      columnData.forEach((column) => {
        let obj = {};
        obj[column.value] = cloneDeep(FORMAT_DROPDOWN[0]);
        obj[column.value].column_name = column.value;
        obj[column.value].filter_keyword = column.value;
        obj[column.value].accessor = column.value;
        obj[column.value].label = column.label;
        obj[column.value].is_multiple_selection = true;
        obj[column.value].isMulti = true;
        obj[column.value].isClearable = true;
        let isDisabled = false;
        let options = [];
        rowData.forEach((row) => {
          if (row?.[column.value]) {
            options.push({
              value: row[column.value],
              label: row[column.value],
              id: row[column.value],
            });
            isDisabled = false;
          } else {
            isDisabled = true;
          }
        });
        obj[column.value].isDisabled = isDisabled;
        let uniqueOptions = _.uniqBy(options, "value");
        obj[column.value].options = uniqueOptions;
        defaultValues[column.value] = uniqueOptions;
        setFilterDropDownFormatDepency(defaultValues);
        filterArray.push(obj[column.value]);
        dropDownDetailsObj = { ...dropDownDetailsObj, ...obj };
      });
      setFilterDropdownConfig(dropDownDetailsObj);
    } catch (error) {
      console.error("prepareFilterDropdownData error", error);
    }
  };

  /**
   * addDropdownWhenFieldisDraggedAndDrop function is
   * being used to add/remove the dropdown field whenever a
   * chip is drap/undragged to the filter section
   */
  const addDropdownWhenFieldisDraggedAndDrop = () => {
    try {
      if (filtersFields?.length > 0) {
        let formFields = [];
        let configKeyData = Object.keys(filterDropdownConfig);
        filtersFields.forEach((field) => {
          if (configKeyData.indexOf(field.value) > -1) {
            formFields.push(filterDropdownConfig[field.value]);
          }
        });
        setFilterFormConfig(formFields);
      } else {
        setFilterFormConfig([]);
      }
    } catch (error) {
      console.error("addDropdownWhenFieldisDraggedAndDrop error", error);
    }
  };

  useEffect(() => {
    addDropdownWhenFieldisDraggedAndDrop();
  }, [filtersFields]);

  useEffect(() => {
    prepareFilterDropdownData();
  }, [rowData]);

  /**
   * @function
   * @description Handle swap operation between row and column fields
   */
  const handleSwap = () => {
    const swapperVar = cloneDeep(rowFields);
    setRowFields(cloneDeep(columnFields));
    setColumnFields(swapperVar);
  };

  /**
   * setSelectedOptionsForValuesDropdown function
   * will be mainly used as onChange function
   * for the select component which is used
   * with values chips
   * @param {Object} dropdownParams
   * @param {string} columnName
   */
  const setSelectedOptionsForValuesDropdown = (dropdownParams, columnName) => {
    try {
      let config = cloneDeep(valuesConfig);
      let updatedColumnConfig = config[columnName];
      updatedColumnConfig.selectedOptions = dropdownParams;
      updatedColumnConfig.isOpen = !updatedColumnConfig.isOpen;
      config = { ...config, [columnName]: { ...updatedColumnConfig } };
      setValuesConfig(config);
    } catch (error) {
      console.error("setSelectedOptionsForValuesDropdown error", error);
    }
  };

  /**
   * onOpenOfValuesSection function
   * will be mainly used as onOpen function
   * for the select component which is used
   * with values chips which will basically be used
   * to open and close the dropdown
   * @param {string} columnName
   */
  const onOpenOfValuesSection = (columnName) => {
    try {
      let config = cloneDeep(valuesConfig);
      let updatedColumnConfig = config[columnName];
      if (!isEmpty(updatedColumnConfig)) {
        updatedColumnConfig.isOpen = !updatedColumnConfig.isOpen;
      } else {
        updatedColumnConfig = {};
        updatedColumnConfig.isOpen = true;
      }
      config = { ...config, [columnName]: { ...updatedColumnConfig } };
      setValuesConfig(config);
    } catch (error) {
      console.error("onOpenOfValuesSection error", error);
    }
  };

  /**
   * @function
   * @description Add element's data to transfer constructor while start to drag a badge
   * @param {Object} event
   * @param {String} value
   * @param {String} from
   */
  const showLightBadge = (event, value, from) => {
    event.target.classList.add("ligth-badge");
    event.dataTransfer.clearData();
    event.dataTransfer.setData("data", `${value}-++-${from}`);
  };

  /**
   * @function
   * @description Remove light-badge class from elenent just dragged
   * @param {Object} event
   */
  const hideLightBadge = (event) => {
    event.target.classList.remove("ligth-badge");
  };

  /**
   * @function
   * @description Handle defaulte operation on drageOver other elements
   * @param {Object} event
   */
  const dragOver = (event) => {
    event.preventDefault();
  };

  /**
   * @function
   * @description Handle badge changes when badges dropped into other container
   * @param {Object} event
   * @param {String} type
   */
  const onDrop = (event, type) => {
    const itemData = event.dataTransfer.getData("data").split("-++-");
    const data = {
      val: itemData[0],
      category: itemData[1],
    };
    let fromRow = false;
    let fromColumn = false;
    if (type === data.category) {
      return;
    }
    let badgeData;
    let badgeIndex;
    let valuesConfigData = {};
    switch (data.category) {
      case "columns":
        const newColumnFields = columnFields?.filter((item) => {
          if (data.val === item.value) {
            badgeData = item;
            return false;
          } else {
            return true;
          }
        });
        setColumnFields(newColumnFields);
        fromColumn = true;
        break;
      case "rows":
        const newRowFields = rowFields?.filter((item) => {
          if (data.val === item.value) {
            badgeData = item;
            return false;
          } else {
            return true;
          }
        });
        setRowFields(newRowFields);
        fromRow = true;
        let chipDroppedOutData = cloneDeep(rowChipDroppedOut);
        chipDroppedOutData.droppedOut = true;
        chipDroppedOutData.chipData = badgeData;
        setRowChipDroppedIn(false);
        setRowChipDroppedOut(chipDroppedOutData)
        break;
      case "filters":
        const newFilterFields = filtersFields?.filter((item) => {
          if (data.val === item.value) {
            badgeData = item;
            return false;
          } else {
            return true;
          }
        });
        setFiltersFields(newFilterFields);
        break;
      case "values":
        const newValueFields = valuesFields?.filter((item, index) => {
          if (data.val === item.value) {
            badgeData = item;
            badgeIndex = index;
            return false;
          } else {
            return true;
          }
        });
        setValuesFields(newValueFields);
        valuesConfigData = cloneDeep(valuesConfig);
        delete valuesConfigData[`${badgeData.value}_${badgeIndex}`];
        let lengthOfNewValueFields = newValueFields?.length;
        let currentIndex = 0;
        for (let key in valuesConfigData) {
          if(currentIndex <= lengthOfNewValueFields - 1) {
            let actualKey = splitStringFromLastUnderscore(key);
            valuesConfigData[`${actualKey}_${currentIndex}`] = cloneDeep(valuesConfigData[key]);
            `${actualKey}_${currentIndex}` !== key ? delete valuesConfigData[key] : null;
            currentIndex++;
          }
        }
        setValuesConfig(valuesConfigData);
        break;
      default:
        fields?.forEach((item) => {
          if (data.val === item.value) {
            badgeData = item;
            return false;
          } else {
            return true;
          }
        });
        setFields(fields);
    }

    switch (type) {
      case "columns":
        if (
          _.findIndex(rowFields, { value: badgeData.value }) > -1 &&
          !fromRow
        ) {
          displaySnackMessages(
            "Columns cannot contain same fields as rows",
            "warning",
            dispatch
          );
          return;
        } else if (_.findIndex(columnFields, { value: badgeData.value }) > -1) {
          displaySnackMessages(
            "Columns cannot contain duplicate fields",
            "warning",
            dispatch
          );
          return;
        } else {
          setColumnFields([...columnFields, badgeData]);
        }
        break;
      case "rows":
        if (
          _.findIndex(columnFields, { value: badgeData.value }) > -1 &&
          !fromColumn
        ) {
          displaySnackMessages(
            "Rows cannot contain same fields as column",
            "warning",
            dispatch
          );
          return;
        } else if (_.findIndex(rowFields, { value: badgeData.value }) > -1) {
          displaySnackMessages(
            "Rows cannot contain duplicate fields",
            "warning",
            dispatch
          );
        } else {
          setRowFields([...rowFields, badgeData]);
        }
        let chipDroppedOutData = cloneDeep(rowChipDroppedOut);
        chipDroppedOutData.droppedOut = false;
        setRowChipDroppedOut(chipDroppedOutData)
        setRowChipDroppedIn(true);
        break;
      case "filters":
        if (_.findIndex(filtersFields, { value: badgeData.value }) > -1) {
          displaySnackMessages(
            "Filters cannot contain duplicate fields",
            "warning",
            dispatch
          );
          return;
        } else {
          setFiltersFields([...filtersFields, badgeData]);
        }
        break;
      case "values":
        setValuesFields([...valuesFields, badgeData]);
        let valuesData = [...valuesFields, badgeData];
        let newIndex = valuesData?.length - 1;
        valuesConfigData[`${badgeData.value}_${newIndex}`] = {
          isOpen: false,
          selectedOptions: summarizedByDropdownOptions[0],
        };
        setValuesConfig({ ...valuesConfig, ...valuesConfigData });
        break;
      default:
        setFields(fields);
    }
    props.handleChange &&
      props.handleChange({ fields, rowFields, columnFields });
  };

  const hanlePanelClose = () => {
    setIsOpen(false);
  };

  const handlePanelReset = () => {
    setRowFields([]);
    setColumnFields([]);
    setValuesFields([]);
    setValuesConfig({});
    setFiltersFields([]);
    setPivotDataForFilterFields([]);
    setTotalSubtotalConfig(initialTotalSubtotalConfig);
    setMoveToRowLabel(false);
    setInitialAppliedRowData([]);
    setRowChipDroppedIn(false);
    let chipDroppedOutData = cloneDeep(rowChipDroppedOut);
    chipDroppedOutData.droppedOut = false;
    setRowChipDroppedOut(chipDroppedOutData);
    props.applyFilter({
      rowFields: [],
      columnFields: [],
      pivotDataForFilterFields: [],
      valuesConfig: {},
      totalSubtotalConfig: {},
      moveToRowLabel: false
    });
  };

  const findExcludedValues = (initial, later) => {
    const laterValues = new Set(later.map(obj => obj.value));
    return initial
      .filter(obj => !laterValues.has(obj.value))
      .map(obj => obj.value);
  }

  const prepareExcludedFilterDataForPivot = (initialFilterData, changedFilterData, filterFieldsChanged = false) => {
    try {
      if(filterFieldsChanged) {
        let newFilterData = cloneDeep(initialFilterData);
        filtersFields.forEach((filter) => {
          let newFilterValueData = newFilterData[filter.value].filter(
            (item) => !(pivotDataForFilterFields.indexOf(item.value) >= 0)
          );
          newFilterData[filter.value] = newFilterValueData;
          newFilterData[`${filter.value}_options`] = newFilterValueData;
        });
        setFilterDropDownFormatDepency(newFilterData);
        return;
      }
      let excludedData = [];
      Object.keys(initialFilterData).forEach((filterKey) => {
        let excludedValue;
        if (!isEmpty(changedFilterData[`${filterKey}_options`])) {
          excludedValue = findExcludedValues(
            initialFilterData[filterKey],
            changedFilterData[`${filterKey}_options`]
          );
          excludedData.push(excludedValue);
        }
      })
      let data = excludedData.flat(Infinity);
      setPivotDataForFilterFields(data);
    }
    catch(error) {
      console.error("prepareExcludedFilterDataForPivot error", error)
    }
  }

  useEffect(() => {
    if (isEmpty(initialFilterDropdownValues)) {
      setInitialFilterDropdownValues(cloneDeep(filterDropDownFormatDependency));
    }
    if (!isEmpty(initialFilterDropdownValues)) {
      prepareExcludedFilterDataForPivot(
        cloneDeep(initialFilterDropdownValues),
        cloneDeep(filterDropDownFormatDependency)
      );
    }
  }, [filterDropDownFormatDependency]);

  useEffect(() => {
    if (!isEmpty(initialFilterDropdownValues)) {
      setPivotDataForFilterFields([]);
      prepareExcludedFilterDataForPivot(
        cloneDeep(initialFilterDropdownValues),
        cloneDeep(filterDropDownFormatDependency),
        true
      );
    }
  }, [filtersFields]);

  const handlePanelApply = () => {
    props.applyFilter({
      rowFields,
      columnFields,
      pivotDataForFilterFields,
      valuesConfig,
      totalSubtotalConfig,
      moveToRowLabel,
    });
    setIsOpen(false);
    if (isEmpty(initialAppliedRowData)) {
      setInitialAppliedRowData(cloneDeep(rowFields));
      setRowChipDroppedIn(false);
      let chipDroppedOutData = cloneDeep(rowChipDroppedOut);
      chipDroppedOutData.droppedOut = false;
      setRowChipDroppedOut(chipDroppedOutData);
    }
  };

  const handleMoveToRowLabelCheckboxChange = (event) => {
    setMoveToRowLabel((prev) => !prev);
  };

  return (
    <>
      <Button variant="contained" onClick={() => setIsOpen(true)}>
        <BackupTableIcon />
      </Button>
      <div className={`${globalClasses.panelWrapper}`}>
        <Panel
          size="medium"
          isOpen={isOpen}
          onClose={hanlePanelClose}
          title="Table Settings"
          primaryButtonProps={{ children: "Apply", onClick: handlePanelApply }}
          tertiaryButtonProps={{ children: "Reset", onClick: handlePanelReset }}
        >
          <div
            onClick={(event) => {
              event.stopPropagation(), event.preventDefault();
            }}
          >
            <Form
              layout={"horizontal"}
              maxFieldsInRow={1}
              handleChange={(dependency) => {
                setFormatDependency(dependency);
              }}
              fields={formatConfig}
              updateDefaultValue={false}
              defaultValues={formatDependency}
            ></Form>
            <div
              className={`${globalClasses.horizontalBottomLine} ${globalClasses.marginVertical1rem}`}
            ></div>
            <Typography component="h3" variant="h6">
              Choose fields to add to table
            </Typography>
            <Typography
              component="p"
              variant="subtitle1"
              className={`${classes.headerTextMargin}`}
            >
              Drag and drop fields below in order you want
            </Typography>
            <div
              className={`${classes.chipsContainer} ${globalClasses.flexRow} ${globalClasses.marginBottom}`}
              onDragOver={(e) => dragOver(e)}
              onDrop={(e) => onDrop(e, "fields")}
            >
              {fields?.map((badge) => (
                <Badge
                  draggable
                  onDragStart={(event) =>
                    showLightBadge(event, badge.value, "fields")
                  }
                  onDragEnd={(event) => hideLightBadge(event)}
                  key={badge.value}
                  label={badge.label}
                  outline
                />
              ))}
            </div>
            <Typography
              component="p"
              variant="body2"
              className={`${classes.headerTextMargin}`}
            >
              Columns
            </Typography>
            <div
              className={`${classes.chipsContainer} ${classes.dashContainer} ${globalClasses.flexRow} ${globalClasses.marginBottom}`}
              onDragOver={(e) => dragOver(e)}
              onDrop={(e) => onDrop(e, "columns")}
            >
              {columnFields?.map((badge) => (
                <Badge
                  draggable
                  onDragStart={(event) =>
                    showLightBadge(event, badge.value, "columns")
                  }
                  onDragEnd={(event) => hideLightBadge(event)}
                  key={badge.value}
                  label={badge.label}
                  variant="info"
                  outline
                />
              ))}
            </div>
            <div className={globalClasses.centerAlign}>
              <Button
                variant="outlined"
                onClick={handleSwap}
                fontSize="small"
                className={classes.swapButton}
              >
                <SwapVertIcon fontSize="inherit" />
              </Button>
            </div>
            <Typography
              component="p"
              variant="body2"
              className={`${classes.headerTextMargin}`}
            >
              Rows
            </Typography>
            <div
              className={`${classes.chipsContainer} ${classes.dashContainer} ${globalClasses.flexRow} ${globalClasses.marginBottom}`}
              onDragOver={(e) => dragOver(e)}
              onDrop={(e) => onDrop(e, "rows")}
            >
              {rowFields?.map((badge) => (
                <Badge
                  draggable
                  onDragStart={(event) =>
                    showLightBadge(event, badge.value, "rows")
                  }
                  onDragEnd={(event) => hideLightBadge(event)}
                  key={badge.value}
                  label={badge.label}
                  variant="info"
                  outline
                />
              ))}
            </div>
            <hr className={classes.horizontalLine} />
            <Typography
              component="p"
              variant="body2"
              className={`${classes.headerTextMargin}`}
            >
              Filters
            </Typography>
            <div
              className={`${classes.chipsContainer} ${classes.dashContainer} ${globalClasses.flexRow} ${globalClasses.marginBottom}`}
              onDragOver={(e) => dragOver(e)}
              onDrop={(e) => onDrop(e, "filters")}
            >
              {filtersFields?.map((badge) => (
                <Badge
                  draggable
                  onDragStart={(event) =>
                    showLightBadge(event, badge.value, "filters")
                  }
                  onDragEnd={(event) => hideLightBadge(event)}
                  key={badge.value}
                  label={badge.label}
                  variant="info"
                  outline
                />
              ))}
            </div>
            {filtersFields.length > 0 && (
              <Form
                layout={"horizontal"}
                maxFieldsInRow={2}
                handleChange={(dependency) => {
                  setFilterDropDownFormatDepency(dependency);
                }}
                fields={filterFormConfig}
                updateDefaultValue={false}
                defaultValues={filterDropDownFormatDependency}
              ></Form>
            )}

            <hr
              className={`${classes.horizontalLine} ${globalClasses.marginTop}`}
            />
            <Typography
              component="p"
              variant="body2"
              className={`${classes.headerTextMargin}`}
            >
              Values
            </Typography>
            <div
              className={`${classes.chipsContainer} ${classes.dashContainer} ${globalClasses.flexRow} ${globalClasses.marginBottom}`}
              onDragOver={(e) => dragOver(e)}
              onDrop={(e) => onDrop(e, "values")}
            >
              {valuesFields?.map((badge, index) => (
                <div
                  draggable
                  onDragStart={(event) =>
                    showLightBadge(event, badge.value, "values")
                  }
                  onDragEnd={(event) => hideLightBadge(event)}
                  key={badge.value}
                  variant="info"
                  outline
                >
                  <div className={classes.labelDropdownContainer}>
                    <p className="badge-label">{badge.label}</p>
                    <Select
                      label=""
                      placeholder={"Select "}
                      initialOptions={summarizedByDropdownOptions}
                      isOpen={
                        valuesConfig?.[`${badge.value}_${index}`]?.isOpen
                          ? true
                          : false
                      }
                      setIsOpen={() =>
                        onOpenOfValuesSection(`${badge.value}_${index}`)
                      }
                      currentOptions={currentSummarizedByOptions}
                      setCurrentOptions={setCurrentSummarizedByOptions}
                      selectedOptions={
                        valuesConfig?.[`${badge.value}_${index}`]
                          ?.selectedOptions
                          ? valuesConfig?.[`${badge.value}_${index}`]
                              ?.selectedOptions
                          : summarizedByDropdownOptions[0]
                      }
                      labelOrientation="top"
                      onChange={(params) =>
                        setSelectedOptionsForValuesDropdown(
                          params,
                          `${badge.value}_${index}`
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <hr
              className={`${classes.horizontalLine} ${globalClasses.marginTop}`}
            />
            <div className={classes.totalSubTotalSection}>
              {/* <div>
                <p className={classes.headerTextMargin}>Show Column :</p>
                <div className={classes.totalSubTotalInnerSection}>
                  <TotalSubTotalCheckBoxDropdownComponent
                    label="Sub Totals"
                    setTotalSubtotalConfig={setTotalSubtotalConfig}
                    totalSubtotalConfig={totalSubtotalConfig}
                    fieldType="columns"
                    totalType="subtotal"
                    columnFields={columnFields}
                    rowFields={rowFields}
                    isDisabled={columnFields.length > 0 ? false : true}
                  />
                  <TotalSubTotalCheckBoxDropdownComponent
                    label="Totals"
                    setTotalSubtotalConfig={setTotalSubtotalConfig}
                    totalSubtotalConfig={totalSubtotalConfig}
                    fieldType="columns"
                    totalType="total"
                    columnFields={columnFields}
                    rowFields={rowFields}
                    isDisabled={columnFields.length > 0 ? false : true}
                  />
                </div>
              </div> */}
              <div>
                <p className={classes.headerTextMargin}>Show Row :</p>
                <div className={classes.totalSubTotalInnerSection}>
                  <TotalSubTotalCheckBoxDropdownComponent
                    label="Sub Totals"
                    setTotalSubtotalConfig={setTotalSubtotalConfig}
                    totalSubtotalConfig={totalSubtotalConfig}
                    fieldType="rows"
                    totalType="subtotal"
                    columnFields={columnFields}
                    rowFields={rowFields}
                    isDisabled={rowFields.length > 0 ? false : true}
                    initialAppliedRowData={initialAppliedRowData}
                    rowChipDroppedIn={rowChipDroppedIn}
                    rowChipDroppedOut={rowChipDroppedOut}
                  />
                  <TotalSubTotalCheckBoxDropdownComponent
                    label="Totals"
                    setTotalSubtotalConfig={setTotalSubtotalConfig}
                    totalSubtotalConfig={totalSubtotalConfig}
                    fieldType="rows"
                    totalType="total"
                    columnFields={columnFields}
                    rowFields={rowFields}
                    isDisabled={rowFields.length > 0 ? false : true}
                    initialAppliedRowData={initialAppliedRowData}
                    rowChipDroppedIn={rowChipDroppedIn}
                    rowChipDroppedOut={rowChipDroppedOut}
                  />
                </div>
              </div>
            </div>
            <hr
              className={`${classes.horizontalLine} ${globalClasses.marginTop}`}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={moveToRowLabel}
                  onClick={handleMoveToRowLabelCheckboxChange}
                  name="simpleCheckbox"
                  color="primary"
                  disabled={valuesFields?.length < 2}
                />
              }
              label="Move To Row Labels"
            />
          </div>
        </Panel>
      </div>
    </>
  );
};

export default FilterPanel;
