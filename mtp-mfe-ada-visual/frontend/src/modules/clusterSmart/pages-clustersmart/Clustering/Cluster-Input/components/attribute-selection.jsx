import React, { useEffect, useState } from "react";
import { StyledCheckbox } from "core/Utils/selection/selection";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import { ATTRIBUTES_CLUSTERING } from "modules/clusterSmart/constants-clustersmart/stringConstants";
import { isEcomPlan } from "modules/assortsmart/utils-assortsmart/utilityFunctions";

const AttributeSelection = (props) => {
  const [attributeOptions, setAttributeOptions] = useState([]);
  useEffect(() => {
    const attributesClusters = ATTRIBUTES_CLUSTERING?.filter((attr) => {
      return (
        (attr.value !== "performance" && isEcomPlan(props.planDetails?.data)) ||
        !isEcomPlan(props.planDetails?.data)
      );
    });
    setAttributeOptions(attributesClusters);
  }, [props.planDetails]);

    const handleChange = (event) => {
        props.onChange(event.target.value);
    }
  return (
    <FormControl id="assortClusterAttrCheckboxGrp" component="fieldset">
      <div>
        {attributeOptions?.map((attr) => {
          let isDefaultChecked = props.attributeSelection?.[attr.value]
            ? true
            : false;
          return (
            <FormControlLabel
              value={attr.value}
              control={
                <StyledCheckbox
                  color="primary"
                  checked={isDefaultChecked}
                  onChange={handleChange}
                />
              }
              label={attr.name}
            ></FormControlLabel>
          );
        })}
      </div>
    </FormControl>
  );
};

export default AttributeSelection;
