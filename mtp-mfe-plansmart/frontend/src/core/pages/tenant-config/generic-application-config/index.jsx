import React, { useEffect, useState } from "react";
import { ToggleButtonGroup, ToggleButton } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import FilterConfig from "../../filters";
import GenericApplicationConfiguration from "./components/generic-application-configuration";
import { connect } from "react-redux";
import { homePageActions } from "core/actions/homePageActions";
import { getApplicationMaster } from "../../../actions/tenantConfigActions";

const GenericAppConfig = (props) => {
  const globalClasses = globalStyles();
  const [configurationTab, setConfigurationTab] = useState(
    "filter_configuration"
  );
  const [tabList, setTabList] = useState([]);
  const [tenantTabConfig, setTenantTabConfig] = useState([]);
  const [applicationMasterData, setApplicationMasterData] = useState("");

  useEffect(async () => {
    let getAppList = await props.setUserApps();

    let getApplicationMasterData = await props.getApplicationMaster();
    if (getApplicationMasterData?.data?.status) {
      setApplicationMasterData(getApplicationMasterData?.data?.data);
    }
  }, []);

  useEffect(() => {
    if (applicationMasterData?.length) {
      setTenantTabConfig([
        {
          pageHeader: "PlanSmart WorkFlow ",
          appType: "PlanSmart",
          tabName: "PlanSmart Workflow",
          applicationCode: applicationMasterData.find((appData) => {
            if (appData.name === "PlanSmart") {
              return appData.application_code;
            }
          })?.application_code,
        },
        {
          pageHeader: "AssortSmart WorkFlow ",
          appType: "AssortSmart",
          tabName: "AssortSmart Workflow",
          applicationCode: applicationMasterData.find((appData) => {
            if (appData.name === "AssortSmart") {
              return appData.application_code;
            }
          })?.application_code,
        },
        {
          pageHeader: "InventorySmart WorkFlow ",
          appType: "InventorySmart",
          tabName: "InventorySmart Workflow",
          applicationCode: applicationMasterData.find((appData) => {
            if (appData.name === "InventorySmart") {
              return appData.application_code;
            }
          })?.application_code,
        },
      ]); //To do: Make this call fully dynamic
    }
  }, [applicationMasterData]);

  useEffect(() => {
    let lowerCaseAppList = props.enabledApplications.map((app) =>
      app.toLowerCase()
    );
    if (tenantTabConfig?.length) {
      let filteredApplication = tenantTabConfig.filter((app) => {
        return lowerCaseAppList.includes(app.appType.toLowerCase());
      });
      setTabList(filteredApplication);
      //To do: Make this call fully dynamic
    }
  }, [tenantTabConfig]);

  const handleConfiguration = (event, newSelection) => {
    if (newSelection !== null) {
      setConfigurationTab(newSelection);
    }
  };

  return (
    <div>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.centerAlign} ${globalClasses.marginTop} ${globalClasses.marginBottom}`}
      >
        <ToggleButtonGroup
          value={configurationTab}
          exclusive
          onChange={handleConfiguration}
          aria-label="text alignment"
          size="small"
        >
          <ToggleButton value="filter_configuration" aria-label="left aligned">
            Filter Configuration
          </ToggleButton>

          {tabList.map((config) => {
            return (
              <ToggleButton value={config.tabName} aria-label="centered">
                {config.tabName}
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>
      </div>

      {configurationTab === "filter_configuration" && (
        <FilterConfig></FilterConfig>
      )}

      {tabList.map((config, index) => {
        return (
          <>
            {configurationTab === `${config.tabName}` && (
              <GenericApplicationConfiguration
                appInfo={tabList[index]}
              ></GenericApplicationConfiguration>
            )}
          </>
        );
      })}
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    enabledApplications: state.homePageReducer.userAppData,
  };
};

const mapActionsToProps = {
  setUserApps: homePageActions,
  getApplicationMaster,
};

export default connect(mapStateToProps, mapActionsToProps)(GenericAppConfig);
