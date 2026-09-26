import React, { useEffect, useState } from "react";
import { makeStyles } from "@mui/styles";
import ProductSuppression from "assets/chatbot/ProductSuppression.svg";
import Reporting from "assets/chatbot/Reporting.svg";
import Constraints from "assets/chatbot/Constraints.svg";
import Grouping from "assets/chatbot/Grouping.svg";
import ProductSuppressionSelected from "assets/chatbot/ProductSuppressionSelected.svg";
import ReportingSelected from "assets/chatbot/ReportingSelected.svg";
import ConstraintsSelected from "assets/chatbot/ConstraintsSelected.svg";
import GroupingSelected from "assets/chatbot/GroupingSelected.svg";
import { pxToRem } from "core/Utils/functions/utils";
import { fetchScreensForModule } from "./smartBotservices";
import { isEmpty, isNil } from "lodash";
import { Loader } from "./impact-ui-components/Loader";


const useStyles = makeStyles((theme) => ({
  card: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    background: theme.palette.common.white,
    marginLeft: "0.4rem",
  },
  option: {
    flex: "1 1 calc(50% - 0.5rem)",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem",
    cursor: "pointer",
    background: theme.palette.common.white,
    height: pxToRem(32),
  },
  icon: {
    width: "2rem",
    height: "2rem",
  },
  text: {
    fontSize: "0.7rem",
    fontWeight: 300,
    color: theme.palette.text.primary,
  },
  noModulesStyle: {
    display: "flex",
    justifyContent: "center",
    fontWeight: 500,
  }
}));

const SelectedModule = ({ onSelect, selectedModule, currentMode }) => {
  const classes = useStyles();
  const [selectedOption, setSelectedOption] = useState(null);
  const [applicationCode, setApplicationCode] = useState(1);
  const [modules, setModules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const getAllModulesForScreen = async () => {
    try {
      setIsLoading(true);
      const response = await fetchScreensForModule(currentMode)
      const allScreens = response?.data?.data?.screen_name;
      let modulesData = []
      allScreens?.forEach((screen) => {
        modulesData.push({
          name: screen.screen_name,
          icon: ProductSuppression,
          selectedIcon: ProductSuppressionSelected,
        })
        if(isEmpty(applicationCode)) {
          setApplicationCode(screen.application_code)
        }
      })
      setModules(modulesData);
      localStorage.setItem("currentModulesData", JSON.stringify(modulesData))
      setIsLoading(false);
    }
    catch (error) {
      console.error("getAllModulesForScreen error", error);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let modulesData = JSON.parse(localStorage.getItem("currentModulesData"));
    if (!isEmpty(modulesData)) {
      modulesData.forEach((module) => {
        module.icon = ProductSuppression;
        module.selectedIcon = ProductSuppressionSelected
      })
      setModules(modulesData)
    }
    else {
      getAllModulesForScreen()
    }
  }, [])

  const handleClick = (option) => {
    localStorage.setItem("currentModuleName", option);
    setSelectedOption(option);
    onSelect(option, applicationCode);
  };

  return (
    <>
      {isLoading ? (
        <Loader />
      ) : !isEmpty(modules) ? (
        <div className={classes.card}>
          {modules?.map((module) => (
            <div
              key={module.name}
              className={classes.option}
              onClick={() => handleClick(module.name)}
            >
              {selectedModule === module.name ? (
                <module.selectedIcon className={classes.icon} />
              ) : (
                <module.icon className={classes.icon} />
              )}
              <span className={classes.text}>{module.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className={classes.noModulesStyle}>No modules to show</p>
      )}
    </>
  );
};

export default SelectedModule;
