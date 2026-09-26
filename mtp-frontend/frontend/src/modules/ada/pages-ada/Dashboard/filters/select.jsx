import SelectContainer from "core/commonComponents/filters/SelectContainer";
import {
  setFilters,
  setComponentLoaderCount,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { errorHandler } from "core/Utils/functions/helpers//errorhandler-helpers";

const AdaSelect = ({
  label = "",
  reducerKey,
  isMulti = true,
  api = () => null,
  apiPayload,
  initialOptions = [],
  customClass = "",
  isClearable,
  customPlaceholder,
  isMandatory = false,
}) => {
  const selectedOptions = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer?.[reducerKey]
  );

  const [initialData, setInitialData] = useState([]);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!api && !initialOptions) return;
    const getInitialData = async () => {
      try {
        dispatch(setComponentLoaderCount(1));
        if (initialOptions.length) {
          setInitialData(initialOptions);
        } else {
          const response = await api(apiPayload);
          setInitialData(response);
        }
      } catch (error) {
        // errorHandler(dispatch, error);
      } finally {
        dispatch(setComponentLoaderCount(-1));
      }
    };
    getInitialData();
  }, [apiPayload]);

  const updateDependency = (_, value) => {
    dispatch(setFilters({ key: reducerKey, value: value }));
  };

  return (
    <SelectContainer
      label={label}
      filter_keyword={label}
      is_multiple_selection={isMulti}
      initialData={initialData || []}
      updateDependency={updateDependency}
      selectedOptions={selectedOptions}
      customClass={customClass}
      isClearable={isClearable}
      customPlaceholder={customPlaceholder}
      isMandatory={isMandatory}
    />
  );
};

export default AdaSelect;
