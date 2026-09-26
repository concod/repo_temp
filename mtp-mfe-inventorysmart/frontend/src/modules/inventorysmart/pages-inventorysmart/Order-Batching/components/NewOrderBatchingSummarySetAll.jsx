import React, { useState, useEffect, useMemo } from "react";
import { Modal, Switch, Input, Chips, Panel, useTranslation } from "impact-ui-v3";
import VectorIcon from "assets/IS_icons/IS_VectorInfo.svg";
import makeStyles from "@mui/styles/makeStyles";
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
  sectionTitle: {
    fontFamily: "Manrope",
    fontWeight: 700,
    fontSize: "14px",
    lineHeight: "21px",
    marginTop: "24px",
    textTransform: "capitalize",
    marginBottom: "16px",
  },
  chipsContainer: {
    display: "flex",
    gap: "16px",
    marginBottom: "16px",
  },
  inputLabel: {
    fontFamily: "Manrope",
    fontSize: "12px",
    color: "#60697D",
    marginBottom: "4px",
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "16px",
    textTransform: "capitalize",
  },
  inputSection: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "4px",
  },
}));

const NewOrderBatchingSummarySetAll = (props) => {
  const availableFields = useMemo(() => {
    const fields =
      props.availableFields?.length > 0
        ? props.availableFields
        : ["packs", "eaches"];
    return fields;
  }, [props.availableFields]);

  const getDefaultOption = () =>
    availableFields.includes("packs") ? "packs" : "eaches";

  const [selectedOption, setSelectedOption] = useState(getDefaultOption());
  const [packsValue, setPacksValue] = useState("");
  const [eachesValue, setEachesValue] = useState("");
  const [packsPercentageBool, setPacksPercentageBool] = useState(false);
  const [eachesPercentageBool, setEachesPercentageBool] = useState(false);

  const classes = useStyles();
  const { t } = useTranslation();

  useEffect(() => {
    if (!availableFields.includes(selectedOption)) {
      setSelectedOption(getDefaultOption());
    }
  }, [availableFields]);

  const resetEditValues = () => {
    setPacksValue("");
    setEachesValue("");
    setPacksPercentageBool(false);
    setEachesPercentageBool(false);
  };

  const handleRadioChange = (value) => {
    setSelectedOption(value);
    resetEditValues();
  };

  const handleValueChange = (event, type) => {
    const value = event.target.value;

    if (value < 0) {
      displaySnackMessages(
        t("inventorysmart.obValueCannotBeNegative"),
        "warning",
        props
      );
      return;
    }

    const isPercentage =
      type === "packs" ? packsPercentageBool : eachesPercentageBool;
    const setValue = type === "packs" ? setPacksValue : setEachesValue;
    const limits = props.setAllLimits || {};

    if (props.allowIncrease) {
      const maxValue = isPercentage
        ? type === "packs"
          ? limits.maxPackPct
          : limits.maxEachesPct
        : type === "packs"
        ? limits.maxPack
        : limits.maxEaches;

      if (
        maxValue !== null &&
        maxValue !== undefined &&
        Number(value) > maxValue
      ) {
        displaySnackMessages(
          t("inventorysmart.obInputCappedToMaxLimit"),
          "warning",
          props,
          true
        );
        setValue(maxValue);
      } else {
        setValue(value);
      }
      return;
    }

    // Decrease-only flow (config disabled)
    const minValue = type === "packs" ? limits.minPack : limits.minEaches;
    const valueType = type === "packs" ? "pack" : "eaches";
    if (isPercentage && value > 100) {
      displaySnackMessages(
        t("inventorysmart.obPercentageMoreThan100"),
        "warning",
        props
      );
      setValue("");
    } else if (!isPercentage && minValue !== null && minValue !== undefined && value > minValue) {
      displaySnackMessages(
        t("inventorysmart.obValueGreaterThanMinimum", { type: valueType }),
        "warning",
        props
      );
      setValue(minValue);
    } else {
      setValue(value);
    }
  };

  const handleChangePacksValue = (event) => {
    handleValueChange(event, "packs");
  };

  const handleChangeEachesValue = (event) => {
    handleValueChange(event, "eaches");
  };

  const handlePacksPercentageToggle = (event) => {
    if (packsValue) {
      setPacksValue("");
    }
    setPacksPercentageBool(event.target.checked);
  };

  const handleEachesPercentageToggle = (event) => {
    if (eachesValue) {
      setEachesValue("");
    }
    setEachesPercentageBool(event.target.checked);
  };

  const handleApplySetAll = () => {
    const setAllData = {
      type: selectedOption,
      value: selectedOption === "packs" ? packsValue : eachesValue,
      isPercentage:
        selectedOption === "packs" ? packsPercentageBool : eachesPercentageBool,
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
    if (selectedOption === "packs") {
      return packsValue === "";
    } else {
      return eachesValue === "";
    }
  };

  return (
    <>
      <Panel
        onClose={props.closeSetAllModal}
        onPrimaryButtonClick={() => handleApplySetAll()}
        onSecondaryButtonClick={() => handleCancelSetAll()}
        primaryButtonLabel="Apply"
        primaryButtonProps={{
          disabled: isApplyDisabled(),
        }}
        secondaryButtonLabel="Cancel"
        size="large"
        title="Set All"
        open={props.showSetAllModal}
        anchor={"right"}
      >
        <div>
          <div className={classes.contentBody}>
            <span>
              <VectorIcon />
            </span>
            <span className={classes.contentBodyText}>
              {availableFields.length > 1
                ? t(
                    props.allowIncrease
                      ? "inventorysmart.obSetAllUpdateInfoMulti"
                      : "inventorysmart.obSetAllReduceInfoMulti"
                  )
                : t(
                    props.allowIncrease
                      ? "inventorysmart.obSetAllUpdateInfoSingle"
                      : "inventorysmart.obSetAllReduceInfoSingle"
                  )}
              {props.productDetailsTableHeader
                ? props.productDetailsTableHeader
                : "Style Color"}
            </span>
          </div>
          <div>
            <div className={classes.sectionTitle}>Set Allocated Qty</div>
            {availableFields.length > 1 && (
                <div className={classes.chipsContainer}>
                  <Chips
                    label="Packs"
                    type="single"
                    isActive={selectedOption === "packs"}
                    onClick={() => handleRadioChange("packs")}
                  />
                  <Chips
                    label="Eaches"
                    type="single"
                    isActive={selectedOption === "eaches"}
                    onClick={() => handleRadioChange("eaches")}
                  />
                </div>
              )}
            {availableFields.length > 1 && (
              <div className={classes.inputLabel}>
                {selectedOption === "packs" ? "Packs" : "Eaches"}
              </div>
            )}
            <div className={classes.inputSection}>
              <Input
                onChange={
                  selectedOption === "packs"
                    ? (e) => handleChangePacksValue(e)
                    : (e) => handleChangeEachesValue(e)
                }
                placeholder="Enter Text"
                type="number"
                value={selectedOption === "packs" ? packsValue : eachesValue}
              />
              <Switch
                value={
                  selectedOption === "packs"
                    ? packsPercentageBool
                    : eachesPercentageBool
                }
                onChange={
                  selectedOption === "packs"
                    ? (e) => handlePacksPercentageToggle(e)
                    : (e) => handleEachesPercentageToggle(e)
                }
                rightLabel="%"
              />
            </div>
          </div>
        </div>
      </Panel>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    productDetailsTableHeader:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig
        ?.ProductDetailsTableHeader
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (data) => dispatch(addSnack(data)),
});

export default connect(mapStateToProps, mapDispatchToProps)(NewOrderBatchingSummarySetAll);
