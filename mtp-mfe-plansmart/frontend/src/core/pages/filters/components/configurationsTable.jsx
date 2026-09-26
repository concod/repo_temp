import { Typography } from "@mui/material";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import LoadingOverlay from "core/Utils/Loader/loader";
import AgGrid from "core/Utils/agGrid";
import { captializeStringIfCamelCase } from "core/Utils/formatter";
import { Prompt } from "impact-ui";
import moment from "moment";
import { forwardRef, useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import {
  deleteFilterConfigById,
  getFilterConfigById,
  getFilterConfigsTableData,
  getFilteredFields,
  resetFilterConfigSelections,
  setEditConfigData,
  setFilteredFields,
  setMandatoryFieldsInScreen,
  setModuleConfigData,
  updateFilterConfig,
} from "../../../actions/filterAction";
import { addSnack } from "../../../actions/snackbarActions";
import { getColumnsAg } from "../../../actions/tableColumnActions";
import {
  checkForValidFilters,
  flattenSelectedFiltersData,
} from "./common-functions";
import CreateFilter from "./createFilter";
import ModuleConfig from "./moduleConfig";
const useStyles = makeStyles({
  moduleTitle: {
    fontSize: 20,
    fontWeight: 500,
  },
  dialogActions: {
    background: "#F9F9F9",
    marginRight: "2%",
  },
});
const EditModal = forwardRef((props, ref) => {
  const classes = useStyles();
  const [updateFilterConfigLoader, setupdateFilterConfigLoader] = useState(
    false
  );
  const [editFilterDimensions, seteditFilterDimensions] = useState([]);
  const [updateConfigData, setupdateConfigData] = useState({}); //State variable for edit config API response details
  const update = async () => {
    if (checkForValidFilters(props.selectedModuleConfigData)) {
      props.addSnack({
        message: "Please fill all required fields.",
        options: {
          variant: "error",
        },
      });
      return;
    }
    const elements = flattenSelectedFiltersData(props.selectedModuleConfigData);
    const configJSON = {
      name: props.configObj.name,
      screens: updateConfigData.screens,
      elements: elements,
    };
    try {
      setupdateFilterConfigLoader(true);
      await props.updateFilterConfig(
        props.id,
        props.configObj.fc_code,
        configJSON
      );
      props.addSnack({
        message: "Configuration updated successfully",
        options: {
          variant: "success",
        },
      });
      ref.current.api.refreshServerSideStore({ purge: true });
      setupdateFilterConfigLoader(false);
      props.handleClose();
    } catch (error) {
      setupdateFilterConfigLoader(false);
      props.addSnack({
        message: "Failed to update",
        options: {
          variant: "error",
        },
      });
    }
  };

  useEffect(() => {
    const fetchConfigInfo = async () => {
      setupdateFilterConfigLoader(true);
      const res = await props.getFilterConfigById(props.configObj.fc_code);
      const configObj = res.data.data;
      const dimensions = configObj?.dimensions;
      const screens = props.configObj.screens;
      setupdateConfigData(configObj); //after fetching the information from the API related to the config
      //set the object into the state variable
      const fieldsres = await props.getFilteredFields(dimensions, screens);
      props.setFilteredFields(fieldsres.data.data.filters);
      props.setMandatoryFieldsInScreen(fieldsres.data.data.compulsory);
      dimensions.forEach((dimension) => {
        const eachDimensionFilters = configObj?.elements.filter(
          (element) => element.dimension === dimension
        );
        props.setEditConfigData(eachDimensionFilters, dimension);
      });
      seteditFilterDimensions(
        configObj?.dimensions.map((dimension) => {
          return {
            label: dimension,
            value: dimension,
          };
        })
      );
      setupdateFilterConfigLoader(false);
    };
    //Once the modal is opened fetch the config details
    fetchConfigInfo();
  }, []);
  return (
    <Dialog
      id="editFilterDialog"
      aria-labelledby="customized-dialog-title"
      open={props.open}
      maxWidth="md"
      fullWidth={true}
      disableEscapeKeyDown={true}
      onClose={(_event, reason) => {
        if (reason === "backdropClick") {
          return;
        }
        props.handleClose();
      }}
      classes={{
        paperFullWidth: classes.paperFullWidth,
      }}
    >
      {updateFilterConfigLoader && <LinearProgress />}
      <DialogContent
        dividers
        classes={{
          root: classes.dialogContentRoot,
        }}
      >
        <Typography classes={{ root: classes.moduleTitle }}>
          {props.configObj.name}
        </Typography>
        <ModuleConfig editTableConfig={props.selectedModuleConfigData} />
      </DialogContent>
      <DialogActions classes={{ root: classes.dialogActions }}>
        <>
          {" "}
          <Button
            disabled={updateFilterConfigLoader}
            color="primary"
            onClick={props.handleClose}
          >
            Cancel
          </Button>
          <Button
            autoFocus
            color="primary"
            variant="contained"
            onClick={update}
            disabled={updateFilterConfigLoader}
          >
            Update Filters
          </Button>
        </>
      </DialogActions>
    </Dialog>
  );
});
const ConfigurationsTable = (props) => {
  const globalClasses = globalStyles();
  const [isLoading, setLoadingStatus] = useState(false);
  const [selectedConfig, setselectedConfig] = useState("");
  const [open, setOpen] = useState(false);
  const [filterConfigsTableColumns, setfilterConfigsTableColumns] = useState(
    []
  );
  const [showDeleteConfirmModal, updateShowDeleteConfirmModal] = useState(
    false
  );
  const [currentConfigToDelete, updateCurrentConfigToDelete] = useState(null);
  const configTableRef = useRef(null);

  const handleClose = () => {
    props.resetFilterConfigSelections();
    setOpen(false);
  };

  const manualCallBack = async (body, pageIndex, params) => {
    const manualbody = {
      filters: body,
    };
    const response = await props.getFilterConfigsTableData(
      manualbody,
      pageIndex,
      10
    );
    return {
      totalCount: response.data.total,
      data: response.data.data,
    };
  };

  useEffect(() => {
    const fetchFilterConfigTableColumns = async () => {
      let cols = await getColumnsAg("table_name=filter_configurations")();
      cols = cols.map((col) => {
        if (col.column_name === "dimensions") {
          col.cellRenderer = (params) => {
            return (
              <>
                {params?.data?.dimensions.map((dimension) => {
                  return (
                    <Chip
                      size="medium"
                      color="primary"
                      style={{ padding: 10, fontSize: 12 }}
                      label={captializeStringIfCamelCase(
                        dynamicLabelsBasedOnTenant(dimension, "core")
                      )}
                    />
                  );
                })}
              </>
            );
          };
        }
        if (col.column_name === "applicable_modules") {
          col.accessor = "screens";
          col.field = "screens";
          col.cellRenderer = (params) => {
            const screens = params.data.screens.map((screen) =>
              screen?.replace(
                /product/gi,
                captializeStringIfCamelCase(
                  dynamicLabelsBasedOnTenant("product", "core")
                )
              )
            );
            return <>{screens.toString()}</>;
          };
        }
        if (col.column_name === "created_on") {
          col.accessor = "created_at";
          col.field = "created_at";
          col.cellRenderer = (params) => {
            return (
              <>{moment(params.data.created_at).format("MMM Do YY, hh:mm a")}</>
            );
          };
        }
        if (col.column_name === "name") {
          col.cellRenderer = (params) => {
            return (
              <Link
                component="button"
                variant="body2"
                onClick={() => {
                  setselectedConfig(params.data);
                  setOpen(true);
                }}
              >
                {params.data.name}
              </Link>
            );
          };
        }
        return col;
      });
      setfilterConfigsTableColumns(cols);
    };
    fetchFilterConfigTableColumns();
  }, []);

  const deleteFilterConfig = async (data) => {
    try {
      setLoadingStatus(true);
      await props.deleteFilterConfigById(data.data.fc_code);
      setLoadingStatus(false);
      props.addSnack({
        message: "Deleted filter configuration successfully",
        options: {
          variant: "success",
        },
      });
      configTableRef.current.api.refreshServerSideStore({ purge: true });
    } catch (error) {
      console.log(error);
      setLoadingStatus(false);
      props.addSnack({
        message: "Failed to delete the filter configuration",
        options: {
          variant: "error",
        },
      });
    }
  };
  return (
    <>
      <div
        id={props.id}
        className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
      >
        <Typography variant="h4">Configurations</Typography>
        <CreateFilter id={props.id} ref={configTableRef} />
      </div>
      <LoadingOverlay loader={isLoading} spinner>
        <Prompt
          isOpen={showDeleteConfirmModal}
          title="Confirm Delete"
          subHeading="Are you sure you want to delete the config ?"
          infoList={[]}
          primaryButtonProps={{
            children: "Yes", onClick: () => {
              deleteFilterConfig(currentConfigToDelete);
            updateCurrentConfigToDelete(null);
              updateShowDeleteConfirmModal(false)
            }
          }}
          tertiaryButtonProps={{
            children: "No",
            onClick: () => updateShowDeleteConfirmModal(false),
          }}
          variant="error"
        />
        {filterConfigsTableColumns.length > 0 && (
          <AgGrid
            sizeColumnsToFitFlag
            columns={filterConfigsTableColumns}
            manualCallBack={manualCallBack}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={10}
            uniqueRowId={"fc_code"}
            loadTableInstance={(gridInstance) => {
              configTableRef.current = gridInstance;
            }}
            callDeleteApi={(data) => {
              updateShowDeleteConfirmModal(true);
              updateCurrentConfigToDelete(data);
            }}
          />
        )}
        {open && (
          <EditModal
            ref={configTableRef}
            open={open}
            configObj={selectedConfig}
            createdConfigs={props.configs.data}
            page={props.configs.page}
            handleClose={handleClose}
            updateFilterConfig={props.updateFilterConfig}
            resetFilterConfigSelections={props.resetFilterConfigSelections}
            id={props.id}
            addSnack={props.addSnack}
            selectedModuleConfigData={props.selectedModuleConfigData}
            getFilterConfigsTableData={props.getFilterConfigsTableData}
            getFilterConfigById={props.getFilterConfigById}
            setModuleConfigData={props.setModuleConfigData}
            setEditConfigData={props.setEditConfigData}
            getFilteredFields={props.getFilteredFields}
            setFilteredFields={props.setFilteredFields}
            setMandatoryFieldsInScreen={props.setMandatoryFieldsInScreen}
          />
        )}
      </LoadingOverlay>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    createdConfigs: state.filterElementsReducer.createdConfigs,
    configs: state.filterElementsReducer.configs,
    selectedModuleConfigData:
      state.filterElementsReducer.selectedModuleConfigData,
  };
};
const mapActionsToProps = {
  updateFilterConfig,
  resetFilterConfigSelections,
  getFilterConfigsTableData,
  addSnack,
  getFilterConfigById,
  setModuleConfigData,
  setEditConfigData,
  getFilteredFields,
  setFilteredFields,
  setMandatoryFieldsInScreen,
  deleteFilterConfigById,
};
export default connect(mapStateToProps, mapActionsToProps)(ConfigurationsTable);
