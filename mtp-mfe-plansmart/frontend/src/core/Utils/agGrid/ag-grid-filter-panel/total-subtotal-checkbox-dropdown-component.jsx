import Checkbox from "@mui/material/Checkbox";
import { Select } from "impact-ui";
import FormControlLabel from "@mui/material/FormControlLabel";
import makeStyles from "@mui/styles/makeStyles";
import { pxToRem } from "core/Utils/functions/utils";
import { summarizedByDropdownOptions } from "../constants";
import { useState } from "react";
import colours from "core/Styles/colours";
import _, { cloneDeep, isEmpty } from "lodash";
import { useEffect } from "react";
import ReactSelect from "core/Utils/select";
import { getUniqueItems, removeObjectByValue } from "./utils";

const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    "& .MuiFormControlLabel-label": {
      minWidth: pxToRem(72.23),
    },
  },
  labelDropdownContainer: {
    "& .select-main-container .select-container .select-button": {
      width: "100%",
      padding: `${pxToRem(8)} ${pxToRem(16)}`,
      fontSize: pxToRem(12),
      fontWeight: 400,
      minWidth: pxToRem(0),
    },
    "& .select-dropdown-container": {
      minWidth: pxToRem(0),
    },
  },
  selectContainer: {
    width: "100%",
  }
}));

const TotalSubTotalCheckBoxDropdownComponent = (props) => {
  const { initialAppliedRowData, rowChipDroppedIn, rowChipDroppedOut } = props;
  const [isOpen, setIsOpen] = useState();
  const [currentSummarizedByOptions, setCurrentSummarizedByOptions] = useState(
    summarizedByDropdownOptions
  );
  const {
    label,
    totalSubtotalConfig,
    setTotalSubtotalConfig,
    fieldType,
    totalType,
    columnFields,
    rowFields,
    isDisabled,
  } = props;
  const classes = useStyles();

  /**
   * handleChangeTotalSubTotalFlow function
   * will handle the changes happening in the
   * checkbox and select component which is
   * present in the total-subtotal section
   * @param {string} changeType
   * @param {object} params
   * @param {string} field
   * @param {string} totalType
   */
  const handleChangeTotalSubTotalFlow = (
    changeType,
    params = {},
    field = "",
    totalType
  ) => {
    try {
      let totalSubtotalData = cloneDeep(totalSubtotalConfig);
      if (changeType === "dropdown") {
        if (field === "columns") {
          totalSubtotalData.columns.selectedOptions[totalType] = params;
        } else {
          totalSubtotalData.rows.selectedOptions[totalType] = params;
        }
      } else if (changeType === "checkBox") {
        if (field === "columns") {
          totalSubtotalData.columns.isCheckboxTicked[
            totalType
          ] = !totalSubtotalData.columns.isCheckboxTicked[totalType];
        } else {
          totalSubtotalData.rows.isCheckboxTicked[
            totalType
          ] = !totalSubtotalData.rows.isCheckboxTicked[totalType];
        }
      } else {
        totalSubtotalData.columns.dropdownData.total = !isEmpty(columnFields[0]) ? [columnFields[0]] : [];
        totalSubtotalData.columns.dropdownData.subtotal = columnFields.slice(1);
        totalSubtotalData.rows.dropdownData.total = !isEmpty(rowFields[0])
          ? [rowFields[0]]
          : [];
        totalSubtotalData.columns.selectedOptions["total"] = !isEmpty(
          columnFields[0]
        )
          ? columnFields[0]
          : [];
        totalSubtotalData.rows.selectedOptions["total"] = rowFields[0];
        totalSubtotalData.rows.selectedOptions["subtotal"] = isEmpty(
          initialAppliedRowData
        )
          ? rowFields.slice(1)
          : rowChipDroppedIn
          ? getUniqueItems([
              ...totalSubtotalData.rows.selectedOptions["subtotal"],
              rowFields[rowFields.length - 1],
            ])
          : rowChipDroppedOut?.droppedOut
          ? removeObjectByValue(
              totalSubtotalData.rows.selectedOptions["subtotal"],
              rowChipDroppedOut.chipData
            )
          : totalSubtotalData.rows.selectedOptions["subtotal"];
          totalSubtotalData.rows.dropdownData.subtotal = rowFields.slice(1);
      }
      if (isDisabled) {
        totalSubtotalData[fieldType].selectedOptions[totalType] = {};
      }
      setTotalSubtotalConfig(totalSubtotalData);
      setIsOpen(false);
    } catch (error) {
      console.error("handleChangeTotalSubTotal error", error);
    }
  };

  useEffect(() => {
    handleChangeTotalSubTotalFlow("rowColumnFieldsChange");
  }, [rowFields, columnFields]);

  return (
    <div className={classes.container}>
      <FormControlLabel
        control={
          <Checkbox
            checked={
              totalSubtotalConfig?.[fieldType]?.isCheckboxTicked?.[totalType]
            }
            onClick={() =>
              handleChangeTotalSubTotalFlow(
                "checkBox",
                {},
                fieldType,
                totalType
              )
            }
            isDisabled={isDisabled}
          />
        }
        label={label}
      />
      <div className={classes.selectContainer}>
        <ReactSelect
          value={totalSubtotalConfig?.[fieldType]?.selectedOptions?.[totalType]}
          isMulti={totalType === "subtotal"}
          isSearchable={totalType === "subtotal"}
          placeholder="Select rows"
          options={totalSubtotalConfig?.[fieldType]?.dropdownData?.[totalType]}
          onChange={(params) =>
            handleChangeTotalSubTotalFlow(
              "dropdown",
              params,
              fieldType,
              totalType
            )
          }
          isDisabled={
            isDisabled ||
            !totalSubtotalConfig?.[fieldType]?.isCheckboxTicked?.[totalType] ||
            (!isEmpty(
              totalSubtotalConfig?.[fieldType]?.selectedOptions?.[totalType]
            ) &&
              totalType === "total")
              ? true
              : false
          }
          isClearable
        />
      </div>
    </div>
  );
};

export default TotalSubTotalCheckBoxDropdownComponent;
