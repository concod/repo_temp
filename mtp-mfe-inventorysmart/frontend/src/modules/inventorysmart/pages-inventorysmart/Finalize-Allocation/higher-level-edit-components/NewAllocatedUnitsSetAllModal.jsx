import React, { useState } from "react";
import { Modal, Switch, Input, RadioButtonGroup } from "impact-ui-v3";
import VectorIcon from "assets/IS_icons/IS_VectorInfo.svg";
import makeStyles from "@mui/styles/makeStyles";
import { Card, CardContent } from "@mui/material";
import { USER_RESERVE_PERCENTAGE_VALIDATION_MSG } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { displaySnackMessages } from "../../inventorysmart-utility";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";

const useStyles = makeStyles(() => ({
  contentBody: {
    borderRadius: "8px",
    padding: "8px 16px",
    backgroundColor: "#E2F4FF",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  contentBodyText: {
    fontFamily: "Manrope",
    fontWeight: 600,
    fontSize: "14px",
    lineHeight: "21px",
    letterSpacing: "0%",
  },
  radioCard: {
    flex: "1",
    minWidth: "200px",
    border: "2px solid #e0e0e0",
    borderRadius: "12px",
    padding: "16px",
    margin: "8px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    "&:hover": {
      borderColor: "#1976d2",
    },
  },
  selectedCard: {
    borderColor: "#1976d2",
    backgroundColor: "#f3f8ff",
  },
  cardTitle: {
    fontWeight: "600",
    fontSize: "16px",
  },
  inputSection: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "8px",
  },
  textField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
    },
  },
  radioContainer: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "24px",
    marginTop: "16px",
  },
  cardContent: {
    padding: "0",
    "&:last-child": { paddingBottom: "0" },
  },
}));

const NewAllocatedUnitsSetAllModalComponent = (props) => {
  const { dynamicSetAllColumns = [] } = props;
  const [selectedOption, setSelectedOption] = useState(
    dynamicSetAllColumns?.[0]?.column_name || ""
  );
  const [columnValues, setColumnValues] = useState(
    dynamicSetAllColumns?.reduce((acc, column) => {
      acc[column.column_name] = { value: "", isPercentage: false };
      return acc;
    }, {}) || {}
  );

  const classes = useStyles();

  const resetEditValues = () => {
    setColumnValues(
      dynamicSetAllColumns?.reduce((acc, column) => {
        acc[column.column_name] = { value: "", isPercentage: false };
        return acc;
      }, {}) || {}
    );
  };

  const handleRadioChange = (value) => {
    setSelectedOption(value);
    resetEditValues();
  };

  const handleValueChange = (event, type) => {
    const value = event.target.value;

    if (value < 0) {
      displaySnackMessages("Value cannot be negative", "warning", props);
      return;
    }

    const isPercentage = columnValues[type].isPercentage;
    const minValue =
      props.minPackAndEaches?.[
        `min_${type}`
      ] ?? props.minPackAndEaches?.minPack; // fallback to minPack if specific min doesn't exist

    if (isPercentage && value > 100) {
      displaySnackMessages(
        USER_RESERVE_PERCENTAGE_VALIDATION_MSG,
        "warning",
        props
      );
      setColumnValues((prev) => ({
        ...prev,
        [type]: { ...prev[type], value: "" },
      }));
    } else if (!isPercentage && minValue !== null && value > minValue) {
      const selectedColumn = dynamicSetAllColumns?.find(
        (col) => col.column_name === type
      );
      const columnLabel = selectedColumn?.columnLabel || type;
      displaySnackMessages(
        `Value cannot be greater than the minimum ${columnLabel} value`,
        "warning",
        props
      );
      setColumnValues((prev) => ({
        ...prev,
        [type]: { ...prev[type], value: minValue },
      }));
    } else {
      setColumnValues((prev) => ({
        ...prev,
        [type]: { ...prev[type], value },
      }));
    }
  };

  const handleChangeValue = (event, type) => {
    handleValueChange(event, type);
  };

  const handlePercentageToggle = (event, type) => {
    const isChecked = event.target.checked;
    setColumnValues((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        isPercentage: isChecked,
        value: isChecked && prev[type].value ? "" : prev[type].value, // clear value if switching to percentage and has value
      },
    }));
  };

  const handleApplySetAll = () => {
    if (!selectedOption || !columnValues[selectedOption]) return;
    
    const selectedColumn = dynamicSetAllColumns?.find(col => col.column_name === selectedOption);
    const setAllData = {
      type: selectedOption?.includes("eaches") ? "eaches" : "packs",
      value: columnValues[selectedOption].value,
      isPercentage: columnValues[selectedOption].isPercentage,
      columnName: selectedOption,
      dc_code: selectedColumn?.dc_code,
    };
    props.onApplySetAll(setAllData);
    // Reset values and close modal
    handleCancelSetAll();
  };

  const handleCancelSetAll = () => {
    resetEditValues();
    props.closeSetAllModal();
  };

  const isApplyDisabled = () => {
    if (!selectedOption || !columnValues) return true;
    const currentValue = columnValues[selectedOption]?.value;
    return !currentValue || currentValue === "" || currentValue === null || currentValue === undefined;
  };

  return (
    <>
      <Modal
        onClose={props.closeSetAllModal}
        onPrimaryButtonClick={() => handleApplySetAll()}
        onSecondaryButtonClick={() => handleCancelSetAll()}
        primaryButtonLabel="Apply"
        primaryButtonProps={{
          disabled: isApplyDisabled(),
        }}
        secondaryButtonLabel="Cancel"
        size="medium"
        title="Set All"
        open={props.showSetAllModal}
      >
        <div>
          <div className={classes.contentBody}>
            <span>
              <VectorIcon />
            </span>
            {/* to check about how to pass upto limit incase of multi DC value */}
            <span className={classes.contentBodyText}>
              "Set All" will only update rows where the entered units are less
              than the current allocated units, only decreases are allowed.
            </span>
          </div>
          <div>
            <div className={classes.radioContainer}>
              {dynamicSetAllColumns?.map((column) => {
                return (
                  <Card
                    key={column.column_name}
                    className={`${classes.radioCard} ${
                      selectedOption === column.column_name ? classes.selectedCard : ""
                    }`}
                  >
                    <CardContent className={classes.cardContent}>
                      <RadioButtonGroup
                        onChange={() => handleRadioChange(column.column_name)}
                        options={[
                          {
                            label: column.columnLabel,
                            value: column.column_name,
                          },
                        ]}
                        selectedOption={selectedOption}
                      />
                      {selectedOption === column.column_name && (
                        <div className={classes.inputSection}>
                          <Input
                            onChange={(e) => handleChangeValue(e, column.column_name)}
                            placeholder="Enter value"
                            type={
                              columnValues[column.column_name].isPercentage
                                ? "percentage"
                                : "number"
                            }
                            value={columnValues[column.column_name].value}
                          />
                          <Switch
                            value={columnValues[column.column_name].isPercentage}
                            onChange={(e) => handlePercentageToggle(e, column.column_name)}
                            rightLabel="%"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (data) => dispatch(addSnack(data)),
});

export default connect(
  null,
  mapDispatchToProps
)(NewAllocatedUnitsSetAllModalComponent);
