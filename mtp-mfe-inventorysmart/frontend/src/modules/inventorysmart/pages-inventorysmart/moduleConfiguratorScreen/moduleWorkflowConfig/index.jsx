import globalStyles from "core/Styles/globalStyles";
import {
  createReducerState,
  getSidePanelData,
} from "modules/inventorysmart/services-inventorysmart/ModuleConfigurator/configurator-actions";
import { getScreenMaster } from "core/actions/commentActions";
import { useEffect, useRef, useState } from "react";
import { connect, useDispatch, useSelector } from "react-redux";
import WorkflowPanel from "./WorkflowPanel";
import { useStyles } from "./styles";
import { isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import WorkflowConfigurator from "./WorkflowConfigurator";
import { useNavigate } from "react-router-dom-v5-compat";
import { SIDE_PANEL_DATA } from "./sidePanelData"
import styles from "../designSystem.module.css";
import { Breadcrumbs, Button } from "impact-ui-v3";
import { useTranslation } from "impact-ui-v3";
import LoadingOverlay from "core/Utils/Loader/loader";

// Toggle this flag to use mock data instead of API calls
// Set to true to use mock data, false to use real API calls
const USE_MOCK_DATA = false;

const ModuleWorkflowConfig = (props) => {
  const [screenName, setScreenName] = useState("");
  const [workflowPanelData, setWorkflowPanelData] = useState([]);
  // below state filterConfigProps will be the
  // data which will be passed down to the configurator
  const [filterConfigProps, setFilterConfigProps] = useState({});
  const currentValidatorRef = useRef(null);
  const backNavRef = useRef(null);
  const [menuIndex, setMenuIndex] = useState(0);
  const [subMenuIndex, setSubMenuIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFirstPosition, setIsFirstPosition] = useState(true);
  const [isLastPosition, setIsLastPosition] = useState(false);
  const [showConfigurator, setShowConfigurator] = useState(true);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const globalClasses = globalStyles();
  const classes = useStyles();
  const configuratorReducer = useSelector((store) => store.configuratorReducer);

  /**
   * getWorkflowDetails function gets the detail
   * for the side panel and data of the config needed to
   * pass to the configurator from the api
   */
  const getWorkflowDetails = async () => {
    try {
      setLoading(true);
      
      // below commented code will be used when the previous screens are developed
      // const currentScreenName = history?.location?.state?.currentScreenName;
      // setScreenName(currentScreenName);

      let screenName =  localStorage.getItem("screenName")
        ? localStorage.getItem("screenName")
        : configuratorReducer.screenName;

      let moduleName = localStorage.getItem("moduleName")
        ? localStorage.getItem("moduleName")
        : configuratorReducer.moduleName;

      let moduleCode = localStorage.getItem("moduleCode")
        ? JSON.parse(localStorage.getItem("moduleCode"))
        : configuratorReducer.moduleCode;

      let screenCode = localStorage.getItem("screenCode")
        ? localStorage.getItem("screenCode")
        : configuratorReducer.screenCode;

      /**
       * On refresh reducer stats resets so that is
       * why adding below code
       */
      dispatch(createReducerState("moduleName", moduleName));
      dispatch(createReducerState("moduleCode", moduleCode));
      dispatch(createReducerState("screenCode", screenCode));
      dispatch(createReducerState("screenName", screenName));

      // Fetch screen name directly from screen master API using screenCode
      if (screenCode) {
        try {
          const screenMasterResponse = await dispatch(
            getScreenMaster({ application: [1] })
          );
          if (screenMasterResponse?.data?.status && screenMasterResponse?.data?.data) {
            const screenData = screenMasterResponse.data.data.find(
              (screen) => Number(screen.screen_code) === Number(screenCode)
            );
            if (screenData?.screen_name) {
              screenName = screenData.screen_name;
            }
          }
        } catch (error) {
          console.error("Error fetching screen name from screen master:", error);
        }
      }

      // Store screenName in Redux and localStorage
      dispatch(createReducerState("screenName", screenName));
      localStorage.setItem("screenName", screenName);
      setScreenName(screenName);

      // Fetch sidelayout data (contains both layout + embedded templates)
      const data = USE_MOCK_DATA
        ? SIDE_PANEL_DATA
        : await getSidePanelData(screenName, moduleName, screenCode, moduleCode)().catch((error) => {
            console.error("Error fetching side panel data:", error);
            return null;
          });

      dispatch(createReducerState("currentTableName", "release_notes"));

      // Handle case where data might be null/undefined
      let menuData = data?.data?.data?.sections || data?.data?.sections || data?.sections || [];

      if (!menuData || menuData.length === 0) {
        console.warn("No menu data available. Cannot proceed with workflow setup.");
        return;
      }

      // Templates are already embedded as json_structure by the BE sidelayout response.
      // Add buttonsToBeRendered and dispatch templates to Redux for json-renderer-helper.
      const configSubSections = new Set([
        "Other general configuration",
        "Workflow configuration",
      ]);

      // config_types that are handled by standalone components (not JsonRenderer)
      const standaloneConfigTypes = new Set([
        "kpiConfig",
        "attributeTableConfig",
        "alertDescriptionConfig",
      ]);

      menuData.forEach((section) => {
        section?.sub_sections?.forEach((sub_section) => {
          if (standaloneConfigTypes.has(sub_section?.config_type)) {
            // Standalone components manage their own save via setUpCallbacks.
            // Remove any json_structure so WorkflowConfigurator routes to the component.
            delete sub_section.json_structure;
            sub_section.buttonsToBeRendered = ["Save", "Cancel", "Back", "Next"];
          } else if (configSubSections.has(sub_section?.title)) {
            sub_section.buttonsToBeRendered = ["Back", "Next"];
          } else {
            if (!sub_section.json_structure) {
              sub_section.json_structure = {};
            }
            sub_section.buttonsToBeRendered = ["Save", "Cancel", "Back", "Next"];
          }
        });
      });

      // Dispatch templates to Redux for json-renderer-helper compatibility
      const allSubSections = menuData.flatMap((s) => s?.sub_sections || []);
      const findTemplate = (title) =>
        allSubSections.find((ss) => ss?.title === title)?.json_structure || null;

      dispatch(createReducerState("generalConfigurationJson", findTemplate("General configuration")));
      dispatch(createReducerState("otherGeneralConfigurationJson", findTemplate("Other general configuration")));
      dispatch(createReducerState("workflowConfigurationJson", findTemplate("Workflow configuration")));

      // Only set filter config props and workflow panel data if menuData is valid
      if (menuData[0]?.sub_sections?.[0]) {
        setFilterConfigProps(menuData[0].sub_sections[0]);
      }
      setWorkflowPanelData(menuData);
    } catch (error) {
      console.error("getWorkflowDetails error", error);
    } finally {
      // Always set loading to false when all API calls are complete
      setLoading(false);
    }
  };

  /**
   * onClickNext will be called when next button
   * is clicked in the work flow panel to move to
   * next section.
   * basically we are navigating from menu
   * and submenu so the code for both conditions
   * is added in the below function
   */
  const onClickNext = async () => {
    try {
      if (
        currentValidatorRef.current &&
        !(await currentValidatorRef.current())
      ) {
        return;
      }
      let menuData = [...workflowPanelData];
      let maxIndexForMenu = menuData.length - 1;
      let maxIndexForSubMenu = menuData[menuIndex]?.sub_sections?.length - 1;
      let nextMenuIndex = menuIndex + 1;
      let nextSubMenuIndex = subMenuIndex + 1;

      /**
       * below code is for navigating forward in
       * the submenu
       */
      if (nextSubMenuIndex <= maxIndexForSubMenu) {
        menuData[menuIndex].sub_sections[subMenuIndex].isOpen = false;
        menuData[menuIndex].sub_sections[nextSubMenuIndex].isOpen = true;
        setSubMenuIndex(nextSubMenuIndex);
        setFilterConfigProps(
          menuData[menuIndex].sub_sections[nextSubMenuIndex]
        );
      } else if (nextMenuIndex <= maxIndexForMenu) {
        /**
         * below code is for navigating forward in
         * the Menu
         */
        menuData[menuIndex].isOpen = false;
        menuData[menuIndex].sub_sections[subMenuIndex].isOpen = false;
        menuData[menuIndex].isCompleted = true;
        menuData[nextMenuIndex].isOpen = true;
        if (!isEmpty(menuData[nextMenuIndex].sub_sections)) {
          menuData[nextMenuIndex].sub_sections[0].isOpen = true;
          setFilterConfigProps(menuData[nextMenuIndex].sub_sections[0]);
        } else {
          setFilterConfigProps(menuData[nextMenuIndex]);
        }
        setMenuIndex(nextMenuIndex);
        setSubMenuIndex(0);
      }
      setWorkflowPanelData(menuData);
    } catch (error) {
      console.error("onClickNext error", error);
    }
  };

  /**
   * onClickCancel will hide and show the configurator
   * to force a remount and reset all state
   */
  const onClickCancel = () => {
    setShowConfigurator(false);
    setTimeout(() => {
      setShowConfigurator(true);
    }, 0);
  };

  /**
   * onClickBack will be called when back button
   * is clicked in the work flow panel to move to
   * previous section.
   * basically we are navigating from menu
   * and submenu so the code for both conditions
   * is added in the below function
   */
  const onClickBack = async () => {
    try {
      if (isFirstPosition) {
        navigate('/inventory-smart/configurator/module-configurator');
        return;
      }
      
      if (backNavRef.current && !(await backNavRef.current())) {
        return;
      } else {
        let menuData = [...workflowPanelData];
        let previousMenuIndex = menuIndex - 1;
        let previousSubMenuIndex = subMenuIndex - 1;
        /**
         * below code is for navigating backward in
         * the submenu
         */
          if (previousSubMenuIndex >= 0) {
            menuData[menuIndex].sub_sections[subMenuIndex].isOpen = false;
            menuData[menuIndex].sub_sections[previousSubMenuIndex].isOpen = true;
            setSubMenuIndex(previousSubMenuIndex);
            setFilterConfigProps(
              menuData[menuIndex].sub_sections[previousSubMenuIndex]
            );
          } else if (previousMenuIndex >= 0) {
            /**
             * below code is for navigating backward in
             * the menu
             */
            menuData[menuIndex].isOpen = false;
            menuData[previousMenuIndex].isOpen = true;
            let subMenuLastIndex =
              menuData[previousMenuIndex].sub_sections.length - 1;
            if (!isEmpty(menuData[previousMenuIndex].sub_sections)) {
              menuData[previousMenuIndex].sub_sections[
                subMenuLastIndex
              ].isOpen = true;
              setFilterConfigProps(
                menuData[previousMenuIndex].sub_sections[subMenuLastIndex]
              );
            }
            setMenuIndex(previousMenuIndex);
            setSubMenuIndex(subMenuLastIndex);
          }
          setWorkflowPanelData(menuData);
      }
    } catch (error) {
      console.error("onClickBack error", error);
    }
  };

  /**
   * @function
   * @description On Save calls for the referenced
   * callbacks when available and unlike callNext
   * doesn't move to the next screen.
   */
  const onSave = () => {
    try {
      if (currentValidatorRef.current) {
        currentValidatorRef.current();
      }
    } catch (error) {
      console.error("onSave error", error);
    }
  };

  /**
   * actionsButtons is an array which can
   * contain any number of buttons to perform
   * respective actions through their onClick
   * function in work panel
   */
  const actionsButtons = [
    {
      id: "back",
      name: t("moduleConfigurator.workflow.back"),
      onClick: onClickBack,
      variant: "tertiary",
    },
    {
      id: "cancel",
      name: t("moduleConfigurator.workflow.cancel"),
      onClick: onClickCancel,
      variant: "text",
    },
    {
      id: "save",
      name: t("moduleConfigurator.workflow.save"),
      onClick: onSave,
      variant: "secondary",
    },
    {
      id: "next",
      name: t("moduleConfigurator.workflow.next"),
      onClick: onClickNext,
      variant: "primary",
      disabled: isLastPosition,
    },
  ];

  const attachHandleChangeFuncForButtons = (
    functionName,
    functionToBeExecuted
  ) => {
    try {
      const buttons = [...actionsButtons];
      buttons.forEach((action) => {
        if (action.name === functionName) {
          action.onClick = functionToBeExecuted;
        }
      });
    } catch (error) {
      console.error("attachHandleChangeFuncForButtons error", error);
    }
  };

  /**
   * attachCallBacks funtions will
   * check if there is any callback
   * if there is any callback then
   * attach that call to
   * currentValidatorRef
   * @param {function} callback
   */
  const attachCallBacks = (callback) => {
    const { nextNavFunc, previousNavFunc = () => true } = { ...callback };
    currentValidatorRef.current = nextNavFunc;
    backNavRef.current = previousNavFunc;
  };

  /**
   * detachCallbacks funtions will
   * then detach that callbacks to
   * currentValidatorRef
   */
  const detachCallbacks = () => {
    currentValidatorRef.current = null;
    backNavRef.current = null;
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  /**
   * checkIfTheMenuisCompleted function will be
   * used to check whether all the submenus of a
   * menu is completed or not and then only make
   * the menu as completed
   */
  const checkIfTheMenuisCompleted = () => {
    try {
      let menuData = [...workflowPanelData];
      menuData.forEach((menu) => {
        let allSubSectionsCompleted = true;
        if (!isEmpty(menu.sub_sections)) {
          menu.sub_sections.forEach((subMenu) => {
            if (!subMenu?.isCompleted) {
              allSubSectionsCompleted = false;
            }
          });
        } else {
          if (!menu?.isCompleted) {
            allSubSectionsCompleted = false;
          }
        }
        menu.isCompleted = allSubSectionsCompleted;
      });
      detachCallbacks();
      setWorkflowPanelData(menuData);
    } catch (error) {
      console.error("checkIfTheMenuisCompleted error", error);
    }
  };

  useEffect(() => {
    getWorkflowDetails();
  }, []);

  useEffect(() => {
    if (!isEmpty(workflowPanelData)) {
      checkIfTheMenuisCompleted();
      
      // Update position flags
      const isFirst = menuIndex === 0 && subMenuIndex === 0;
      setIsFirstPosition(isFirst);
      
      const lastSectionIndex = workflowPanelData.length - 1;
      const lastSection = workflowPanelData[lastSectionIndex];
      const lastSubSectionIndex = lastSection?.sub_sections?.length - 1;
      const isLast = menuIndex === lastSectionIndex && subMenuIndex === lastSubSectionIndex;
      setIsLastPosition(isLast);
    }
  }, [subMenuIndex, menuIndex]);

  const paths = [
    {
      label: t("moduleConfigurator.breadcrumb.home"),
      to: "/home",
    },
    {
      label: screenName,
      to: "#",
    },
  ];
  return (
    <LoadingOverlay 
      loader={loading} 
      text={t("moduleConfigurator.workflow.loadingModuleConfig")}
      minHeight="100vh"
      size="medium"
    >
      <div className={`${styles.tokens} ${styles.flex} ${styles.flexCol} ${styles.overflowHidden}`} style={{height: 'calc(100vh - 3.5rem - 4.50rem)'}}>
        <div
          className={`${styles.main_page_alignment} ${styles.flex} ${styles.flexCol} ${styles.flex1} ${styles.minH0} ${styles.overflowHidden}`}
          style={{height: 0, flex: '1 1 0%'}} /* Force flex child to respect parent height */
        >
          <div className={`${styles.mb12} ${styles.flexShrink0}`}>
            <Breadcrumbs list={paths} />
          </div>
          <div className={`${styles.flex1} ${styles.minH0} ${styles.flex} ${styles.flexCol}`}>
            <WorkflowPanel
              workflowPanelData={workflowPanelData}
              actionsButtons={actionsButtons}
              filterConfigProps={filterConfigProps}
              setFilterConfigProps={setFilterConfigProps}
              setMenuIndex={setMenuIndex}
              setSubMenuIndex={setSubMenuIndex}
            >
            {showConfigurator && (
              <WorkflowConfigurator
                menuIndex={menuIndex}
                subMenuIndex={subMenuIndex}
                workflowPanelData={workflowPanelData}
                setWorkflowPanelData={setWorkflowPanelData}
                filterConfigProps={filterConfigProps}
                attachCallBacks={attachCallBacks}
                attachHandleChangeFuncForButtons={attachHandleChangeFuncForButtons}
              />
            )}
            </WorkflowPanel>
          </div>
        </div>
         <div 
         className={`${styles.stickyFooter} ${styles.justifyBetween}`}>
         <div className={`${styles.flex} ${styles.gap12}`}>
           {actionsButtons
             .filter(button => button.id === "back" || button.id === "cancel")
             .map((button, index) => (
               <Button
                 key={button.name}
                 onClick={button.onClick}
                 variant={button.variant}
                 size='small'
               >
                 {button.name}
               </Button>
             ))}
         </div>
         <div className={`${styles.flex} ${styles.gap12}`}>
           {actionsButtons
             .filter(button => button.id === "save" || button.id === "next")
             .map((button, index) => (
               <Button
                 key={button.name}
                 onClick={button.onClick}
                 variant={button.variant}
                 size='small'
                 disabled={button?.disabled}
               >
                 {button.name}
               </Button>
             ))}
         </div>
       </div>
        </div>
    </LoadingOverlay>
  );
};

const mapStateToProps = (state) => ({});
const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (messageProperties) => dispatch(addSnack(messageProperties)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ModuleWorkflowConfig);
