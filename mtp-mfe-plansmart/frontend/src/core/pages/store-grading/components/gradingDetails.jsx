import React, { useEffect, useState } from "react";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import globalStyles from "core/Styles/globalStyles";
import Form from "core/Utils/form";
import {
  fetchBasicDetialsAttributes,
  fetchAttributes,
  fetchHierarchies,
} from "../grading-services";
import { GRADE_SETTINGS_INPUT } from "../grading-constants/stringConstants"
import { setCreateGradeStep, setGradingDetails } from "../grading-services";
import { useDispatch, useSelector } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import Loader from "core/Utils/Loader/loader";
import { Button } from "@mui/material";

const GradingDetails = (props) => {
  const globalClasses = globalStyles();
  const [basicDetailsAttr, setBasicDetailsAttr] = useState([]);
  const [levelOfGradeAttr, setLevelOfGradeAttr] = useState([]);
  const [gradeSettingsAttr, setGradeSettingsAttr] = useState([]);
  const [showloader, setLoader] = useState(false);
  const [defaultFormValues ,setDefaultFormValues] = useState({});
  const dispatch = useDispatch();
  const { classification, createGradeStep } = useSelector(
    (store) => store?.createGradeReducer
  );

  useEffect(() => {
    setLoader(true);
    getInitialData();
  }, []);

  /**
   * @func
   * @desc Update form attributes onLoad
   */
  const getInitialData = async () => {
    try {
      const basicDetails = await fetchBasicDetialsAttributes(
        "grade basic details"
      );
      const levelOfGrades = await fetchBasicDetialsAttributes("grade levels");
      const gradeSettingsData = GRADE_SETTINGS_INPUT;
      await fetchFormAttributes(basicDetails.data.data);
      await fetchFormAttributes(levelOfGrades.data.data);
      setBasicDetailsAttr(basicDetails.data.data);
      setLevelOfGradeAttr(levelOfGrades.data.data);
      setGradeSettingsAttr(gradeSettingsData);
    } catch (error) {
    } finally {
      setLoader(false);
    }
  };

  /**
   * @func
   * @desc Fetch all options for dropdown
   * @param {Object} data
   */
  const fetchFormAttributes = async (data) => {
    const formElements = data.map(async (key) => {
      key.field_type =
      key.display_type === "range_picker" ? "rangePicker" : key.display_type;
      key.accessor = key.column_name;
      key.required = key.is_mandatory || key.is_required;
      if (key.display_type === "dropdown" || key.display_type === "list") {
        if (key.column_name === "grade_nomenclature") {
          const options = await fetchAttributes();
          key.options = options.data.data.map((item) => {
            return {
              value: item.nomenclature_id,
              label: item.nomenclature_name,
              id: item.nomenclature_id,
            };
          });
        } else {
          const options = await fetchHierarchies(key.column_name);
          key.options = options.data.data.map((item) => {
            return {
              value: item.value,
              label: item.name,
              id: item.value,
            };
          });
        }
      } else if (key.display_type === "range_picker" && !key.startYear) {
        // To be removed once added to config
        key.startYear = 1996;
      }
      return key;
    });
    await Promise.allSettled(formElements);
  };

  /**
   * @func
   * @desc Call create grade API before following to next steps
   */
  const createGrade = async () => {
    if(isValid(basicDetailsAttr) && isValid(levelOfGradeAttr)) {
      const timePeriod = defaultFormValues.time_period;
      const body = {
        name: defaultFormValues.grading_name,
        nomenclature_id: defaultFormValues.grade_nomenclature,
        store_level: "",
        product_level: "",
        grade_level: (defaultFormValues.number_of_grades - 0),
        special_classification: classification,
        config: {},
        valid_time_period: [{ start_date: timePeriod[0].format("YYYY-MM-DD"),end_date: timePeriod[1].format("YYYY-MM-DD")}],
        metrics: {}
      }

      dispatch(setGradingDetails(body));
      dispatch(setCreateGradeStep(createGradeStep + 1));
    } else {
      dispatch(addSnack({
        message: "Please enter requrired fields.",
        options: {
          variant: "error",
        },
      }));
    }
  };

  const isValid = (formData) => {
    let isValid = true;
    formData.forEach(element => {
      if(element.required && !Boolean(defaultFormValues[element.accessor])) {
        isValid = false;
        return;
      }
    });
    return isValid;
  }

  const handleGradeDetailsChange = (updates) => {
    const newFormValues = { ...defaultFormValues, ...updates};
    setDefaultFormValues(newFormValues);
  };

  return (
    <>
      <Loader loader={showloader}>
        <div className={globalClasses.marginBottom}>
          <CustomAccordion label="Basic Details">
            <Form
              layout={"vertical"}
              maxFieldsInRow={4}
              handleChange={handleGradeDetailsChange}
              fields={basicDetailsAttr}
              updateDefaultValue={false}
              defaultValues={defaultFormValues || {}}
            />
          </CustomAccordion>
        </div>
        <div className={globalClasses.marginBottom}>
          <CustomAccordion label="Level of grading">
            <Form
              layout={"vertical"}
              maxFieldsInRow={4}
              handleChange={handleGradeDetailsChange}
              fields={levelOfGradeAttr}
              updateDefaultValue={false}
              defaultValues={defaultFormValues || {}}
            />
          </CustomAccordion>
        </div>
        <div className={globalClasses.marginBottom}>
          <CustomAccordion label="Grade Settings">
            <Form
              layout={"vertical"}
              maxFieldsInRow={1}
              handleChange={handleGradeDetailsChange}
              fields={gradeSettingsAttr}
              updateDefaultValue={false}
              defaultValues={defaultFormValues || {}}
            />
          </CustomAccordion>
        </div>
      </Loader>
      <Button color="primary" variant="contained" onClick={createGrade}>
        Next
      </Button>
    </>
  );
};

export default GradingDetails;
