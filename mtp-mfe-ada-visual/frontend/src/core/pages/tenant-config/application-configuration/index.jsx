import { useState } from "react";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import makeStyles from "@mui/styles/makeStyles";
import FilterConfig from "../../filters";
import GenericApplicationConfiguration from "../generic-application-config/components/generic-application-configuration";
const useStyles = makeStyles((theme) => ({
  styleSelection: {
    width: "100%",
    justifyContent: "center",
    "& .MuiToggleButton-label": {
      textTransform: "none",
    },
  },
}));

const ApplicationConfiguration = (props) => {
  const classes = useStyles();
  const [configurationTab, setConfigurationTab] = useState(
    "filter_configuration"
  );

  const handleConfiguration = (event, newSelection) => {
    if (newSelection !== null) {
      setConfigurationTab(newSelection);
    }
  };
  return (
    <div>
      <ToggleButtonGroup
        value={configurationTab}
        exclusive
        className={classes.styleSelection}
        onChange={handleConfiguration}
        aria-label="text alignment"
      >
        <ToggleButton value="filter_configuration" aria-label="left aligned">
          Filter Configuration
        </ToggleButton>
        <ToggleButton value="plan_configuration" aria-label="centered">
          Plan Configuration
        </ToggleButton>
        <ToggleButton value="assort_configuration" aria-label="centered">
          Assort
        </ToggleButton>
      </ToggleButtonGroup>

      {configurationTab === "filter_configuration" && (
        <FilterConfig></FilterConfig>
      )}

      {configurationTab === "plan_configuration" && (
        <GenericApplicationConfiguration></GenericApplicationConfiguration>
      )}
    </div>
  );
};

export default ApplicationConfiguration;
