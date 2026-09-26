import { useEffect, useState } from "react";

import FilterGroup from "core/commonComponents/filters/filterGroup";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import { fetchFilterOptions } from "modules/ada/utils-ada/utilityFunctions";
import CustomFilter from "./custom-filter";
import { useDispatch, useSelector } from "react-redux";
import {
  setFilters,
  setLoaderCount,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";

const Filters = (props) => {
  const {
    filters,
    dimension,
    resetFilter,
    staticFilters,
    heading,
    isMandatory,
    resetDate,
  } = props;
  const dispatch = useDispatch();

  const [filterData, setFilterData] = useState([]);

  useEffect(() => {
    if (!filters || !dimension) return;
    getFilterOptions();
  }, [filters]);

  const getFilterOptions = async (selected) => {
    try {
      dispatch(setLoaderCount(1));

      const response = await fetchFilterOptions(filters || [], selected);

      setFilterData(response);

      return response;
    } catch (error) {
      // errorHandler(dispatch, error);
    } finally {
      dispatch(setLoaderCount(-1));
    }
  };

  const update = async (selected) => {
    await getFilterOptions(selected);

    dispatch(setFilters({ key: dimension, value: selected }));
  };

  return (
    <CustomAccordion label={heading} isMandatory={isMandatory}>
      <FilterGroup
        filters={filterData}
        update={update}
        resetFilter={resetFilter}
        customFilter
        screen="ada"
        doNotUpdateDefaultValue
        customComponent={
          <CustomFilter
            staticFilters={staticFilters}
            isGroup={!dimension}
            resetDate={resetDate}
          />
        }
      />
    </CustomAccordion>
  );
};

export default Filters;
