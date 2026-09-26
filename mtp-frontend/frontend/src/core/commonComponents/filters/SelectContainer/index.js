import { makeStyles } from "@mui/styles";
import classNames from "classnames";
import React from "react";
import globalStyles from "core/Styles/globalStyles";
import { replaceCharacter } from "core/Utils/formatter";
import { Select } from "../Select";

const SelectContainer = ({
  label,
  filter_keyword,
  initialData,
  updateDependency,
  selectedOptions,
  is_multiple_selection,
  type,
  customClass,
  isClearable = false,
  isMandatory = false,
  customPlaceholder,
  selectAllLabel,
}) => {
  const selectStyleClasses = useSelectStyles();
  const globalClasses = globalStyles();

  return (
    <div
      data-testid="filtertype"
      id={`${replaceCharacter(label?.toLowerCase(), / /g, "-")}-filterDropdown`}
      className={classNames(selectStyleClasses.selectContainer, customClass)}
      key={label}
    >
      {label && (
        <>
          <label className={globalClasses.label}>{label}</label>
          {isMandatory && (
            <span className={selectStyleClasses.mandatoryStyle}>*</span>
          )}
        </>
      )}
      <Select
        label={label}
        is_multiple_selection={is_multiple_selection}
        filter_keyword={filter_keyword}
        initialData={initialData}
        updateDependency={updateDependency}
        selectedOptions={selectedOptions}
        type={type}
        isClearable={isClearable}
        customPlaceholder={customPlaceholder}
        selectAllLabel={selectAllLabel}
      />
    </div>
  );
};

export default SelectContainer;

const styles = (theme) => ({
  selectContainer: {
    minWidth: "calc((30%/1.5) - 5px)",
    margin: "0.7rem",
  },
  mandatoryStyle: {
    position: "absolute",
    color: theme.palette.error.main,
  },
});

const useSelectStyles = makeStyles(styles);
