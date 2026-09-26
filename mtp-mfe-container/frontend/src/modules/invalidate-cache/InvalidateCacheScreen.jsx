import { useState } from "react";
import { INVALIDATE_CACHE } from "config/api";
import axiosInstance from "core/Utils/axios";
import { addSnack } from "core/actions/snackbarActions";
import { Button, Typography } from "@mui/material";
import SelectContainer from "core/commonComponents/filters/SelectContainer";
import { CacheScreenStyling } from "./InvalidateCachingStyling";
import { useDispatch } from "react-redux";

const InvalidateCache = () => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [dependency, setDependency] = useState([]);
  const dispatch = useDispatch();

  const options = [
    { label: "Table configurations", value: "TABLE_CONFIGURATION" },
    { label: "Filter configurations", value: "FC" },
    { label: "Tenant configurations", value: "TT" },
    { label: "User access", value: "UAHM" },
    { label: "InventorySmartAPI", value: "api_cache" },
    {
      label: "User module hierarchy",
      value: "USER_MANAGEMENT_MODULE_HIERARCHY",
    },
  ];

  // Handle selection change to update selected options
  const handleSelectChange = (newSelectedOptions) => {
    setSelectedOptions(newSelectedOptions);
  };

  // Update dependency function to track dropdown changes
  const updateDependency = (newDependency) => {
    setDependency(newDependency);
  };

  const displaySnackMessages = (message, variance) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
        },
      })
    );
  };

  // Handle invalidate button click
  const handleInvalidate = async () => {
    const finalArray = dependency?.check_configuration.reduce((acc, config) => {
      // If unCheckAll is encountered, clear all selections
      if (config.unCheckAll) {
        return [];
      }
      // If checkAll is encountered, set selection to all available options
      if (config.checkAll) {
        return options.map((option) => option.value);
      }
      // Remove items specified in unCheckedRows
      if (config.unCheckedRows) {
        return acc.filter((item) => !config.unCheckedRows.includes(item));
      }
      // Add items specified in checkedRows
      if (config.checkedRows) {
        return [...new Set([...acc, ...config.checkedRows])];
      }
      return acc;
    }, []);

    // Special handling: if "TT" is present, replace it with ["TC", "TAM"]
    let finalPayload = [...finalArray];
    if (finalPayload.includes("TT")) {
      finalPayload = finalPayload.flatMap((item) =>
        item === "TT" ? ["TC", "TAM"] : item
      );
    }
    try {
      await axiosInstance({
        url: INVALIDATE_CACHE,
        method: "POST",
        data: { identifiers: finalPayload },
      });
      displaySnackMessages("Cache invalidation successful", "success");
    } catch (error) {
      console.error("Cache invalidation failed:", error);
      displaySnackMessages(
        "Failed to invalidate cache. Please try again.",
        "error"
      );
    }
  };
  const classes = CacheScreenStyling();
  return (
    <div className={classes.container}>
      <Typography className={classes.title}>Invalidate Cache</Typography>
      <label htmlFor="raised-button-file" className={classes.text}>
        Please choose parameter(s) to invalidate:
      </label>
      <SelectContainer
        label=""
        filter_keyword=""
        initialData={options}
        updateDependency={updateDependency}
        selectedOptions={selectedOptions}
        onChange={handleSelectChange}
        is_multiple_selection={true}
        customClass=""
        isClearable={true}
        isMandatory={true}
        customPlaceholder="Select the parameter"
      />
      <Button
        variant="contained"
        color="primary"
        id="saveFilterBtn"
        onClick={handleInvalidate}
      >
        Invalidate
      </Button>
    </div>
  );
};

export default InvalidateCache;
