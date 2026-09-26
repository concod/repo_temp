import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useHistory } from "react-router";
import { CREATE_ALLOCATION } from "../../constants-inventorysmart/routesConstants";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "../../../../core/Styles/globalStyles";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
} from "../inventorysmart-utility";
import {
  ALERT,
  APP_NAME,
  CREATE_ALLOCATION_FORM,
  ERROR_MESSAGE,
  FULL_ACCESS_PERMISSIONS_LIST,
  INVALID_DRAFT,
  ROLES_ACCESS_MODULES_MAPPING,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import CreateAllocationStepper from "./components/CreateAllocationStepper";
import ArticlesTable from "./components/ArticlesTable";
import {
  resetCreateAllocationStoreState,
  setAllocationName,
  setCreateAllocationArticles,
  setFilteredSelection,
  setInventorysmartCreateAllocationFilterDependency,
  setInventorysmartFilterLoader,
  setIsFiltersValid,
  setMandatoryFilter,
  setNewStoreData,
  setPOCode,
  setPOName,
  setPopUpLinkFromDashbaord,
  setSelectedFilters,
  setShowInvalidDraftModal,
  setType,
  warmUpAllocation,
} from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import FinalizeAllocation from "../Finalize-Allocation";
import { setNotifications } from "core/actions/notificationActions";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import {
  Grid,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { cloneDeep, isEmpty } from "lodash";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import CloseIcon from "@mui/icons-material/Close";
import Form from "core/Utils/form";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";

const CreateNewAllocation = (props) => {
  const history = useHistory();
  const [filterDependency, setFilterDependency] = useState([]);
  const [openModal, setOpenModal] = useState(false);

  const classes = useStyles();
  const globalClasses = globalStyles();

  const activeStep = new URLSearchParams(window.location.search).get("step");
  const type = new URLSearchParams(window.location.search).get("type");
  const fromScreen = new URLSearchParams(window.location.search).get("from");

  //To know if user has been redirected to Create Allocation from different page
  const isRedirectedFromDifferentPage =
    type &&
    /* To modify later by maintaining objects of screens redirected from on backButtonClicked
       fromScreen === "ada" will be removed
    */
    (props?.createAllocationArticles?.length > 0 ||
      props.backButtonClicked ||
      fromScreen === "ada");

  const savedFiltersDependency =
    JSON.parse(localStorage.getItem("selectedFiltersDependency")) || [];
  const articles = JSON.parse(localStorage.getItem("selectedArticles")) || [];
  const poCode = JSON.parse(localStorage.getItem("po_code") || null);
  const poName = JSON.parse(localStorage.getItem("po_name") || null);
  const newStoreData = JSON.parse(localStorage.getItem("newStoreToCnaPayload") || null);
  const l_filteredSelection =
    JSON.parse(localStorage.getItem("filtered_selection")) || [];
  const l_popUpLinkFromDashboard = JSON.parse(
    localStorage.getItem("popupLink") || null
  );
  const l_type = JSON.parse(localStorage.getItem("type") || null);

  const onFilterDependency = useRef([]);

  //If the user has been redirected to Create Allocation from different page then use previous page's selected filters
  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [showInValidDraftModal, setShowInValidDraftModal] = useState(true);
  const [allocationForm, setAllocationForm] = useState({ allocationName: "" });

  const handleOnBlur = (event) => {
    props.setAllocationName(event.target.value);
  };
  const applyFilters = (filterValues, dependency) => {
    props.warmUpAllocation({}, props.isV3?.includes("warmupAllocation"));
    props.setInventorysmartCreateAllocationFilterDependency(dependency);

    const payload = filtersPayload(
      filterValues || filterData,
      dependency || props.inventorysmartCreateAllocationFilterDependency,
      true
    );
    props.setIsFiltersValid(payload.isValid);
    if (payload.isValid) {
      let l_mandatoryFilter = filters?.find((filter) => filter?.is_mandatory)
        ?.column_name;
      let l_selectedOption = payload.reqBody
        ?.filter((val) => val.attribute_name === l_mandatoryFilter)[0]
        .values[0].replaceAll(" ", "");
      props.setMandatoryFilter(l_selectedOption);
      let l_selectedFilters = payload.reqBody;
      if (props.inventorysmartScreenConfig?.defaultChannel) {
        l_selectedFilters = [
          ...l_selectedFilters,
          props.inventorysmartScreenConfig?.defaultChannel,
        ];
      }

      props.setSelectedFilters(l_selectedFilters);
    }
    setOpenModal(false);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    onFilterDependency.current = dependencyData;
    applyFilters(filterData, dependencyData);
  };

  const resetSelectedFilterValues = async () => {
    props.setInventorysmartCreateAllocationFilterDependency([]);
    applyFilters(filterData, []);
    setOpenModal(false);
  };

  const onCloseModalHandler = () => {
    setShowInValidDraftModal(true);
    props.setShowInvalidDraftModal(true);
  };

  const getFiltersOptions = async (selected, current) => {
    try {
      props.setInventorysmartFilterLoader(true);
      const selectedFilters = isRedirectedFromDifferentPage
        ? cloneDeep(props.inventorysmartCreateAllocationFilterDependency)
        : [];
      let requiredFilterObjParams = {
        allFilters: filters || [],
        appliedFilters: selectedFilters,
        current: current,
        rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);
      if (isEmpty(props.filterDashboardConfiguration)) {
        const filterConfigData = [
          {
            filterDashboardData: response,
            expectedFilterDimensions: getFilterDimensions(response),
            isCrossDimensionFilter: true,
            screen_name: props.screenName,
          },
        ];

        const filterConfig = formattedFilterConfiguration(
          "createAllocationFilterConfiguration",
          filterConfigData,
          "Create New Allocation",
          selectedFilters
        );

        if (isRedirectedFromDifferentPage) {
          const formattedSelectedFilters = formatSelectedFiltersData(
            filterConfigData,
            "Create New Allocation",
            selectedFilters
          );
          setFilterDependency(formattedSelectedFilters);
        }

        props.setFilterConfiguration(filterConfig);
      } else {
        onFilterDependency.current =
          props.filterDashboardConfiguration.appliedFilterData.dependencyData ||
          props.filterDependencyData;
      }

      if (isRedirectedFromDifferentPage) {
        onFilterDashboardClick(selectedFilters, response);
      }

      setFilterData(response);
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setInventorysmartFilterLoader(false);
    }
  };

  useEffect(() => {
    if (props.inventorysmartScreenConfig) {
      const fetchModulesAccess = async () => {
        try {
          props.setInventorySmartPermissionLoader(true);
          // props.module is fetched  from routes
          const moduleName = props?.module;
          const subModules = ROLES_ACCESS_MODULES_MAPPING[props?.module];

          let rolesBasedModulesPermission = {};

          // identifying if its for vb or signet
          if (props.inventorysmartScreenConfig.roleBasedAccess) {
            let accessDataResponse = await getModuleLevelAccessUtility({
              app: APP_NAME,
              module: subModules,
            })();
            rolesBasedModulesPermission = Object.fromEntries(
              Object.entries(accessDataResponse).map(([module, actions]) => [
                module,
                Object.keys(actions),
              ])
            );
          } else {
            subModules.map(async (subModule) => {
              rolesBasedModulesPermission[
                subModule
              ] = FULL_ACCESS_PERMISSIONS_LIST;
            });
          }
          props?.setInventorySmartModulesPermissions({
            [moduleName]: rolesBasedModulesPermission,
          });
        } catch (error) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setInventorySmartPermissionLoader(false);
        }
      };
      fetchModulesAccess();
    }
  }, [props.inventorysmartScreenConfig]);

  useEffect(() => {
    if (props.isNameMandatory) {
      CREATE_ALLOCATION_FORM.find(
        (formElement) => formElement.accessor === "allocationName"
      ).required = true;
    }
  }, [props.isNameMandatory]);

  useEffect(() => {
    if (!filters || filters?.length === 0) {
      return;
    }
    // isEmpty(props.filterDashboardConfiguration) &&
    getFiltersOptions(props.savedFilterSelection);
  }, [filters]);

  useEffect(() => {
    setAllocationForm({
      allocationName: props.draftResult.allocation_name,
    });
    props.setAllocationName(props.draftResult.allocation_name);
  }, [props.draftResult.allocation_name]);

  useEffect(() => {
    !props.showInvalidDraftModal &&
      setShowInValidDraftModal(props.showInvalidDraftModal);
  }, [props.showInvalidDraftModal]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        props.setInventorysmartFilterLoader(true);
        const response = await fetchFilterConfig("Allocation");

        // if (isEmpty(props.filterDashboardConfiguration)) {
        //   const filterConfigData = [
        //     {
        //       filterDashboardData: response,
        //       expectedFilterDimensions: ["store", "product"],
        //       isCrossDimensionFilter: true,
        //     },
        //   ];
        //   const filterConfig = formattedFilterConfiguration(
        //     "createAllocationFilterConfiguration",
        //     filterConfigData,
        //     "Create New Allocation"
        //   );
        //   props.setFilterConfiguration(filterConfig);
        // } else {
        //   onFilterDependency.current =
        //     props.filterDashboardConfiguration.appliedFilterData.dependencyData || props.filterDependencyData;
        // }

        setFilters(response);
      } catch (error) {
        props.setInventorysmartFilterLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    activeStep === "0" &&
      !isEmpty(props.inventorysmartModulesPermission[props.module]) &&
      fetchFilters();
  }, [activeStep, props.inventorysmartModulesPermission[props.module]]);

  useEffect(() => {
    if (props.backButtonClicked) {
      setFilters([]);
      setFilterData([]);
    }
  }, [props.backButtonClicked]);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const handlePlanNameChange = (updatedFormData) => {
    setAllocationForm(updatedFormData);
  };

  useEffect(() => {
    const selectedArticles =
      articles?.length > 0 ? articles : props.createAllocationArticles;
    const selectedFiltersDependency =
      savedFiltersDependency?.length > 0
        ? savedFiltersDependency
        : props.inventorysmartCreateAllocationFilterDependency;

    props.setInventorysmartCreateAllocationFilterDependency(
      selectedFiltersDependency
    );
    props.setCreateAllocationArticles(selectedArticles);
    props.setPOCode(poCode);
    props.setPOName(poName);
    props.setNewStoreData(newStoreData);
    props.setFilteredSelection(l_filteredSelection);
    props.setPopUpLinkFromDashbaord(l_popUpLinkFromDashboard);
    props.setType(l_type);
    localStorage.removeItem("selectedFiltersDependency");
    localStorage.removeItem("selectedArticles");
    localStorage.removeItem("po_code");
    localStorage.removeItem("po_name");
    localStorage.removeItem("filtered_selection");
    localStorage.removeItem("popupLink");
    localStorage.removeItem("type");
    localStorage.removeItem("newStoreToCnaPayload");

    // reset store state on unmount
    return () => {
      props.resetCreateAllocationStoreState([]);
    };
  }, []);

  return (
    <>
      <HeaderBreadCrumbs
        options={[
          {
            label: `${
              props?.redirectedFrom !== "viewPastAllocation"
                ? "Create New Allocation"
                : "Past Allocation"
            }`,
            id: 1,
            action: () => {
              history.push(CREATE_ALLOCATION);
            },
          },
        ]}
      ></HeaderBreadCrumbs>
      <div className={classes.stepperWrapper}>
        <CreateAllocationStepper activeStep={parseInt(activeStep)} />
      </div>
      {!showInValidDraftModal && (
        <Dialog
          onClose={() => onCloseModalHandler()}
          className={classes.root}
          maxWidth={"sm"}
          aria-labelledby="customized-dialog-title"
          open={true}
          fullWidth={true}
          disableEscapeKeyDown={true}
        >
          <DialogTitle id="customized-dialog-title">
            <Grid
              container
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h5" gutterBottom>
                {ALERT}
              </Typography>
              <IconButton
                aria-label="close"
                onClick={() => onCloseModalHandler()}
                size="large"
              >
                <CloseIcon />
              </IconButton>
            </Grid>
          </DialogTitle>
          <DialogContent>
            <div className={classes.contentBody}>{INVALID_DRAFT}</div>
          </DialogContent>
          <DialogActions
            classes={{
              root: classes.footer,
            }}
          >
            <Button
              onClick={() => {
                onCloseModalHandler();
              }}
              color="primary"
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      )}
      {activeStep === "0" ? (
        <>
          <div className={classes.textFieldWrapper}>
            <CustomAccordion label="Allocation Name" defaultExpanded={true}>
              <div className={classes.inputLabel}>
                <Form
                  layout={"vertical"}
                  maxFieldsInRow={1}
                  handleChange={handlePlanNameChange}
                  handleOnBlur={handleOnBlur}
                  fields={CREATE_ALLOCATION_FORM}
                  updateDefaultValue={false}
                  defaultValues={allocationForm}
                ></Form>
              </div>
            </CustomAccordion>
          </div>
          <CoreComponentScreen
            showPageRoute={false}
            showPageHeader={true}
            showFilterDashboard={true}
            showChipsOnLoad={isRedirectedFromDifferentPage}
            disableFilters={isRedirectedFromDifferentPage}
            filterDependency={filterDependency}
            filterConfigKey={"createAllocationFilterConfiguration"}
            onApplyFilter={onFilterDashboardClick}
            contained={true}
          />
            {props.isFiltersValid && (
              <div className={globalClasses.tableWrapper}>
                <CustomAccordion label="Details Table" defaultExpanded={true}>
                  <ArticlesTable
                    module={props.module}
                    // type={type}
                    isRedirectedFromDifferentPage={
                      isRedirectedFromDifferentPage
                    }
                  />
                </CustomAccordion>
              </div>
            )}
        </>
      ) : (
        <FinalizeAllocation />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartFilterLoader:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .inventorysmartFilterLoader,
    isFiltersValid:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .isFiltersValid,
    createAllocationArticles:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .createAllocationArticles,
    inventorysmartCreateAllocationFilterDependency:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .inventorysmartCreateAllocationFilterDependency,
    backButtonClicked:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .backButtonClicked,
    showInvalidDraftModal:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .showInvalidDraftModal,
    draftResult:
      store.inventorysmartReducer.inventorySmartCreateAllocationService
        .draftResult,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
    inventorySmartPermissionLoader:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorySmartPermissionLoader,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "createAllocationFilterConfiguration"
      ],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    isNameMandatory:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_create_allocation
        ?.isNameMandatory,
    isV3:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isV3,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    redirectedFrom:
      store.inventorysmartReducer.inventorySmartFinalizeProductViewService
        .redirectedFrom,
    filterDependencyData:
      store.inventorysmartReducer.inventorySmartDashboardService
        .filterDependencyData,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartFilterLoader: (payload) =>
    dispatch(setInventorysmartFilterLoader(payload)),
  setAllocationName: (payload) => dispatch(setAllocationName(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setNotifications: (payload) => dispatch(setNotifications(payload)),
  setMandatoryFilter: (payload) => dispatch(setMandatoryFilter(payload)),
  resetCreateAllocationStoreState: (payload) =>
    dispatch(resetCreateAllocationStoreState(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setInventorysmartCreateAllocationFilterDependency: (payload) =>
    dispatch(setInventorysmartCreateAllocationFilterDependency(payload)),
  setCreateAllocationArticles: (payload) =>
    dispatch(setCreateAllocationArticles(payload)),
  setShowInvalidDraftModal: (payload) =>
    dispatch(setShowInvalidDraftModal(payload)),
  setPOCode: (payload) => dispatch(setPOCode(payload)),
  setPOName: (payload) => dispatch(setPOName(payload)),
  setNewStoreData: (payload) => dispatch(setNewStoreData(payload)),
  setFilteredSelection: (payload) => dispatch(setFilteredSelection(payload)),
  setPopUpLinkFromDashbaord: (payload) =>
    dispatch(setPopUpLinkFromDashbaord(payload)),
  setType: (payload) => dispatch(setType(payload)),
  setInventorySmartPermissionLoader: (payload) =>
    dispatch(setInventorySmartPermissionLoader(payload)),
  setInventorySmartModulesPermissions: (payload) =>
    dispatch(setInventorySmartModulesPermissions(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  warmUpAllocation: (payload, isV3) =>
    dispatch(warmUpAllocation(payload, isV3)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateNewAllocation);
