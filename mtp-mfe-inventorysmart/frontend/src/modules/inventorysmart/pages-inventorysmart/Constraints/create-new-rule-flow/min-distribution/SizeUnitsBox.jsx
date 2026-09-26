import { useEffect, useState } from "react";
import { Input, Select } from "impact-ui-v3";
import ErrorIcon16 from "assets/errorIcon16.svg";
export const SizeUnitsBox = ({
  units,
  onUnitsChange,
  onUnitsBlur,
  unitsError,
  unitsHelperText,
  sizeOptions,
  selectedSizes,
  setSelectedSizes,
  onSizesChange,
  onSizesMenuClose,
  sizeSelectOpen,
  setSizeSelectOpen,
  isSelectAll,
  setIsSelectAll,
  sizesError,
  maxUnits,
  classes,
}) => {
  const [currentOptions, setCurrentOptions] = useState(sizeOptions);

  useEffect(() => {
    setCurrentOptions(sizeOptions);
  }, [sizeOptions]);

  const handleSearch = (searchTerm) => {
    const query = String(
      searchTerm?.target?.value ?? searchTerm ?? ""
    ).toLowerCase();
    if (!query.trim()) {
      setCurrentOptions(sizeOptions);
      return;
    }
    setCurrentOptions(
      (sizeOptions || [])
        .map((group) => ({
          ...group,
          options: (group.options || []).filter((option) =>
            String(option.label).toLowerCase().includes(query)
          ),
        }))
        .filter((group) => group.options.length)
    );
  };

  const handleSetIsOpen = (next) => {
    const wasOpen = sizeSelectOpen;
    const isOpen = typeof next === "function" ? next(wasOpen) : Boolean(next);
    setSizeSelectOpen(isOpen);
    if (wasOpen && !isOpen) {
      onSizesMenuClose?.();
    }
  };

  return (
    <div className={classes.sizeUnitsBox}>
      <p className={classes.unitsLabel}>
        Units:
        <span className={classes.required}>*</span>
      </p>
      <div className={classes.minInput}>
        <Input
          type="number"
          value={units ?? ""}
          onChange={onUnitsChange}
          onBlur={onUnitsBlur}
          isError={unitsError}
          helperText={unitsHelperText}
          isHelperText={Boolean(unitsError && unitsHelperText)}
          rightIcon={unitsError ? <ErrorIcon16 /> : undefined}
          inputProps={{ min: 0}}
        />
      </div>
      <p className={classes.sizeSelectLabel}>
        Select Sizes:
        <span className={classes.required}>*</span>
      </p>
      <div className={classes.sizeSelectControl}>
        <Select
          isMulti={true}
          isGrouped={true}
          isClearable={true}
          isWithSearch={true}
          onSearch={handleSearch}
          isCloseWhenClickOutside={true}
          withPortal={true}
          toggleSelectAll={true}
          isSelectAll={isSelectAll}
          setIsSelectAll={setIsSelectAll}
          labelOrientation="top"
          placeholder="Select"
          searchPlaceholder="Search Here..."
          dropDownPortalClassName={classes.sizeSelectDropdown}
          isOpen={sizeSelectOpen}
          setIsOpen={handleSetIsOpen}
          currentOptions={currentOptions}
          initialOptions={sizeOptions}
          selectedOptions={selectedSizes}
          setSelectedOptions={setSelectedSizes}
          setCurrentOptions={setCurrentOptions}
          handleChange={onSizesChange}
          isError={sizesError}
          width="100%"
          minWidth="160px"
        />
      </div>
    </div>
  );
};
