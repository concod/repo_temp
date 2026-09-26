import { Typography } from "@mui/material";
import { connect, useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import globalStyles from "core/Styles/globalStyles";
import FilterConfigurator from "modules/inventorysmart/pages-inventorysmart/filterConfigurator";
import { isEmpty } from "lodash";
import JsonRenderer from "core/Utils/json-renderer/json-renderer";
import TableConfigurator from "modules/inventorysmart/pages-inventorysmart/tableConfigurator";
import { ASSORTSMART_CLUSTER_INPUT_CONSTANTS } from "core/Utils/constants/assortSmart-constants";
import { invokeApi } from "core/actions/jsonParserActions";
import { executeAction, executeReducerAction } from "core/Utils/json-renderer/json-renderer-helper";
import { EmptyState } from "impact-ui-v3";
import { useTranslation } from "impact-ui-v3";
import { executeAllDependentComponentCallbacks, clearAllCallbacks } from "./dependentComponentCallbacks";
import RclModuleSettings from "./RclModuleSettings";
import KpiSettings from "./KpiSettings";
import AlertDescriptionSettings from "./AlertDescriptionSettings";

const WorkflowConfigurator = (props) => {
  const {
    filterConfigProps,
    attachCallBacks,
    setWorkflowPanelData,
    workflowPanelData,
    subMenuIndex,
    menuIndex,
    attachHandleChangeFuncForButtons,
  } = props;
  const globalClasses = globalStyles();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const allCurrentReducerStates = useSelector((state) => state);

  const {
    SIDENAV_SECTIONS: {
      FILTER_CONFIGURATOR,
      CREATE_PLAN_FORM_BUILDER,
      DASHBOARD_CONFIGURATOR,
      CLUSTER_BREAKDOWN_CONFIGURATOR
    },
  } = ASSORTSMART_CLUSTER_INPUT_CONSTANTS;

  const TemporaryConfiguratorComponent = () => {
    return (
      <div>
        <Typography variant="h5" style={{ padding: "20px" }} gutterBottom>
          {filterConfigProps.title} {t("moduleConfigurator.workflow.dataComing")}
        </Typography>
      </div>
    );
  };

  const componentsToBeDisplayed = [
    {
      title: FILTER_CONFIGURATOR,
      component: (
        <FilterConfigurator
          setUpCallbacks={(callback) => {
            attachCallBacks(callback);
          }}
          menuIndex={menuIndex}
          subMenuIndex={subMenuIndex}
          workflowPanelData={workflowPanelData}
          setWorkflowPanelData={setWorkflowPanelData}
          filterConfigProps={filterConfigProps}
        />
      ),
    },
    {
      title: "Filter configuration",
      component: (
        <FilterConfigurator
          setUpCallbacks={(callback) => {
            attachCallBacks(callback);
          }}
          menuIndex={menuIndex}
          subMenuIndex={subMenuIndex}
          workflowPanelData={workflowPanelData}
          setWorkflowPanelData={setWorkflowPanelData}
          filterConfigProps={filterConfigProps}
        />
      ),
    },
    {
      title: "Table Configuration",
      component: (
        <TableConfigurator
          setUpCallbacks={(callback) => {
            attachCallBacks(callback);
          }}
          menuIndex={menuIndex}
          subMenuIndex={subMenuIndex}
          workflowPanelData={workflowPanelData}
          setWorkflowPanelData={setWorkflowPanelData}
          filterConfigProps={filterConfigProps}
        />
      ),
    },
    {
      title: "User Access Management",
      component: <TemporaryConfiguratorComponent />,
    },
    {
      title: "SKU grouping type configuration",
      component: <TemporaryConfiguratorComponent />,
    },
    {
      title: CREATE_PLAN_FORM_BUILDER,
      component: (
        <FilterConfigurator
          setUpCallbacks={(callback) => {
            attachCallBacks(callback);
          }}
          menuIndex={menuIndex}
          subMenuIndex={subMenuIndex}
          workflowPanelData={workflowPanelData}
          setWorkflowPanelData={setWorkflowPanelData}
          filterConfigProps={filterConfigProps}
        />
      ),
    },
    {
      title: DASHBOARD_CONFIGURATOR,
      component: (
        <TableConfigurator
          setUpCallbacks={(callback) => {
            attachCallBacks(callback);
          }}
          menuIndex={menuIndex}
          subMenuIndex={subMenuIndex}
          workflowPanelData={workflowPanelData}
          setWorkflowPanelData={setWorkflowPanelData}
          filterConfigProps={filterConfigProps}
        />
      ),
    },
    {
      title: CLUSTER_BREAKDOWN_CONFIGURATOR,
      component: (
        <TableConfigurator
          setUpCallbacks={(callback) => {
            attachCallBacks(callback);
          }}
          menuIndex={menuIndex}
          subMenuIndex={subMenuIndex}
          workflowPanelData={workflowPanelData}
          setWorkflowPanelData={setWorkflowPanelData}
          filterConfigProps={filterConfigProps}
        />
      ),
    },
  ];

  // const addActionsToActionButtons = () => {
  //   try {
  //     let generalConfigComponent =
  //       GENERAL_CONFIGURATION.components?.children[0];
  //     generalConfigComponent?.functionProps?.forEach((functionObj) => {
  //       attachHandleChangeFuncForButtons(
  //         functionObj?.functionName,
  //         functionObj.actions[0]?.onClick
  //       );
  //     });
  //   } catch (error) {
  //     console.error("addActionsToActionButtons error", error);
  //   }
  // };

  // useEffect(() => {
  //   addActionsToActionButtons();
  // }, []);

  // Check if json_structure exists and has content
  // Handle null, undefined, empty object, or missing components
  const hasJsonStructure = 
    filterConfigProps?.json_structure !== null &&
    filterConfigProps?.json_structure !== undefined &&
    !isEmpty(filterConfigProps?.json_structure) && 
    filterConfigProps?.json_structure?.components;

  /**
   * Recursively find buttons with saveThroughNav: true in JSON structure
   * @param {object} component - The component to search
   * @returns {object|null} - The button component with saveThroughNav or null
   */
  const findSaveThroughNavButton = (component) => {
    if (!component) return null;

    // Check if current component is a button with saveThroughNav
    if (
      component.type === "button" &&
      component.staticProps?.saveThroughNav === true
    ) {
      return component;
    }

    // Recursively search in children
    if (Array.isArray(component.children)) {
      for (const child of component.children) {
        const found = findSaveThroughNavButton(child);
        if (found) return found;
      }
    }

    // Also check in components object if it exists
    if (component.components) {
      const found = findSaveThroughNavButton(component.components);
      if (found) return found;
    }

    return null;
  };

  /**
   * Recursively check if JSON structure has a dependent_componnent
   * @param {object} component - The component to search
   * @returns {boolean} - True if dependent_componnent exists, false otherwise
   */
  const hasDependentComponent = (component) => {
    if (!component) return false;

    // Check if current component is a dependent_componnent
    if (component.type === "dependent_componnent" || component.type === "dependent_component") {
      return true;
    }

    // Recursively search in children
    if (Array.isArray(component.children)) {
      for (const child of component.children) {
        if (hasDependentComponent(child)) {
          return true;
        }
      }
    }

    // Also check in components object if it exists
    if (component.components) {
      if (hasDependentComponent(component.components)) {
        return true;
      }
    }

    return false;
  };

  /**
   * Process actions from functionProps and create an executable function
   * Similar to how JsonRenderer processes actions
   * Also executes registered dependent component callbacks (e.g., TableConfigurator save)
   * only if the current JSON structure actually has a dependent component
   * @param {array} functionProps - Array of function property objects
   * @returns {function} - Async function that executes all actions
   */
  const createActionExecutor = (functionProps) => {
    return async () => {
      try {
        // Check if current JSON structure has a dependent component
        const hasDependent = hasJsonStructure && 
          hasDependentComponent(filterConfigProps.json_structure.components);

        // Find onClick functionProps
        const onClickFunction = functionProps?.find(
          (fn) => fn.functionName === "onClick"
        );

        if (!onClickFunction || !onClickFunction.actions) {
          // Only execute dependent callbacks if dependent component exists in structure
          if (hasDependent) {
            return await executeAllDependentComponentCallbacks();
          }
          return true; // No actions and no dependent component
        }

        // Execute all actions sequentially
        for (const action of onClickFunction.actions) {
          if (action.type === "api_function") {
            await executeAction({
              func: invokeApi,
              data: null,
              allReducerStates: allCurrentReducerStates,
              dispatch,
              ...action,
              allCurrentReducerStates,
            });
          } else if (action.type === "reducer_function") {
            await executeReducerAction({
              data: null,
              allReducerStates: allCurrentReducerStates,
              dispatch,
              ...action,
              allCurrentReducerStates,
            });
          } else if (action.type === "redirect") {
            // Handle redirect if needed
            console.log("Redirect action:", action);
          }
        }

        // After executing all General Configuration actions,
        // execute any registered dependent component callbacks (e.g., TableConfigurator save)
        // ONLY if the current JSON structure has a dependent component
        if (hasDependent) {
          const dependentCallbacksResult = await executeAllDependentComponentCallbacks();
          // Return true only if both General Configuration and dependent callbacks succeed
          return dependentCallbacksResult;
        }
        
        return true; // Success - no dependent component to execute
      } catch (error) {
        console.error("Error executing saveThroughNav actions:", error);
        return false; // Failure
      }
    };
  };

  /**
   * Clear callback registry when configuration changes
   * This prevents stale callbacks from previous configurations
   */
  useEffect(() => {
    // Clear callbacks when filterConfigProps changes (switching configurations)
    clearAllCallbacks();
  }, [filterConfigProps?.id, filterConfigProps?.title]);

  /**
   * Set up sticky footer Save button to execute JSON Submit actions
   * when saveThroughNav is enabled
   */
  useEffect(() => {
    if (
      !hasJsonStructure ||
      !filterConfigProps?.json_structure?.components ||
      !attachCallBacks
    ) {
      return;
    }

    try {
      // Find button with saveThroughNav: true
      const saveThroughNavButton = findSaveThroughNavButton(
        filterConfigProps.json_structure.components
      );

      if (saveThroughNavButton && saveThroughNavButton.functionProps) {
        // Create executor function from the button's actions
        const saveFunction = createActionExecutor(
          saveThroughNavButton.functionProps
        );

        // Attach to sticky footer Save button
        attachCallBacks({ nextNavFunc: saveFunction });
      }
    } catch (error) {
      console.error("Error setting up saveThroughNav:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filterConfigProps?.json_structure,
    hasJsonStructure,
    attachCallBacks,
    allCurrentReducerStates,
  ]);
  
  // Map config_type to reusable components
  const configTypeComponents = {
    attributeTableConfig: (
      <RclModuleSettings
        key={filterConfigProps?.id || filterConfigProps?.title}
        setUpCallbacks={(callback) => {
          attachCallBacks(callback);
        }}
        menuIndex={menuIndex}
        subMenuIndex={subMenuIndex}
        workflowPanelData={workflowPanelData}
        setWorkflowPanelData={setWorkflowPanelData}
        filterConfigProps={filterConfigProps}
      />
    ),
    kpiConfig: (
      <KpiSettings
        key={filterConfigProps?.id || filterConfigProps?.title}
        setUpCallbacks={(callback) => {
          attachCallBacks(callback);
        }}
        filterConfigProps={filterConfigProps}
      />
    ),
    alertDescriptionConfig: (
      <AlertDescriptionSettings
        key={filterConfigProps?.id || filterConfigProps?.title}
        setUpCallbacks={(callback) => {
          attachCallBacks(callback);
        }}
        filterConfigProps={filterConfigProps}
      />
    ),
  };

  // Find matching component: config_type first, then title fallback
  const configTypeMatch = configTypeComponents[filterConfigProps?.config_type];
  const matchingComponent = componentsToBeDisplayed?.find(
    (componentObj) =>
      componentObj?.title?.toLowerCase() ===
      filterConfigProps?.title?.toLowerCase()
  );

  return (
    <div className={globalClasses.fullWidth}>
      {hasJsonStructure ? (
        <JsonRenderer
          key={filterConfigProps?.id || filterConfigProps?.title}
          currentComponent={filterConfigProps?.json_structure?.components}
        />
      ) : configTypeMatch ? (
        <div>
          {configTypeMatch}
        </div>
      ) : matchingComponent ? (
        <div>
          {matchingComponent.component}
        </div>
      ) : (
            <EmptyState
              description=""
              heading={t("moduleConfigurator.workflow.noConfigFound")}
              onPrimaryButtonClick={() => { }}
              onSecondaryButtonClick={() => { }}
            />
      )}
    </div>
  );
};

const mapStateToProps = (state) => ({});
const mapActionsToProps = {};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(WorkflowConfigurator);
