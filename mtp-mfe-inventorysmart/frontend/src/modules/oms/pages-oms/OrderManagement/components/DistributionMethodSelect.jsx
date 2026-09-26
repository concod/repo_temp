import React, { useEffect, useMemo, useState } from "react";
import { Select } from "impact-ui-v3";
import { useDispatch, useSelector } from "react-redux";
import {
  selectOrderManagementView,
  setDistributionMethod,
} from "../slices/orderManagementView.slice.js";
import { selectDistributionMethodOptions } from "../slices/orderManagementView.selectors.js";

const toSelectOption = (distributionOption) => ({
  label: distributionOption.label,
  value: distributionOption.value,
});

const DistributionMethodSelect = () => {
  const dispatch = useDispatch();
  const { distributionMethod } = useSelector(selectOrderManagementView);
  const configuredOptions = useSelector(selectDistributionMethodOptions);

  const distributionOptions = useMemo(() => {
    return (configuredOptions || []).map(toSelectOption);
  }, [configuredOptions]);

  const [currentOptions, setCurrentOptions] = useState(distributionOptions);
  const [isOpen, setIsOpen] = useState(false);
  const [isSelectAll, setIsSelectAll] = useState(false);

  useEffect(() => {
    setCurrentOptions(distributionOptions);
  }, [distributionOptions]);

  useEffect(() => {
    if (distributionMethod || distributionOptions.length === 0) return;
    dispatch(setDistributionMethod(distributionOptions[0].value));
  }, [dispatch, distributionMethod, distributionOptions]);

  const selectedOptions = useMemo(() => {
    const match = distributionOptions.find(
      (option) => option.value === distributionMethod
    );
    return match || distributionOptions[0] || {};
  }, [distributionMethod, distributionOptions]);

  if (distributionOptions.length === 0) return null;

  const handleChange = (nextSelected) => {
    const nextOption = Array.isArray(nextSelected)
      ? nextSelected[0]
      : nextSelected;
    if (!nextOption?.value) return;
    dispatch(setDistributionMethod(nextOption.value));
  };

  return (
    <Select
      id="oms-matrix-summary-distribution-method"
      label="Distribution Method"
      labelOrientation="left"
      isMulti={false}
      isClearable={false}
      isWithSearch={false}
      initialOptions={distributionOptions}
      currentOptions={currentOptions}
      setCurrentOptions={setCurrentOptions}
      selectedOptions={selectedOptions}
      setSelectedOptions={handleChange}
      handleChange={handleChange}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      isSelectAll={isSelectAll}
      setIsSelectAll={setIsSelectAll}
    />
  );
};

export default DistributionMethodSelect;
