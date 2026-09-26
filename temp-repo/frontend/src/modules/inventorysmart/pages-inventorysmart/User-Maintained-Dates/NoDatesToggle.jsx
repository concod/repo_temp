import { Button, Switch } from "@mui/material";
import Select from "core/Utils/select";
import { useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";

const NoDatesToggle = (props) => {
  const {
    handleToggleSwitch,
    downloadReport,
    toggleActive,
    setToggleActive,
    selectedOptions,
    setSelectedOptions,
    dateOptions,
  } = props;

  const getDefaultValues = (value) => {
    return {
      clearance_date: value,
      markdown_date: value,
      launch_date: value,
    };
  };

  const transformToObject = (inputArray) => {
    const outputObject = {
      no_date_filter: getDefaultValues(false),
    };

    // Iterate through the input array
    inputArray.forEach((item) => {
      outputObject.no_date_filter[item.value] = true;
    });

    return outputObject;
  };

  const handleSwitchChange = async (e, val) => {
    setToggleActive(val);
    setSelectedOptions(dateOptions);
    val
      ? handleToggleSwitch({
          no_date_filter: getDefaultValues(true),
        })
      : handleToggleSwitch({
          no_date_filter: getDefaultValues(false),
        });
  };

  const handleSelect = (value) => {
    const filterObject = transformToObject(value);
    setSelectedOptions(value);
    handleToggleSwitch(filterObject);
  };

  return (
    <div className="toggle-parent-wrapper">
      <div>
        Show No Dates
        <Switch onChange={handleSwitchChange} checked={toggleActive} />
      </div>
      <div className={`${!toggleActive ? "disabled" : ""}`}>
        <Select
          valueStyles={{
            width: "200px",
          }}
          options={dateOptions}
          value={selectedOptions}
          onChange={(value) => handleSelect(value)}
          isSearchable={false}
          isMulti={true}
          disabled={!toggleActive}
        />
      </div>
      <div>
        <Button
          variant="outlined"
          onClick={downloadReport}
          startIcon={<DownloadIcon />}
        >
          Download
        </Button>
      </div>
    </div>
  );
};
export default NoDatesToggle;
