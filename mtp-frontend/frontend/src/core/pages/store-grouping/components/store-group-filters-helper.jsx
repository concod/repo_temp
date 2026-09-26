import PropTypes from "prop-types";
import FilterGroup from "core/commonComponents/filters/filterGroup";
import { useEffect, useState } from "react";
import { Typography } from "@mui/material";
const StoreGroupFiltersHelper = (props) => {
  const [filtersArray, setfiltersArray] = useState([]);
  const updateData = (dependency) => {
    props.updateData(dependency, props.dimension);
  };
  const onFilter = () => {
    if (!props.customFilter) {
      props.onFilter();
    }
  };
  const onReset = () => {
    props.onReset();
  };

  useEffect(() => {
    setfiltersArray(
      props.filterArray.filter((filter) => filter.dimension === props.dimension)
    );
  }, [props.filterArray]);

  useEffect(() => {
    return () => {
      if (props.dimension === "product") {
        props.onReset();
      }
    };
  }, []);

  return (
    <>
      {filtersArray.length > 0 ? (
        <FilterGroup
          inititalSelection={props.defaultFilterSelection}
          filters={filtersArray}
          screen={props.screenName}
          update={updateData}
          onFilter={onFilter}
          onReset={onReset}
          customFilter={props.customFilter}
          resetFilter={props.resetFilter}
          doNotUpdateDefaultValue={props.doNotUpdateDefaultValue}
        />
      ) : (
        <Typography variant="h5">No Filters are added yet</Typography>
      )}
    </>
  );
};

StoreGroupFiltersHelper.propTypes = {
  dimension: PropTypes.string,
};

export default StoreGroupFiltersHelper;
