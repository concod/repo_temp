import { Typography } from "@mui/material";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import FilterConfigurator from "core/pages/filterConfigurator";
import JsonRenderer from "core/Utils/json-renderer/json-renderer";
import { isEmpty } from "lodash";
import TableConfigurator from "core/pages/tableConfigurator";

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

  const TemporaryConfiguratorComponent = () => {
    return (
      <div>
        <Typography variant="h5" style={{ padding: "20px" }} gutterBottom>
          {filterConfigProps.title} data coming soon..
        </Typography>
      </div>
    );
  };

  const componentsToBeDisplayed = [
    {
      title: "Other general configuration",
      component: (
        <TemporaryConfiguratorComponent />
      ),
    },
    {
      title: "Filter Configuration",
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

  return (
    <div className={globalClasses.fullWidth}>
      {!isEmpty(filterConfigProps?.json_structure) ? (
        <JsonRenderer
          currentComponent={filterConfigProps?.json_structure?.components}
        />
      ) : (
        componentsToBeDisplayed?.map((componentObj) =>
          componentObj?.title === filterConfigProps?.title ? (
            <div
              className={`${globalClasses.fullWidth} ${globalClasses.flexRow} ${globalClasses.layoutAlignCenter}`}
            >
              {componentObj?.component}
            </div>
          ) : (
            <></>
          )
        )
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
