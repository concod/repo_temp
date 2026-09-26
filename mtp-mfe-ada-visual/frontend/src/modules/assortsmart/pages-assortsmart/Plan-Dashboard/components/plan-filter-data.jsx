import { useEffect, useState } from "react";
import Form from "../../../../../core/Utils/form";
import { common } from "modules/assortsmart/constants-assortsmart/stringContants";

const PlanFilterData = (props) => {
  const [planCreateAttributes, setplanCreateAttributes] = useState([]);
  const [sellingPeriodAttributes, setsellingPeriodAttributes] = useState([]);

  useEffect(() => {
    if (props.planAttributes?.length) {
      let defaultValues = getDefaultConfigValues();
      let createConfig = props.planAttributes.filter((attr) => {
        return (
          attr.attribute_type === "create_plan" ||
          attr.attribute_type === "copy_plan" ||
          attr.attribute_type === "edit_plan"
        );
      });
      if (defaultValues["reference_period"] === "Compare Year") {
        createConfig = props.planAttributes.filter((item) => {
          return (
            item.accessor !== "compare_year_value" &&
            item.accessor !== "compare_season_value"
          );
        });
      } else if (defaultValues["reference_period"] === "Compare Season") {
        createConfig = props.planAttributes.filter((item) => {
          return (
            item.accessor !== "year_comparision_metric" &&
            item.accessor !== "compare_year"
          );
        });
      }
      setplanCreateAttributes(createConfig);
      setsellingPeriodAttributes([
        ...props.planAttributes.filter((attr) => {
          return attr.attribute_type === "selling_period";
        }),
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planAttributes]);

  const getDefaultConfigValues = () => {
    let defaultValues = {};
    props.planAttributes.forEach((item) => {
      if (props.selectedData[item.accessor]) {
        defaultValues[item.accessor] = props.selectedData[item.accessor];
      } else {
        if (
          item.accessor === "year_comparision_metric" ||
          item.accessor === "compare_year"
        ) {
          defaultValues[item.accessor] = common.__compare_yr_constants[0];
        } else if (item.accessor === "assort_selling_period_value") {
          defaultValues[item.accessor] = [null, null];
        } else if (item.accessor === "reference_data") {
          defaultValues[item.accessor] = common.__reference_data_constants[0];
        } else if (item.accessor === "reference_period") {
          defaultValues[item.accessor] = common.__reference_period_constants[0];
        } else if (item.accessor.includes("weightage")) {
          defaultValues[item.accessor] = props.selectedData[item.accessor];
        } else {
          defaultValues[item.accessor] = "";
        }
      }
    });
    return defaultValues;
  };

  const getDefaultValues = () => {
    let defaultValues = getDefaultConfigValues();
    return defaultValues;
  };

  const handleCreatePlanAttrChange = (updatedData, id) => {
    props.handleChange({ ...props.selectedData, ...updatedData }, id);
  };

  return (
    <>
      {props.planAttributes.length > 0 && (
        <Form
          layout={"vertical"}
          maxFieldsInRow={4}
          handleChange={handleCreatePlanAttrChange}
          fields={planCreateAttributes}
          updateDefaultValue={false}
          defaultValues={props.defaultValues || getDefaultValues()}
          handleDropdownClose={true}
          sizeOfFieldsInRow={2.4}
          renderForm={props.renderForm}
        />
      )}
    </>
  );
};

export default PlanFilterData;
