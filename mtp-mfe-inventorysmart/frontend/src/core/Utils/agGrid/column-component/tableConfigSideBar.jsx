// import { Button } from "@mui/material";
// import { Radio, RadioGroup, Button } from "impact-ui";
import { setColumnsConfiguration } from "core/actions/tableColumnActions";
import { Box } from "@mui/material";
import { useDispatch } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import makeStyles from "@mui/styles/makeStyles";
import { pxToRem } from "core/Utils/functions/utils";
import colours from "core/Styles/colours";
import { Select, RadioButtonGroup, Button, useTranslation } from "impact-ui-v3";
import { useEffect, useState } from "react";
import SaveIcon from "assets/save.svg";
import AgGridSearch from "../agGridSearch";
import { isEmpty, cloneDeep } from "lodash";
import { sortLabelValues } from "../constants";
import { initialRadioValues } from "../constants";

const useStyles = makeStyles((theme) => ({
  boxPadding: {
    //overwriting default padding in ag-column-select-header
    padding: "1.5rem 0  !important",
  },
  tableConfigSideBarContainer: {
    background: colours.white,
    "& .tableActionsTitleContainer": {
      display: "none",
    },
  },
  tableActionsTitleContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: pxToRem(12),
  },
  tableActionsTitle: {
    font: "Poppins",
    fontSize: pxToRem(14),
    fontWeight: 600,
    lineHeight: "100%",
    color: colours.fiord,
  },
  sortingOptionsContainer: {
    padding: `${pxToRem(16)} ${pxToRem(12)} ${pxToRem(12)} ${pxToRem(12)}`,
    // borderTop: `1px solid ${colours.alto}`,
    // borderBottom: `1px dotted ${colours.alto}`,
  },
  tableActionsDescription: {
    font: "Poppins",
    fontSize: pxToRem(12),
    fontWeight: 600,
    lineHeight: "100%",
    color: colours.fiord,
  },
  selectContainer: {
    "& .select-button": {
      minWidth: pxToRem(0),
      maxWidth: pxToRem(162),
      height: pxToRem(32),
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    marginTop: pxToRem(13),
  },
  radioGroupContainer: {
    marginTop: pxToRem(12),
    "& label": {
      fontSize: pxToRem(12),
      fontFamily: "Poppins",
      fontWeight: 400,
      lineHeight: "normal",
      fontStyle: "normal",
    },
  },
  actionButtonsContainer: {
    padding: `${pxToRem(16)} ${pxToRem(12)}`,
    cursor: "pointer",
    display: "flex",
    justifyContent: "flex-start",
    fontSize: pxToRem(12),
    fontStyle: "normal",
    fontWeight: 400,
    lineHeight: "normal",
  },
}));

