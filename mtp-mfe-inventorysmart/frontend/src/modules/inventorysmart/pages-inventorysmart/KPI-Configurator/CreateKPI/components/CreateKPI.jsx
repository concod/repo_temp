import React, { useState, useRef, useEffect } from "react";
import { connect } from "react-redux";
import { Button } from "impact-ui-v3";
import { Grid } from "@mui/material";
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import FieldFunctionSelector from "./FieldFunctionSelector";
import FormulaCanvas from "./FormulaCanvas";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import DefineKPI from "./DefineKPI";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useNavigate } from "react-router-dom-v5-compat";
import { getFieldsList, setLoader, getModuleMappings, saveKPI, validateKPIName, getKPIDetails } from "../../../../services-inventorysmart/KPI-Configurator/create-kpi-service";
import { KPI_CONFIGURATOR } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "../../../../services-inventorysmart/common/inventory-smart-common-services";
import {
  canEditKpiSubModule,
  getKpiEnvironment,
} from "modules/inventorysmart/utils-inventorysmart/kpiConfigAccessControl";
import { INVENTORY_SUBMODULES_NAMES } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { fetchKpiModuleAccess } from "../../utils/fetchKpiModuleAccess";
import {
  mapApiFormulaComponentsToUi,
  deriveModuleMappingFromDetails,
  generateFormulaDisplay,
  buildFormulaComponents,
} from "../../utils/helperFunctions";
import EnterKPINamePanel from "./EnterKPINamePanel";
import { getCoreFiscalCalendar } from "core/actions/inventoryAction";
import { setFiscalCalendarData } from "../../../../services-inventorysmart/common/inventory-smart-common-services";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import moment from "moment";

