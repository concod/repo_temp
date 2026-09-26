import React, { useState, useEffect } from "react";
import { useExceptionStyles } from "../../../Exceptions-stores/exceptionStyles";
import InfoIcon from "@mui/icons-material/Info";
import CloseIcon from "@mui/icons-material/Close";
import { Input, useTranslation } from "impact-ui-v3";
import { isEmpty, cloneDeep } from "lodash";
import Form from "core/Utils/form";
import Loader from "core/Utils/Loader/loader";
import { displaySnackMessages } from "../../../inventorysmart-utility";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const XUnitsPerSizeSection = (props) => {
  const { t } = useTranslation();
  const [showInfoMessage, setShowInfoMessage] = useState(true);
  const [units, setUnits] = useState(null);
  const [formFields, setFormFields] = useState([]);
  const [formData, setFormData] = useState({
    size: cloneDeep(props.sizeSelectionData) || {},
  });
  const [unitsFieldHelperText, setUnitsFieldHelperText] = useState(
    t("inventorysmart.rclEnterUnitsPerSize")
  );
  const [updateCheckBoxesOnLoad, setUpdateCheckBoxesOnLoad] = useState(false);

  const useStyles = useExceptionStyles();

  useEffect(() => {
    if (!isEmpty(props.sizeList) && isEmpty(formFields)) {
      let field = {
        accessor: "size",
        label: t("inventorysmart.rclSelectSizesToApplyMin"),
        column_name: "size",
        field_type: "checkBoxGroup",
      };
      let options = [];
      props.sizeList.forEach((size) => {
        options.push({
          label: replaceSpecialCharacter(size),
          value: size,
          isDisabled: false,
        });
      });
      field.options = options;
      setFormFields([field]);
    }
  }, [props.sizeList]);

  useEffect(() => {
    if (formFields && !isEmpty(formFields) && units > 0) {
      setUpdateCheckBoxesOnLoad(true);
    }
  }, [formFields, units]);

  useEffect(() => {
    if (updateCheckBoxesOnLoad) {
      let selectedSizesCount =
        Object.keys(props.sizeSelectionData)?.filter(
          (size) => props.sizeSelectionData[size] > 0
        )?.length || 0;
      let allowedSizes = Math.floor(props.minValue / units);
      if (allowedSizes <= selectedSizesCount) {
        updateCheckBoxes(true);
      } else {
        updateCheckBoxes(false);
      }
    }
  }, [updateCheckBoxesOnLoad]);

  useEffect(() => {
    if (units && props.minValue) {
      if (Number(props.minValue) < Number(units)) {
        setUnits(props.minValue);
        displaySnackMessages(
          t("inventorysmart.rclUnitsGreaterThanMin"),
          "warning",
          props,
          true
        );
      } else {
        let selectedSizesCount =
          Object.keys(props.sizeSelectionData)?.filter(
            (size) => props.sizeSelectionData[size] > 0
          )?.length || 0;
        if (units > props.minValue / selectedSizesCount) {
          props.resetSizeSelectionData();
          setFormData({});
        }
        //If minValue is 100 and 50 units are to be distributed then it can be distributed among only 2 sizes. in this case disabling the size selection.
        let allowedSizes = Math.floor(props.minValue / units);
        if (allowedSizes <= selectedSizesCount) {
          updateCheckBoxes(true);
        } else {
          updateCheckBoxes(false);
        }
        if (selectedSizesCount > 0) {
          props.setEnableCalculateSizeDistribution(true);
        } else {
          props.setEnableCalculateSizeDistribution(false);
        }
      }
    }
    if (props.sizeSelectionData) {
      let sizeSelected = Object.entries(props.sizeSelectionData).some(
        ([key, value]) => value > 0
      );
      if (sizeSelected && units > 0) {
        props.setEnableCalculateSizeDistribution(true);
      } else {
        props.setEnableCalculateSizeDistribution(false);
      }
    } else {
      props.setEnableCalculateSizeDistribution(false);
    }
  }, [units, props.sizeSelectionData, props.minValue]);

  useEffect(() => {
    if (units && !isEmpty(formData)) {
      let dataObj = cloneDeep(formData);
      let sizeData = cloneDeep(props.sizeSelectionData);
      Object.keys(dataObj["size"])?.forEach((item) => {
        if (dataObj["size"][item]) {
          sizeData[item] = units ? units : 1;
        } else {
          sizeData[item] = 0;
        }
      });
      props.setSizeSelectionData(sizeData);
    }
  }, [units]);

  useEffect(() => {
    if (!isEmpty(props.sizeSelectionData) && !units) {
      let value = Object.values(props.sizeSelectionData)?.filter(
        (value) => value > 0
      )[0];
      setUnits(value); // update units on modal reopen
    }
  }, [props.sizeSelectionData]);

  const updateCheckBoxes = (disable) => {
    if (isEmpty(formFields)) return;
    let fields = cloneDeep(formFields);
    let options = fields[0]?.options;
    if (disable) {
      let selectedSizesList = Object.keys(props.sizeSelectionData)?.filter(
        (size) => props.sizeSelectionData[size] > 0
      );
      options = options.map((option) => {
        if (!selectedSizesList.includes(option.value)) {
          option.isDisabled = true;
        }
        return option;
      });
    } else {
      options = options.map((option) => {
        option.isDisabled = false;
        return option;
      });
    }
    fields[0].options = options;
    setFormFields(fields);
  };

  const handleUnitsBlur = (e) => {
    let value = Number(e.target.value);
    if (value < 1) {
      setUnits(1);
    } else if (value > props.minValue) {
      setUnits(props.minValue);
      displaySnackMessages(
        t("inventorysmart.rclUnitsGreaterThanMin"),
        "warning",
        props,
        true
      );
    } else {
      setUnits(value);
    }
    let selectedSizesCount = props.sizeSelectionData
      ? Object.values(props.sizeSelectionData).filter((value) => value > 0)
          .length
      : 0;
    if (value > props.minValue / selectedSizesCount) {
      props.resetSizeSelectionData();
      setFormData({});
    }
    if (value > 0) {
      let maxSizes = Math.floor(props.minValue / value);
      if (maxSizes > props.sizeList?.length) {
        maxSizes = props.sizeList.length;
      }
      setUnitsFieldHelperText(
        t("inventorysmart.rclMaxSizesSelectable", { count: maxSizes })
      );
    } else {
      setUnitsFieldHelperText(t("inventorysmart.rclEnterUnitsPerSize"));
    }
  };

  const handleChange = (
    obj,
    id,
    field,
    e,
    initialValue,
    checkConfiguration
  ) => {
    setFormData(obj);
    let dataObj = cloneDeep(obj);
    let sizeData = cloneDeep(props.sizeSelectionData);
    Object.keys(dataObj["size"]).forEach((item) => {
      if (dataObj["size"][item]) {
        sizeData[item] = units ? units : 1;
      } else {
        sizeData[item] = 0;
      }
    });
    props.setSizeSelectionData(sizeData);
  };

  return (
    <div className={useStyles.unitsPerSizeSection}>
      {showInfoMessage && (
        <div className={useStyles.infoMessage}>
          <div className="info-message-text">
            <InfoIcon fontSize="small" />
            <p>{t("inventorysmart.rclUnitsDistributedInfo")}</p>
          </div>
          <CloseIcon
            className="close-icon"
            onClick={() => {
              setShowInfoMessage(false);
            }}
          />
        </div>
      )}
      <div>
        <Input
          type="number"
          value={units}
          helperText={unitsFieldHelperText}
          isHelperText={true}
          onChange={(e) => setUnits(e.target.value)}
          inputProps={{
            min: 1,
          }}
          onBlur={handleUnitsBlur}
          label={t("inventorysmart.rclUnitsLabel")}
        />
      </div>
      <Loader loader={props.distributionStrategyLoader}>
        <div className="form-container">
          <p>{t("inventorysmart.rclSelectSizesToApplyMin")}</p>
          <Form
            handleChange={handleChange}
            fields={formFields}
            id="size-selection"
            defaultValues={formData}
          />
        </div>
      </Loader>
    </div>
  );
};

const mapActionToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
  };
};

export default connect(null, mapActionToProps)(XUnitsPerSizeSection);