const TableConfigSideBar = (props) => {
  const classes = useStyles();
  const { t } = useTranslation();
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [currentSortByOptions, setCurrentSortByOptions] = useState([]);
  const [selectedSortByOptions, setSelectedSortByOptions] = useState({});
  const [radioValue, setRadioValue] = useState("");
  // const [sortConfig, setSortConfig] = useState(props.sortConfig);
  const [radioValues, setRadioValues] = useState(
    initialRadioValues.map((item) => ({ ...item, label: t(item.label) }))
  );

  const dispatch = useDispatch();

  const displaySnackMessages = (message, variance) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
        },
      })
    );
  };

  const onClickHandler = async () => {
    try {
      const columnsList = props.columnApi
        .getAllGridColumns()
        .filter((item) => item.colId !== "Selection");
      let tableCode = -1;
      let payload = {
        tc_code: tableCode,
        preference: {},
      };
      let sortConfig = props.api.getSortState();    
      columnsList.forEach((item, index) => {
        const {
          column_name,
          is_editable,
          type,
          label,
          tc_code,
          extra,
        } = item.colDef;
        if (column_name) {
          sortConfig = props.api.getSortState();
          if (!isEmpty(sortConfig) && sortConfig[0].colId === column_name) {
            sortConfig[0].isSaved = true;
            extra.sort_config = sortConfig;
          } else if (extra?.sort_config) {
            delete extra.sort_config;
          }
          // Add table_formatting to the first column's extra
          if (index === 0 && props.saveTableFormat) {
            extra.table_formatting = {
              numeric_format: props.numericFormat,
              font_size: props.api?.getModel()?.appliedFontSize,
              content_density: props.contentDensity
            };
          }
          
          payload.preference = {
            ...payload.preference,
            [column_name]: {
              type,
              label,
              tc_code,
              is_frozen: item.pinned ? true : false,
              is_editable,
              order_of_display: index + 1,
              is_hidden: !item.visible,
              extra,
            },
          };
          if(tc_code){
            tableCode = tc_code;
          }
        }
      });
      payload.tc_code = tableCode;
      await setColumnsConfiguration(payload)();
      displaySnackMessages(t("tableSettings.configSavedSuccess"), "success");
      props.api.setSavedSortState(cloneDeep(sortConfig));
      onToolPanelVisibleChanged();
    } catch (err) {
      displaySnackMessages(t("tableSettings.somethingWentWrong"), "error");
      console.error("onClickHandler error:", err);
    }
  };

  const onToolPanelVisibleChanged = () => {
    try {
      let savedSortState = props?.api?.getSavedSortState
        ? props?.api?.getSavedSortState()
        : [];
      let sortConfig = cloneDeep(savedSortState);
      let radioValuesObj = cloneDeep(radioValues);
      if (!isEmpty(sortConfig) && sortConfig[0]?.isSaved) {
        let operationKeys = Object.keys(sortLabelValues[sortConfig[0].type]);
        radioValuesObj.map((item, index) => {
          item.id =
            sortLabelValues[sortConfig[0].type][operationKeys[index]].value;
          item.value =
            sortLabelValues[sortConfig[0].type][operationKeys[index]].value;
          item.label =
            t(sortLabelValues[sortConfig[0].type][operationKeys[index]].label);
        });
        setRadioValues(radioValuesObj);
        setRadioValue(sortConfig[0]?.sort);
        setCurrentSortByOptions([
          { label: sortConfig[0]?.label, value: sortConfig[0]?.label },
        ]);
        setSelectedSortByOptions({
          label: sortConfig[0]?.label,
          value: sortConfig[0]?.label,
        });
      } else if (isEmpty(sortConfig)) {
        setRadioValues(initialRadioValues.map((item) => ({ ...item, label: t(item.label) })));
        setRadioValue("");
        setCurrentSortByOptions([]);
        setSelectedSortByOptions({});
      }
    } catch (err) {
      console.error("onToolPanelVisibleChanged error:", err);
    }
  };

  useEffect(() => {
    if (!props.api) return;
    if (!props.api.onToolPanelVisibleChanged) {
      props.api.onToolPanelVisibleChanged = onToolPanelVisibleChanged;
    }
    onToolPanelVisibleChanged();
  }, [props.api]);

  return (
    <div className={classes.tableConfigSideBarContainer}>
      <div className={classes.sortingOptionsContainer}>
        <p className={classes.tableActionsDescription}>{t("tableSettings.sortingOptions")}</p>
        <div className={classes.selectContainer}>
          <Select
            label={t("tableSettings.sortedColumn")}
            placeholder={t("filters.select")}
            initialOptions={[]}
            isOpen={isSortOpen}
            setIsOpen={setIsSortOpen}
            currentOptions={currentSortByOptions}
            setCurrentOptions={setCurrentSortByOptions}
            selectedOptions={selectedSortByOptions}
            setSelectedOptions={setSelectedSortByOptions}
            isDisabled={true}
            labelOrientation="top"
          />
        </div>
        <div className={classes.radioGroupContainer}>
          {!isEmpty(radioValue) && (
            <RadioButtonGroup
              name="ia-test-radio-group"
              onChange={(value) => {
                setRadioValue(value);
              }}
              options={radioValues}
              orientation="column"
              selectedOption={radioValue}
              isDisabled={true}
            />
          )}
        </div>
      </div>
      <div className={classes.actionButtonsContainer}>
        {props.showSaveTableConfig && (
          <Button
            icon={<SaveIcon />}
            onClick={onClickHandler}
            variant="primary"
          >
            {t("tableSettings.saveView")}
          </Button>
        )}
      </div>
    </div>
  );
};

export default TableConfigSideBar;