const CreateKPI = (props) => {
  const globalClasses = globalStyles();
  const navigate = useNavigate();

  const kpiId = props?.match?.params?.kpi_id;
  const isEditMode = Boolean(kpiId);

  // Access control: direct KPI creation/editing is not allowed in PROD, and in
  // role-based tenants only authorized (POD) users may create/edit KPIs.
  const [accessChecked, setAccessChecked] = useState(false);
  const currentEnvironment = getKpiEnvironment();
  const canEdit = canEditKpiSubModule({
    inventorysmartModulesPermission: props.inventorysmartModulesPermission,
    inventorysmartScreenConfig: props.inventorysmartScreenConfig,
    subModuleName: INVENTORY_SUBMODULES_NAMES.INVENTORY_KPI_CUSTOM_KPIS,
    environment: currentEnvironment,
  });

  // State management - only for parent-level concerns
  const [editingComponent, setEditingComponent] = useState(null);
  const [showDefineKPI, setShowDefineKPI] = useState(!isEditMode);
  const formulaCanvasRef = useRef(null);

  // KPI Definition state
  const [kpiName, setKpiName] = useState("");
  const [kpiDescription, setKpiDescription] = useState("");

  // Formula and format state
  const [formulaComponents, setFormulaComponents] = useState([]);
  const [formatType, setFormatType] = useState("");
  const [decimalPlaces, setDecimalPlaces] = useState();
  const [aggregateFunction, setAggregateFunction] = useState("");

  // Module mapping state
  const [moduleMapping, setModuleMapping] = useState({});

  // Edit / prepopulate state
  const [kpiDetails, setKpiDetails] = useState(null);
  const didHydrateRef = useRef(false);
  const originalKpiStateRef = useRef(null);

  // Formula validation state
  const [formulaValidation, setFormulaValidation] = useState({ isValid: false, errors: [] });

  // Fields state
  const [fields, setFields] = useState([]);
  const [modules, setModules] = useState([]);
  const [saveKPILoader, setSaveKPILoader] = useState(false);
  const [loaderText, setLoaderText] = useState("");
  const [kpiDetailsLoader, setKpiDetailsLoader] = useState(false);

  const [showPanel, setShowPanel] = useState(false);

  // Resolve KPI edit access on mount (loads UAM permissions on direct navigation/refresh)
  useEffect(() => {
    const resolveAccess = async () => {
      if (
        currentEnvironment !== "PROD" &&
        props.inventorysmartScreenConfig?.roleBasedAccess
      ) {
        await fetchKpiModuleAccess({
          inventorysmartScreenConfig: props.inventorysmartScreenConfig,
          setInventorySmartModulesPermissions:
            props.setInventorySmartModulesPermissions,
          setInventorySmartPermissionLoader:
            props.setInventorySmartPermissionLoader,
        });
      }
      setAccessChecked(true);
    };
    if (props.inventorysmartScreenConfig !== undefined) {
      resolveAccess();
    }
  }, [props.inventorysmartScreenConfig]);

  // Redirect unauthorized users (read-only env or no edit permission) back to the list
  useEffect(() => {
    if (accessChecked && !canEdit) {
      displaySnackMessages(
        `KPI creation is not allowed in ${currentEnvironment}. KPIs are created in UAT by the POD team and synced to Production.`,
        "warning"
      );
      navigate(KPI_CONFIGURATOR);
    }
  }, [accessChecked, canEdit]);

  // Fetch fiscal calendar data on component mount
  useEffect(() => {
    const getFiscalCalendarData = async () => {
      try {
        const getFinancialCalendarData = await getCoreFiscalCalendar();
        props.setFiscalCalendarData(getFinancialCalendarData?.data?.data);
         moment.updateLocale("en", {
              week: {
                dow: getFinancialCalendarData?.data?.data?.week_start_day
                  ? getFinancialCalendarData?.data?.data?.week_start_day
                  : 0,
              },
            });
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error", props);
      }
    };
    getFiscalCalendarData();
  }, []);

  useEffect(() => {
    const loadKPIDetails = async () => {
      try {
        setLoaderText("Loading KPI Details...");
        setKpiDetailsLoader(true);
        const response = await props.getKPIDetails({ kpi_id: kpiId });

        const details = response?.data?.data;
        if (response?.data?.status && details) {
          setKpiDetails(details);

          // Store basic original values immediately (before state updates)
          // Formula and module mapping will be stored later in the hydration effect
          if (!originalKpiStateRef.current) {
            originalKpiStateRef.current = {
              kpiName: details.kpi_name || "",
              kpiDescription: details.kpi_description || "",
              formatType: details.display_format,
              decimalPlaces: details.display_precision !== undefined && details.display_precision !== null ? details.display_precision.toString() : null,
              aggregateFunction: details.aggregate_function,
              formulaComponents: null, // Will be set in hydration effect
              moduleMapping: null // Will be set in hydration effect
            };
          }

          // Move directly to edit screen and prefill basic KPI info
          setKpiName(details.kpi_name || "");
          setKpiDescription(details.kpi_description || "");

          // Optional prepopulation if API provides these fields
          if (details.display_format !== undefined && details.display_format !== null) {
            setFormatType(details.display_format);
          }
          if (details.display_precision !== undefined && details.display_precision !== null) {
            setDecimalPlaces(details.display_precision.toString());
          }
          if (details.aggregate_function !== undefined && details.aggregate_function !== null) {
            setAggregateFunction(details.aggregate_function);
          }
          // Allow hydration effects to run for this KPI id
          didHydrateRef.current = false;
        }
      } catch (error) {
        displaySnackMessages(
          error?.response?.data?.message || "Failed to load KPI details",
          "error"
        );
      } finally {
        setKpiDetailsLoader(false);
        setLoaderText("");
      }
    }
    isEditMode && loadKPIDetails();
  }, [props.match.params.kpi_id]);



  useEffect(() => {
    if (!kpiDetails) return;

    const apiFormula = kpiDetails.formula_components;
    const hasFunctionComponents = Array.isArray(apiFormula)
      ? apiFormula.some((c) => c?.component_type === "function")
      : false;

    // If formula includes functions, wait until fields are loaded so we can match field metadata.
    if (hasFunctionComponents && (!fields || fields.length === 0)) return;

    // Wait until module mappings are loaded if we need to derive mapping from module ids.
    if (kpiDetails.modules && (!modules || modules.length === 0) && !Array.isArray(kpiDetails.module_mapping)) return;

    if (didHydrateRef.current) return;

    const uiFormula = mapApiFormulaComponentsToUi(apiFormula, fields);
    setFormulaComponents(uiFormula);

    const derivedMapping = deriveModuleMappingFromDetails(kpiDetails, modules);
    setModuleMapping(derivedMapping || {});

    // Update original state with formula and module mapping (basic fields already set in loadKPIDetails)
    if (originalKpiStateRef.current) {
      originalKpiStateRef.current.formulaComponents = JSON.parse(JSON.stringify(uiFormula));
      originalKpiStateRef.current.moduleMapping = JSON.parse(JSON.stringify(derivedMapping || {}));
    }

    didHydrateRef.current = true;
  }, [kpiDetails, fields, modules]);

  // Handle adding component to canvas
  const handleAddToCanvas = (component, isUpdate = false, contextComponent = null) => {
    if (formulaCanvasRef.current && formulaCanvasRef.current.addComponent) {
      formulaCanvasRef.current.addComponent(component, isUpdate, contextComponent);

      // Clear editing state after successful add/update
      setEditingComponent(null);
      
    }
  };

  // Handle editing component
  const handleEditComponent = (component) => {
    setEditingComponent(component);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingComponent(null);
  };

  // Handle component update from FormulaCanvas
  const handleComponentUpdate = (canvasMethods) => {
    formulaCanvasRef.current = canvasMethods;
  };

  // Display snack messages
  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  // Fetch fields list
  const getFieldsData = async () => {
    try {
      props.setLoader({ name: "fieldsLoader", value: true });
      let l_response = await props.getFieldsList();
      if (l_response.data.status) {
        setFields(l_response.data.data);
      }
    } catch (e) {
      const errObj = e?.response?.data;
      if (errObj?.show_message)
        displaySnackMessages(errObj?.message, "error");
      else displaySnackMessages("Error fetching fields list", "error");
    } finally {
      // props.setLoader({ name: "fieldsLoader", value: false });
    }
  };

  const getModuleMappingsData = async () => {
    try {
      props.setLoader({ name: "moduleMappingLoader", value: true });
      let l_response = await props.getModuleMappings();
      if (l_response.data.status) {
        setModules(l_response.data.data);
      }
    } catch (e) {
      const errObj = e?.response?.data;
      if (errObj?.show_message)
        displaySnackMessages(errObj?.message, "error");
      else displaySnackMessages("Error fetching module mappings list", "error");
    } finally {
      props.setLoader({ name: "moduleMappingLoader", value: false });
    }
  };

  // Effect to fetch fields list on component mount
  useEffect(() => {
    if (!showDefineKPI) {
      getFieldsData();
      getModuleMappingsData()
    }
  }, [showDefineKPI]);

  const moveToCreateKPI = (formData) => {
    if (formData) {
      setKpiName(formData.kpiName);
      setKpiDescription(formData.description);
    }
    setShowDefineKPI(!showDefineKPI);
  };

  const paths = [
    {
      label: "Home",
      to: "/home",
    },
    {
      label: "KPI Configurator",
      to: "#",
    },
  ];

  /**
   * Build module mapping array for API payload
   * Transforms the moduleMapping state object into the API-expected format.
   * 
   * Used in:
   * - saveKPI function (line 296): Included in the API payload when saving a KPI
   * 
   * @returns {Array} Array of module mapping objects with module_id and components array
   */
  const buildModuleMapping = () => {
    const mappingArray = [];
    Object.entries(moduleMapping).forEach(([module, components]) => {
      if (components && components.length > 0) {
        mappingArray.push({
          module_id: module,
          components: components.map(comp => ({ component_id: comp }))
        });
      }
    });

    return mappingArray;
  };

  // Check if all format options are selected
  const areFormatOptionsSelected = () => {
    return formatType && decimalPlaces !== undefined && decimalPlaces !== null && aggregateFunction;
  };

  // Check if any changes were made in edit mode
  const hasChanges = () => {
    if (!isEditMode) return true; // In create mode, always allow save
    if (!originalKpiStateRef.current) {
      return false;
    }

    const original = originalKpiStateRef.current;

    // If formula or module mapping not yet loaded in original state, data still loading
    if (original.formulaComponents === null || original.moduleMapping === null) {
      return false;
    }
 
    const formulaChanged = JSON.stringify(formulaComponents) !== JSON.stringify(original.formulaComponents);
    const moduleMappingChanged = JSON.stringify(moduleMapping) !== JSON.stringify(original.moduleMapping);

    // Compare basic fields
    if (kpiName !== original.kpiName) return true;
    if (kpiDescription !== original.kpiDescription) return true;
    if (formatType !== original.formatType) return true;
    if (decimalPlaces !== original.decimalPlaces) return true;
    if (aggregateFunction !== original.aggregateFunction) return true;

    // Compare formula components
    if (formulaChanged) return true;

    // Compare module mapping
    if (moduleMappingChanged) return true;
    return false;
  };

  // Check if save button should be enabled
  const isSaveEnabled = () => {
    return (
      kpiName &&
      formulaComponents.length > 0 &&
      formulaValidation.isValid &&
      areFormatOptionsSelected()
    );
  };

  // Check if update button should be enabled (save enabled + changes made)
  const isUpdateEnabled = () => {
    return isSaveEnabled() && hasChanges();
  };

  const saveKPI = async (isEdit) => {
    try {
      const payload = {
        kpi_name: kpiName,
        kpi_description: kpiDescription,
        formula_display: generateFormulaDisplay(formulaComponents),
        formula_components: buildFormulaComponents(formulaComponents),
        display_format: formatType,
        display_precision: decimalPlaces,
        aggregate_function: aggregateFunction,
        module_mapping: buildModuleMapping()
      };
      if (isEdit) {
        payload.kpi_id = kpiId;
        if (kpiDetails?.kpi_name === kpiName) {
          delete payload.kpi_name;
        }
      }
      setLoaderText("Saving KPI...");
      setSaveKPILoader(true);
      const response = await props.saveKPI(payload);
      if (response.data.status) {
        const saveMessage = `KPI "${kpiName}" ${isEdit ? 'updated' : 'created'} successfully`
        displaySnackMessages(saveMessage, "success");
        setTimeout(() => {
          navigate(KPI_CONFIGURATOR); // Navigate to KPI list
        }, 2000);
      }
      else {
        displaySnackMessages(response.data?.message || "Error Saving KPI", "error");
      }
    } catch (e) {
      const errObj = e?.response?.data;
      if (errObj?.show_message)
        displaySnackMessages(errObj?.message, "error");
      else displaySnackMessages("Error saving KPI", "error");
    } finally {
      setSaveKPILoader(false);
    }
  };

  const handleCancel = () => {
    navigate(-1); // Navigate back to Custom KPIs
  };

  const validateKpiName = async (name) => {
    try {
      setLoaderText("Validating KPI name...");
      setSaveKPILoader(true);
      const response = await props.validateKPIName({ kpi_name: name });
      const isValid = response.data.status;
      const message = response?.data?.data?.show_message ? response.data?.data?.message : response?.data?.message;
      if (!isValid) {
        displaySnackMessages(message || "Error validating KPI name", "error");
      }
      return isValid;
    } catch (error) {
      const message = error?.response?.data?.data?.show_message ? error.response.data?.data?.message : error?.response?.data?.message;
      displaySnackMessages(message || "Error validating KPI name", "error");
      return false;
    } finally {
      setSaveKPILoader(false);
    }
  };

  const validateName = async (name, formData) => {
    try {
      if (isEditMode && name === kpiName) {
        moveToCreateKPI(formData);
        return true;
      }

      const isValid = await validateKpiName(name);
      if (isValid) {
        moveToCreateKPI(formData);
        return true;
      }
      else {
        return false;
      }
    } catch (e) {
      const errObj = e?.response?.data;
      if (errObj?.show_message)
        displaySnackMessages(errObj?.message, "error");
      else displaySnackMessages("Error validating KPI name", "error");
      return false;
    } finally {
      setSaveKPILoader(false);
    }
  };

  const saveNewKPI = async () => {
    try {
      // Perform validation first
      const isValid = await validateKpiName(kpiName);
      if (isValid) {
        setShowPanel(false);
        await saveKPI();
      }
    } catch (e) {
      const errObj = e?.response?.data;
      if (errObj?.show_message)
        displaySnackMessages(errObj?.message, "error");
      else displaySnackMessages("Error creating KPI", "error");
    }
  };

  return (
    <div className={`${globalClasses.paddingAround}`}>
      <div className={globalClasses.marginBottom}>
        <HeaderBreadCrumbs options={paths} />
      </div>
      <Loader
        loader={saveKPILoader || kpiDetailsLoader}
        text={loaderText}
      >
        {showDefineKPI ?
          <DefineKPI kpiName={kpiName} kpiDescription={kpiDescription} validateName={validateName} onCancel={handleCancel} /> :
          <>
            <div className={`${globalClasses.paddingAround} ${globalClasses.marginBottom} ${globalClasses.cardBg} common-border`}>
              <div className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.verticalAlignStart} ${globalClasses.fullWidth} create-kpi-main-container`}>
                {/* Left Panel - Field & Function Selector */}
                <div>
                  <Loader loader={props.fieldsLoader} text="Loading fields...">
                    <FieldFunctionSelector
                      onAddToCanvas={handleAddToCanvas}
                      editingComponent={editingComponent}
                      onCancelEdit={handleCancelEdit}
                      fields={fields}
                      setLoader={props.setLoader}
                      forecastDayLevel={props.forecastDayLevel}
                      fiscalCalendarData={props.fiscalCalendarData}
                    />
                  </Loader>
                </div>

                {/* Right Panel - Formula Canvas & Options */}
                <div className={globalClasses.flex}>
                  <FormulaCanvas
                    onEditComponent={handleEditComponent}
                    editingComponent={editingComponent}
                    onComponentUpdate={handleComponentUpdate}
                    formulaComponents={formulaComponents}
                    setFormulaComponents={setFormulaComponents}
                    kpiName={kpiName}
                    kpiDescription={kpiDescription}
                    formatType={formatType}
                    setFormatType={setFormatType}
                    decimalPlaces={decimalPlaces}
                    setDecimalPlaces={setDecimalPlaces}
                    aggregateFunction={aggregateFunction}
                    setAggregateFunction={setAggregateFunction}
                    moduleMapping={moduleMapping}
                    setModuleMapping={setModuleMapping}
                    formulaValidation={formulaValidation}
                    setFormulaValidation={setFormulaValidation}
                    modules={modules}
                    moduleMappingLoader={props.moduleMappingLoader}
                    isEditMode={isEditMode}
                  />
                </div>
              </div>
            </div>
            <Grid
              gap={2}
              className={`${globalClasses.stickyFooter}`}
            >
              <Button
                variant="outlined"
                icon={<NavigateBeforeIcon />}
                iconPlacement="left"
                onClick={() => moveToCreateKPI()}
              >
                Back to basic details
              </Button>
              <div className={`${globalClasses.flexRow} ${globalClasses.gapHalf}`}>
                <Button
                  variant="text"
                  onClick={() => navigate(KPI_CONFIGURATOR)}
                >
                  Cancel
                </Button>
                {isEditMode &&
                  <Button
                    variant="primary"
                    disabled={!isUpdateEnabled()}
                    onClick={() => saveKPI(true)}
                  >
                    Update KPI
                  </Button>
                }
                <Button
                  variant="primary"
                  disabled={!isSaveEnabled()}
                  icon={<NavigateNextIcon />}
                  iconPlacement="right"
                  onClick={() => isEditMode ? setShowPanel(true) : saveKPI()}
                >
                  Save As and Continue
                </Button>
              </div>
            </Grid>
          </>
        }
        <EnterKPINamePanel
          showPanel={showPanel}
          kpiName={kpiName}
          setKpiName={setKpiName}
          onSave={() => saveNewKPI()}
          closePanel={() => setShowPanel(false)}
          loading={saveKPILoader}
        />
      </Loader>
    </div>
  );
};

const mapStateToProps = (state) => ({
  fieldsLoader:
    state.inventorysmartReducer.inventorySmartCreateKpiService
      .fieldsLoader,
  moduleMappingLoader:
    state.inventorysmartReducer.inventorySmartCreateKpiService
      .moduleMappingLoader,
  forecastDayLevel: state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.forecastDayLevel,
  fiscalCalendarData:
    state.inventorysmartReducer?.inventorySmartCommonService
      ?.fiscalCalendarData,
  inventorysmartModulesPermission:
    state.inventorysmartReducer?.inventorySmartCommonService
      ?.inventorysmartModulesPermission,
  inventorysmartScreenConfig:
    state.inventorysmartReducer?.inventorySmartCommonService
      ?.inventorysmartScreenConfig,
});

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  setLoader: (payload) => dispatch(setLoader(payload)),
  getFieldsList: () => dispatch(getFieldsList()),
  getModuleMappings: () => dispatch(getModuleMappings()),
  saveKPI: (payload) => dispatch(saveKPI(payload)),
  validateKPIName: (payload) => dispatch(validateKPIName(payload)),
  getKPIDetails: (payload) => dispatch(getKPIDetails(payload)),
  setFiscalCalendarData: (payload) => dispatch(setFiscalCalendarData(payload)),
  setInventorySmartModulesPermissions: (payload) =>
    dispatch(setInventorySmartModulesPermissions(payload)),
  setInventorySmartPermissionLoader: (payload) =>
    dispatch(setInventorySmartPermissionLoader(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(CreateKPI);
