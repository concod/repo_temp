import globalStyles from "core/Styles/globalStyles";
import {
  createReducerState,
  getSidePanelData,
} from "core/actions/configuratorActions";
import { useEffect, useRef, useState } from "react";
import { connect, useDispatch, useSelector } from "react-redux";
import WorkflowPanel from "./WorkflowPanel";
import { useStyles } from "./styles";
import { isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import WorkflowConfigurator from "./WorkflowConfigurator";
import { OTHER_GENERAL_CONFIGURATION } from "./otherGeneralConfigurationJson";
import { GENERAL_CONFIGURATION } from "./generalConfigurationJson";
import { getJsonData } from "core/actions/jsonParserActions";
import { TABLE_CONFIGURATION } from "./tableConfigurationJson";
import { useNavigate } from "react-router-dom-v5-compat";

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
  const navigate = useNavigate();
  const dispatch = useDispatch();
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
      // below commented code will be used when the previous screens are developed
      // const currentScreenName = history?.location?.state?.currentScreenName;
      // setScreenName(currentScreenName);

      let moduleName = localStorage.getItem("moduleName")
        ? localStorage.getItem("moduleName")
        : configuratorReducer.moduleName;

      let moduleCode = localStorage.getItem("moduleCode")
        ? JSON.parse(localStorage.getItem("moduleCode"))
        : configuratorReducer.moduleCode;

      /**
       * On refresh reducer stats resets so that is
       * why adding below code
       */
      dispatch(createReducerState("moduleName", moduleName));
      dispatch(createReducerState("moduleCode", moduleCode));

      setScreenName(moduleName);

      const data = await getSidePanelData(moduleName, moduleName)();

      const generalConfigurationjsonData = await getJsonData(
        moduleCode,
        moduleName,
        "General Configuration"
      )();

      const otherGeneralConfigurationjsonData = await getJsonData(
        moduleCode,
        moduleName,
        "Other General CONFIGURATION"
      )();

      dispatch(
        createReducerState(
          "generalConfigurationJson",
          generalConfigurationjsonData?.data?.data
        )
      );

      dispatch(
        createReducerState(
          "otherGeneralConfigurationJson",
          otherGeneralConfigurationjsonData?.data?.data
        )
      );

      dispatch(createReducerState("currentTableName", "release_notes"));
      let menuData = data?.data?.data?.sections;
      menuData?.forEach((section, index) => {
        section?.sub_sections?.forEach((sub_section) => {
          if (sub_section?.title === "General configuration") {
            sub_section.json_structure =
              generalConfigurationjsonData?.data?.data;
            sub_section.buttonsToBeRendered = ["Back", "Next"];
          } else {
            sub_section.json_structure = {};
            sub_section.buttonsToBeRendered = [
              "Save",
              "Cancel",
              "Back",
              "Next",
            ];
          }
        });
      });
      setFilterConfigProps(menuData[0]?.sub_sections[0]);
      setWorkflowPanelData(menuData);
    } catch (error) {
      console.error("getWorkflowDetails error", error);
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
   * onClickBack will be called when back button
   * is clicked in the work flow panel to move to
   * previous section.
   * basically we are navigating from menu
   * and submenu so the code for both conditions
   * is added in the below function
   */
  const onClickBack = async () => {
    try {
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
      name: "Save",
      onClick: () => onSave(),
      variant: "outlined",
    },
    {
      name: "Cancel",
      onClick: () => onClickBack(),
      variant: "outlined",
    },
    {
      name: "Back",
      onClick: () => onClickBack(),
      variant: "outlined",
    },
    {
      name: "Next",
      onClick: () => onClickNext(),
      variant: "contained",
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
    }
  }, [subMenuIndex]);

  return (
    <div>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter} ${classes.headerContainer}`}
      >
        <p className={classes.header}>{screenName} Configuration</p>
        <p
          tabIndex="0"
          className={classes.headerOptions}
          onClick={() => navigate(-1)}
        >
          View all modules configuration
        </p>
      </div>
      <div className={classes.workflowPanelContainer}>
        <WorkflowPanel
          workflowPanelData={workflowPanelData}
          actionsButtons={actionsButtons}
          filterConfigProps={filterConfigProps}
          setFilterConfigProps={setFilterConfigProps}
          setMenuIndex={setMenuIndex}
          setSubMenuIndex={setSubMenuIndex}
        >
          <WorkflowConfigurator
            menuIndex={menuIndex}
            subMenuIndex={subMenuIndex}
            workflowPanelData={workflowPanelData}
            setWorkflowPanelData={setWorkflowPanelData}
            filterConfigProps={filterConfigProps}
            attachCallBacks={attachCallBacks}
            attachHandleChangeFuncForButtons={attachHandleChangeFuncForButtons}
          />
        </WorkflowPanel>
      </div>
    </div>
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
