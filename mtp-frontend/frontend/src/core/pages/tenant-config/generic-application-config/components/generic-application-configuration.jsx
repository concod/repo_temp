import React, { useEffect, useState, useRef } from "react";
import { Paper, Typography } from "@mui/material";
import {
  getTenantFilterConfig,
  saveTenantFilterConfig,
  getFilterConfiguration,
  getApplicationMaster,
  updateTenantAttributeConfig,
} from "../../../../actions/tenantConfigActions";
import FormControlGenerator from "./form-control-handler";
import { connect } from "react-redux";
import LoadingOverlay from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import {
  getFiltersOptions,
  getFilterDependency,
  getAllDropdownValues,
} from "../utils/config-utility";
import { cloneDeep, find } from "lodash";
import { CreatePlan } from "../stringConstants/stringConstants";

const GenericApplicationConfiguration = (props) => {
  const globalClasses = globalStyles();

  const screenConfig = useRef([]);
  const [isLoading, setLoading] = useState(true);
  const [filterElements, setFilterElements] = useState([]);

  useEffect(async () => {
    setTenantFilterConfig();
    fetchFilterConfig();
  }, []);

  useEffect(() => {
    regenerateDropDownConfig();
  }, [filterElements]);

  const setTenantFilterConfig = async () => {
    try {
      let appConfig = await props.getTenantFilterConfig(
        props?.appInfo?.applicationCode || 1
      ); //To send application code of the individual application with the inventorySmart application preset to default

      screenConfig.current = appConfig.data.dynamicContent;

      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  };

  /**
   * @function
   * @description Fetch the initial form Attributes to setup the form.
   */
  const fetchFilterConfig = async () => {
    try {
      const filterData = await props.getFilterConfiguration();
      const fields = getAllDropdownValues(filterData.data.data, true);
      fields.then((data) => {
        setFilterElements(filterData.data.data);
      });
    } catch (error) {}
  };

  /**
   * @function
   * @description Combine the screenConfig with the dropdown dynamic data
   */
  const regenerateDropDownConfig = async () => {
    let screenConfigClone = cloneDeep(screenConfig.current);

    screenConfigClone?.forEach((parentContainer) => {
      parentContainer?.settings?.forEach((setting) => {
        let currentAccessor = setting.column_name;

        let indexOfAccessorInFilterElements = filterElements.findIndex(
          (item) => currentAccessor === item.accessor
        );

        if (indexOfAccessorInFilterElements > -1) {
          setting.options = [
            ...filterElements[indexOfAccessorInFilterElements].options,
          ];
        }
      });
    });
    const newConfig = cloneDeep(screenConfigClone);
    screenConfig.current = newConfig;
  };

  /**
   * @function
   * @description Handle Data on every change of form Element
   * @param {String} formObjectName
   * @param {Object} formObjectValue
   */
  const formFieldUpdated = async (updatedFormData, id, depth) => {
    // Check if Id is present in the plan_levels
    setLoading(true);
    if (CreatePlan.__plan_levels.indexOf(id) > -1) {
      const newUpdatedDependencyObject = {};
      updatedFormData?.forEach((parentContainer, parentIndex) => {
        parentContainer?.settings.forEach((setting, settingIndex) => {
          if (parentIndex === depth[0] && settingIndex <= depth[1]) {
            if (setting?.defaultValue) {
              newUpdatedDependencyObject[setting?.column_name] =
                setting?.defaultValue[0]?.value;
            }
          }
          if (parentIndex === depth[0] && settingIndex > depth[1]) {
            setting.defaultValue = [];
          }
        });
      });

      const Idx = filterElements.findIndex((filter) => {
        return filter.accessor === id;
      });

      let newDependency = getFilterDependency(
        filterElements,
        newUpdatedDependencyObject,
        Idx
      );
      // Fetch filter options with the updated dependency.
      const options = getFiltersOptions(filterElements, newDependency, Idx);
      options.then((data) => {
        setFilterElements(data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  };

  /**
   * @function
   * @description Event emitter when any of the value of any of the field is changed
   */
  const handleChange = (updatedFormData, accessorId, formDepth) => {
    formFieldUpdated(updatedFormData, accessorId, formDepth);
  };

  const onSaveHandler = () => {
    const saveTenantFilterConfig = async () => {
      if (!screenConfig.current) return;
      try {
        let saveTenantFilterConfigPayload = {
            dynamicContent: screenConfig.current,
          },
          hierarchyLevelTenantConfig = screenConfig.current.filter(
            (tenantConfigData) => {
              return tenantConfigData.level === CreatePlan.__Hierarchy_level;
            }
          ),
          applicationLevelTenantConfig = screenConfig.current.filter(
            (tenantConfigData) => {
              return tenantConfigData.level === CreatePlan.__Application_level;
            }
          );

        let applicationLevelTenantConfigPayload = {
          config_level: applicationLevelTenantConfig[0]?.level || "application",
          application_code: applicationLevelTenantConfig[0]?.application_code,
          config_value: applicationLevelTenantConfig.map((tenantConfigData) => {
            return {
              attribute_name:
                tenantConfigData?.settings?.[0]?.inputLabel ||
                tenantConfigData?.settings?.[0]?.label,
              attribute_value:
                tenantConfigData.type === "dropdown"
                  ? tenantConfigData?.settings?.[0]?.defaultValue?.[0]?.value
                  : tenantConfigData.type === "table"
                  ? tenantConfigData?.settings?.[0]?.options?.[0]?.[
                      "selectedRows"
                    ].map((item) => {
                      const selection = find(
                        tenantConfigData?.settings?.[0]?.options?.[0]?.["rows"],
                        { id: item.id }
                      );

                      return {
                        attribute_name: selection.attribute_name,
                        attribute_value: selection.parameter_value,
                        id: selection.id,
                      };
                    })
                  : tenantConfigData?.settings?.[0]?.defaultValue,
            };
          }),
        };

        let tenantFilterConfigResponse = await props.saveTenantFilterConfig(
          props.appInfo?.applicationCode,
          saveTenantFilterConfigPayload
        );

        let tenantHierarchyValue = hierarchyLevelTenantConfig
            .filter((hierarchyData) => {
              //Fetch the tenant configuration where the hierarchy is being set
              return hierarchyData.label === "Cluster Configuration";
            })?.[0]
            ?.settings.map((hierarchies) => {
              return {
                filters: {
                  attribute_name: hierarchies.column_name,
                  operator: "in",
                  values: [hierarchies.defaultValue?.[0]?.value],
                  filter_type: "cascaded",
                },
              };
            }),
          tenantNonHierarchyValues = hierarchyLevelTenantConfig.filter(
            (hierarchyData) => {
              //Fetch the tenant configuration where the hierarchy is being set
              return hierarchyData.label !== "Cluster Configuration";
            }
          );

        let hierarchyLevelTenantConfigPayload = {
          config_level: hierarchyLevelTenantConfig[0]?.level,
          application_code: hierarchyLevelTenantConfig[0]?.application_code,
        };

        let applicationLevelTenantConfigResponse = await props.updateTenantAttributeConfig(
          CreatePlan.__Application_level,
          applicationLevelTenantConfigPayload
        );

        if (
          tenantFilterConfigResponse?.status ||
          applicationLevelTenantConfigResponse?.data?.status
        ) {
          props.addSnack({
            message:
              tenantFilterConfigResponse?.data[0] ||
              "Successful created new configuration",
            options: {
              variant: "success",
            },
          });
        }

        setLoading(false);
      } catch (e) {
        setLoading(false);
        props.addSnack({
          message: "Updating new configuration failed!",
          options: {
            variant: "error",
          },
        });
      }
    };
    saveTenantFilterConfig();
  };

  const onTableCellUpdate = (updatedTableData, nestingLevel) => {
    let updatedScreenConfig = cloneDeep(screenConfig.current);
    updatedScreenConfig[nestingLevel[0]].settings[
      nestingLevel[1]
    ].options[0].rows = updatedTableData;
    screenConfig.current = updatedScreenConfig;
  };

  return (
    <>
      <Paper elevation={0} className={globalClasses.paper}>
        <div className={globalClasses.paddingVertical}>
          <Typography variant="h4">{props.appInfo.pageHeader}</Typography>
        </div>
        {isLoading && (
          <div className={globalClasses.positionFixedCenter}>
            <LoadingOverlay loader={isLoading}></LoadingOverlay>
          </div>
        )}

        {
          <FormControlGenerator
            handleChange={handleChange}
            fields={screenConfig.current}
            onSaveHandler={onSaveHandler}
            applicationInfo={props.appInfo}
            onTableCellUpdate={onTableCellUpdate}
          ></FormControlGenerator>
        }
      </Paper>
    </>
  );
};

const mapActionsToProps = {
  addSnack,
  getTenantFilterConfig,
  saveTenantFilterConfig,
  getFilterConfiguration,
  getApplicationMaster,
  updateTenantAttributeConfig,
};

export default connect(
  null,
  mapActionsToProps
)(GenericApplicationConfiguration);
