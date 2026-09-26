import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { Button, Tabs, Modal } from "impact-ui-v3";
import { cloneDeep, isEmpty, isEqual } from "lodash";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import {
  appendExcelDownloadData,
  fetchFilterChipsToDownload,
  prependExtraData,
} from "core/Utils/agGrid/table-functions";
import Form from "core/Utils/form";
import {
  checkForSpecialCharacters,
  replaceSpecialCharacter,
} from "core/Utils/functions/utils";
import {
  getStyleColorDescriptionData,
  getStoreSizeContributionData,
  updateUserStoreContribution,
  setInitialUserStoreSizeContributionData,
  updateSetAllStoreSizeContribution,
  setInitialIAStoreSizeContributionTableData,
  updateIAStoreContribution,
} from "../../../services-inventorysmart/Product-Profile/product-profile-dashboard-service";
import {
  ERROR_MESSAGE,
  USER_RESERVE_PERCENTAGE_VALIDATION_MSG,
  NEGATIVE_VALUE_VALIDATION_MSG,
  UPDATED_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  NO_UPDATE,
  CREATE_PRODUCT_PROFILE_FORM,
  FILL_MANDATORY_FIELDS,
  PRODUCT_PROFILE_NAME_VALIDATION,
} from "../../../constants-inventorysmart/stringConstants";
import {
  scrollIntoView,
  isActionAllowedOnSubModule,
  reloadTable,
} from "../../inventorysmart-utility";
import Loader from "core/Utils/Loader/loader";

const StoreSizeContributionComponent = (props) => {
  const [storeSizeTabValue, setStoreSizeTabValue] = useState(0);
  const [
    storeSizeContributionColumns,
    setStoreSizeContributionColumns,
  ] = useState([]);
  const [storeSizeContributionData, setStoreSizeContributionData] = useState(
    []
  );
  const [penetrationColumns, setPenetrationColumns] = useState([]);
  const [penetrationData, setPenetrationData] = useState([]);
  const [styleColorDescColumns, setStyleColorDescColumns] = useState([]);
  const [styleColorDescData, setStyleColorDescData] = useState([]);
  const [
    downloadFormatChipsDependency,
    setDownloadFormatChipsDependency,
  ] = useState({});
  const [pinnedRow, setPinnedRow] = useState([]);
  const [pinnedRowUserCreated, setPinnedRowUserCreated] = useState([]);
  const [
    userStoreContributionUpdate,
    setUserStoreContributionUpdate,
  ] = useState([]);
  const [editableColumnNames, setEditableColumnNames] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [openDialogForSetAll, setOpenDialogForSetAll] = useState(false);
  const [
    storeSizeContributionSetAllForm,
    setStoreSizeContributionSetAllForm,
  ] = useState([]);
  const [
    storeSizeContributionEditableFields,
    setStoreSizeContributionEditableFields,
  ] = useState({});

  const [iaStoreContributionUpdate, setIAStoreContributionUpdate] = useState(
    []
  );
  const [
    openIAContributionEditsModal,
    setOpenIAContributionEditsModal,
  ] = useState(false);
  const [productProfileForm, setProductProfileForm] = useState({
    profileName: "",
    profileDescription: "",
  });
  const [
    editableIARecommendedColumnNames,
    setEditableIARecommendedColumnNames,
  ] = useState([]);
  const [childTableLoader, setChildTableLoader] = useState(false);

  const storeSizeTableRef = useRef();
  const userStoreContributionRef = useRef({});
  const userStoreContributionUpdateRef = useRef([]);
  const iaStoreContributionRef = useRef({});
  const productDescriptionRef = useRef({});
  const storeHeaderValue = props.dynamicLabels?.store
    ? props.dynamicLabels?.store
    : "Store";
  const iaStoreContributionUpdateRef = useRef([]);

  const globalClasses = globalStyles();
  const uniqueArticleKey = props.createPPTenantAttrs?.pp_unique_id || "article";

  // Determine which table context we're in
  const tableContext =
    props.tableContext ||
    (props.isIASavedAsUserCreated || props.showIASavedAsUserCreated
      ? "IA_EDITS"
      : "DETAILS");
  const isIAEditsTable = tableContext === "IA_EDITS";

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    setChildTableLoader(false);
  };

  // IA recommended store contribution table
  useEffect(() => {
    // For DG call store contribution api when store band changes
    if (props.tabState === 0 && props?.displayStoreBandView) {
      reloadTable(iaStoreContributionRef.current);
      fetchIAStoreContributionDetails();
    }
  }, [props?.storeBandData, props?.displayStoreBandView]);

  useEffect(() => {
    // For Carters call store contribution api when pp code changes
    if (props.tabState === 0 && !props?.displayStoreBandView) {
      reloadTable(iaStoreContributionRef.current);
      fetchIAStoreContributionDetails();
    }
    iaStoreContributionRef.current?.api?.resetRecentSearchChanges();
  }, [props?.selectedPPCode, props?.displayStoreBandView]);

  useEffect(() => {
    if (props.tabState === 1) {
      if (storeSizeTabValue === 0) {
        if (!isEmpty(props.selectedPPCode)) {
          reloadTable(userStoreContributionRef.current);
          setSelectedRecords([]); // reset set all
          closeSetAll();
          fetchUserStoreContributionDetails();
        }
      } else {
        (async () => {
          setChildTableLoader(true);
          try {
            reloadTable(productDescriptionRef.current);
            let styleColorColumnDef = [];
            styleColorColumnDef = await getColumnsAg(
              "table_name=product_profile_style_color_table"
            )();
            setStyleColorDescColumns(styleColorColumnDef);
            let response = await props.getStyleColorDescriptionData(
              props.selectedPPCode?.pp_code
            );
            setStyleColorDescData(response.data.data);
            setChildTableLoader(false);
            setPenetrationColumns([]);
            setPenetrationData([]);
            setUserStoreContributionUpdate([]);
            userStoreContributionUpdateRef.current = [];
            props.setInitialUserStoreSizeContributionData([]);
            if (response.data?.show_message) {
              displaySnackMessages(response.data?.message, "success");
            }
          } catch (e) {
            setStyleColorDescData([]);
            handleErrorMessage(e);
          }
        })();
      }
    }
    scrollIntoView(storeSizeTableRef);
  }, [storeSizeTabValue, props.selectedPPCode, tableContext]);

  useEffect(() => {
    if (!isEmpty(userStoreContributionUpdate))
      userStoreContributionUpdateRef.current = cloneDeep(
        userStoreContributionUpdate
      );
    else userStoreContributionUpdateRef.current = [];
  }, [userStoreContributionUpdate]);

  useEffect(() => {
    if (!isEmpty(iaStoreContributionUpdate))
      iaStoreContributionUpdateRef.current = cloneDeep(
        iaStoreContributionUpdate
      );
    else iaStoreContributionUpdateRef.current = [];
  }, [iaStoreContributionUpdate]);

  const fetchIAStoreContributionDetails = async () => {
    try {
      setChildTableLoader(true);
      // Resetting these states here as the user may perform edits on the table and then switch to another product profile without saving the edits (Spanx case)
      if (iaStoreContributionUpdate.length) {
        setIAStoreContributionUpdate([]);
      }
      if (editableIARecommendedColumnNames.length) {
        setEditableIARecommendedColumnNames([]);
      }
      let body = {
        pp_code: props.selectedPPCode?.pp_code,
        channel: props.selectedPPCode?.channel?.toString(),
        metrics: "sale",
        store_attributes: props.filterDependencies?.filters?.filter(
          (item) => item.dimension === "store"
        ),
        store_band: props?.storeBandData?.store_band,
      };
      let response = await props.getStoreSizeContributionData({
        body: body,
        screen: "ia",
      });
      let storeContributionResponse = response.data?.data;
      if (!isEmpty(storeContributionResponse)) {
        let storeSizeColDef = agGridColumnFormatter(
          storeContributionResponse?.columns
        );
        let hasEditAccess = enableIAEdit();
        if (!hasEditAccess && storeContributionResponse?.columns?.length > 0) {
          storeContributionResponse.columns?.forEach((item) => {
            if (item?.is_editable) {
              item.is_editable = false;
              item.sub_headers?.forEach((subCol) => {
                subCol.is_editable = false;
              });
            }
          });
        }
        storeSizeColDef?.forEach((item) => {
          if (item.column_name === "overall_proportion") {
            item.disabled = setCellsToBeDisabled;
          }
          if (
            !props.displayStoreBandView &&
            item.column_name === "product_profile_pen"
          ) {
            item?.children?.forEach((subCol) => {
              if (!props.displayStoreBandView) {
                setEditableIARecommendedColumnNames((prevState) => [
                  ...prevState,
                  subCol.column_name,
                ]);
              }
              subCol.disabled = setCellsToBeDisabled;
              addDecimalSizeValueSetter(subCol);
            });
          }
        });
        setStoreSizeContributionColumns(storeSizeColDef);
        let sortedRows = cloneDeep(storeContributionResponse?.data)?.sort(
          (a, b) => b.overall_proportion - a.overall_proportion
        );
        const index = sortedRows.findIndex((obj) => obj.store_name === "Total" || obj.store_code === "Total");
        if (index !== -1) {
          let toPin = sortedRows.splice(index, 1);
          setPinnedRow(toPin);
        }
        props.setInitialIAStoreSizeContributionTableData(cloneDeep(sortedRows));
        setStoreSizeContributionData(sortedRows);
        scrollIntoView(storeSizeTableRef);
      } else {
        props.setInitialIAStoreSizeContributionTableData([]);
        setStoreSizeContributionData([]);
        setStoreSizeContributionColumns([]);
      }
      resetRowUpdatedStates();
      setChildTableLoader(false);
      if (response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success");
      }
    } catch (e) {
      setStoreSizeContributionData([]);
      handleErrorMessage(e);
    }
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  const enableEdit = () => {
    let editEnabled = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_USER_CREATED_STORE_SIZE_CONTRIBUTION,
      "edit"
    );
    return editEnabled;
  };

  const enableIAEdit = () => {
    let editEnabled = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_IA_RECOMMENDED_STORE_SIZE_CONTRIBUTION,
      "edit"
    );
    return editEnabled;
  };

  const fetchUserStoreContributionDetails = async () => {
    try {
      setPenetrationData([]);
      reloadTable(userStoreContributionRef.current);
      setStyleColorDescColumns([]);
      setStyleColorDescData([]);
      userStoreContributionRef.current?.api?.resetRecentSearchChanges();
      setChildTableLoader(true);
      let body = {
        pp_code: props.selectedPPCode?.pp_code,
        channel: props.selectedPPCode?.channel?.toString(),
        metrics: "sale",
        store_attributes: props.filterDependencies?.filters?.filter(
          (item) => item.dimension === "store"
        ),
      };
      let hasEditAccess = enableEdit();
      let response = await props.getStoreSizeContributionData({
        body: body,
        screen: "user",
      });
      let storeContributionResponse = response.data?.data;
      if (!isEmpty(storeContributionResponse)) {
        // Override: make size and overall_proportion columns editable for user-created screen
        if (hasEditAccess && storeContributionResponse?.columns?.length > 0) {
          storeContributionResponse.columns?.forEach((item) => {
            if (item?.column_name === "product_profile_pen" || item?.column_name === "overall_proportion") {
              item.is_editable = true;
              item.sub_headers?.forEach((subCol) => {
                subCol.is_editable = true;
              });
            }
          });
        }
        if (!hasEditAccess && storeContributionResponse?.columns?.length > 0) {
          storeContributionResponse.columns?.forEach((item) => {
            if (item?.is_editable) {
              item.is_editable = false;
              item.sub_headers?.forEach((subCol) => {
                subCol.is_editable = false;
              });
            }
          });
        }
        let penetrationColDef = agGridColumnFormatter(
          storeContributionResponse?.columns
        );
        if (hasEditAccess) {
          let penetrationConfig = {
            accessor: "",
            field_type: "TextField",
            isDisabled: false,
            label: "",
            required: false,
            value_type: "number",
            no_negative_values: true,
          };
          let storeContributionConfig = [];
          let storeContributionFieldKeysToEdit = {};
          penetrationColDef?.forEach((item) => {
            if (item.column_name === "overall_proportion") {
              item.disabled = setCellsToBeDisabled;
            }
            // For carters we have edit enabled on penetration% col of all sizes, the header should be disabled in this case
            if (
              !props.displayStoreBandView &&
              item.column_name === "product_profile_pen"
            ) {
              item?.children?.forEach((subCol) => {
                storeContributionFieldKeysToEdit[subCol.column_name] = "";
                if (!props.displayStoreBandView) {
                  setEditableColumnNames((prevState) => [
                    ...prevState,
                    subCol.column_name,
                  ]);
                }
                subCol.disabled = setCellsToBeDisabled;
                addDecimalSizeValueSetter(subCol);
                let newObject = {
                  ...penetrationConfig,
                  accessor: subCol.column_name,
                  label: subCol.label,
                };
                storeContributionConfig.push(newObject);
              });
            }
          });
          setStoreSizeContributionSetAllForm(storeContributionConfig);
          setStoreSizeContributionEditableFields(
            storeContributionFieldKeysToEdit
          );
        }
        setPenetrationColumns(penetrationColDef);

        let sortedRows = cloneDeep(storeContributionResponse?.data)?.sort(
          (a, b) => b.overall_proportion - a.overall_proportion
        );
        const index = sortedRows.findIndex((obj) => obj.store_name === "Total" || obj.store_code === "Total");
        if (index !== -1) {
          let toPin = sortedRows.splice(index, 1);
          setPinnedRowUserCreated(toPin);
        }
        setPenetrationData(sortedRows);
        props.setInitialUserStoreSizeContributionData(cloneDeep(sortedRows));
      } else {
        setPenetrationData([]);
        setPenetrationColumns([]);
        props.setInitialUserStoreSizeContributionData([]);
        setStoreSizeContributionSetAllForm([]);
        setStoreSizeContributionEditableFields({});
      }
      resetRowUpdatedStates();
      setChildTableLoader(false);
      if (response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success");
      }
    } catch (e) {
      setPinnedRowUserCreated([]);
      setPenetrationData([]);
      props.setInitialUserStoreSizeContributionData([]);
      handleErrorMessage(e);
    }
  };

  const resetRowUpdatedStates = () => {
    setUserStoreContributionUpdate([]);
    userStoreContributionUpdateRef.current = [];
  };

  // Add valueSetter for decimal size columns so setDataValue uses bracket notation.
  const addDecimalSizeValueSetter = (colDef) => {
    if (colDef.column_name && colDef.column_name.toString().includes(".")) {
      colDef.valueSetter = (params) => {
        if (params.data) {
          params.data[params.colDef.field] = params.newValue;
        }
        return true;
      };
    }
  };

  const setCellsToBeDisabled = (row, _item) => {
    // disable editing on the header/Total row
    return row.store_name === "Total" || row.store_code === "Total" ? true : false;
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const handleChange = (_event, newValue) => {
    setStoreSizeTabValue(newValue);
  };

  const prependData = () => {
    if (!isEmpty(downloadFormatChipsDependency)) {
      let prependContentReq = prependExtraData(downloadFormatChipsDependency);
      return appendExcelDownloadData(prependContentReq);
    }
  };

  useEffect(() => {
    if (!isEmpty(props.filterDashboardConfiguration) && !isEmpty(props.selectedPPCode)) {
      let appliedFilterData = {};
      if (props.tabState === 0) {
        appliedFilterData =
          props.filterDashboardConfiguration[
            "productProfileDashboardFilterConfig"
          ]?.appliedFilterData;
      } else {
        appliedFilterData =
          props.filterDashboardConfiguration[
            "userProductProfileDashboardFilterConfig"
          ]?.appliedFilterData;
      }
      if (appliedFilterData?.dependencyData?.length) {
        let filterChips = fetchFilterChipsToDownload(
          appliedFilterData?.dependencyData
        );
        filterChips["profile"] = {
          value:
            props.tabState === 0
              ? replaceSpecialCharacter(props.selectedPPCode[uniqueArticleKey])
              : replaceSpecialCharacter(props.selectedPPCode?.name),
          type: "String",
        };
        setDownloadFormatChipsDependency(filterChips);
      }
    }
  }, [props.filterDashboardConfiguration, props.tabState, props.selectedPPCode]);

  const getRowStyle = (params) => {
    if (params.node.rowPinned) {
      return {
        fontWeight: "bold",
        background: "#FAFAFA",
        pointerEvents: "none",
      };
    }
  };

  const updateEditedRowState = (data, tableName) => {
    let cloneRefInstance =
      tableName === "IA"
        ? cloneDeep(iaStoreContributionUpdateRef.current)
        : cloneDeep(userStoreContributionUpdateRef.current);
    const existingIndex = cloneRefInstance.findIndex(
      (obj) => obj.store_code === data.store_code
    );
    if (existingIndex !== -1) {
      // Replace the existing object with the new object
      cloneRefInstance[existingIndex] = data;
      if (tableName === "IA") setIAStoreContributionUpdate(cloneRefInstance);
      else setUserStoreContributionUpdate(cloneRefInstance);
    } else {
      // Push the new object to the state
      if (tableName === "IA")
        setIAStoreContributionUpdate((prevState) => [...prevState, data]);
      else setUserStoreContributionUpdate((prevState) => [...prevState, data]);
    }
  };

  const onBlurIA = async (_e, data, column, isChanged, value, initialValue) => {
    callUpdateOnBlur(data, column, isChanged, value, initialValue, "IA");
  };

  const onBlur = async (_e, data, column, isChanged, value, initialValue) => {
    callUpdateOnBlur(data, column, isChanged, value, initialValue, "User");
  };

  const callUpdateOnBlur = (
    data,
    column,
    isChanged,
    value,
    initialValue,
    tableName
  ) => {
    if (isChanged && parseFloat(value) !== parseFloat(initialValue)) {
      if (parseFloat(value) > 100) {
        data[column.colId] = initialValue;
        displaySnackMessages(USER_RESERVE_PERCENTAGE_VALIDATION_MSG, "warning");
      } else if (parseFloat(value) < 0) {
        data[column.colId] = initialValue;
        displaySnackMessages(NEGATIVE_VALUE_VALIDATION_MSG, "warning");
      } else {
        data[column.colId] = value;
        updateEditedRowState(data, tableName);
      }
      // refresh the column cells
      if (tableName === "IA") {
        iaStoreContributionRef.current?.api?.refreshCells({
          columns: [column.colId],
        });
      } else {
        userStoreContributionRef.current?.api?.refreshCells({
          columns: [column.colId],
        });
      }
    }
  };

  const preparePayloadOnIARowEdit = () => {
    return iaStoreContributionUpdate.map((item) => {
      let originalSizeObj = {},
        newSizeObj = {};
      let originalStoreContributionRow = props.initialIAStoreSizeContributionTableData.find(
        (obj) => obj.store_code === item.store_code
      );
      if (!props.displayStoreBandView) {
        editableIARecommendedColumnNames.forEach((key) => {
          originalSizeObj[key] = (
            originalStoreContributionRow[key] / 100
          ).toFixed(9);
          newSizeObj[key] = (item[key] / 100).toFixed(9);
        });
        // compare all the keys within originalSizeObj and newSizeObj to see if any size column contribution has changed
        if (isEqual(originalSizeObj, newSizeObj)) {
          originalSizeObj = {};
          newSizeObj = {};
        }
      }

      return {
        store_code: item.store_code,
        original_overall_proportion: (
          originalStoreContributionRow.overall_proportion / 100
        ).toFixed(9),
        original_size_level_proportion: originalSizeObj,
        new_size_level_proportion: newSizeObj,
        new_overall_proportion:
          originalStoreContributionRow.overall_proportion ===
          parseFloat(item.overall_proportion)
            ? null
            : (parseFloat(item.overall_proportion) / 100).toFixed(9), // if overall_proportion value has not changed send null
      };
    });
  };

  /**
   * This is a function to format the payload for user size contribution table edits
   * @returns {object}
   */
  const preparePayloadOnEdit = () => {
    return userStoreContributionUpdate.map((item) => {
      let originalSizeObj = {},
        newSizeObj = {};
      let originalStoreContributionRow = props.initialUserStoreSizeContributionTableData.find(
        (obj) => obj.store_code === item.store_code
      );
      if (!props.displayStoreBandView) {
        editableColumnNames.forEach((key) => {
          originalSizeObj[key] = (
            originalStoreContributionRow[key] / 100
          ).toFixed(9);
          newSizeObj[key] = (item[key] / 100).toFixed(9);
        });
        // compare all the keys within originalSizeObj and newSizeObj to see if any size column contribution has changed
        if (isEqual(originalSizeObj, newSizeObj)) {
          originalSizeObj = {};
          newSizeObj = {};
        }
      }
      return {
        store_code: item.store_code,
        original_overall_proportion: (
          originalStoreContributionRow.overall_proportion / 100
        ).toFixed(9),
        original_size_level_proportion: originalSizeObj,
        new_size_level_proportion: newSizeObj,
        new_overall_proportion:
          originalStoreContributionRow.overall_proportion ===
          parseFloat(item.overall_proportion)
            ? null
            : (parseFloat(item.overall_proportion) / 100).toFixed(9), // if overall_proportion value has not changed send null
      };
    });
  };

  const saveUserCreatedStoreContributionPercentage = async () => {
    setChildTableLoader(true);
    try {
      let body = {
        pp_code: props.selectedPPCode?.pp_code,
        data: preparePayloadOnEdit(),
      };
      let response = await props.updateUserStoreContribution({
        body: body,
        screen: "user",
      });
      if (response.data.status) {
        // display success msg and reload the table by calling the API again
        if (response.data?.show_message)
          displaySnackMessages(response.data?.message, "success");
        else displaySnackMessages(UPDATED_MESSAGE, "success");
        setSelectedRecords([]);
        userStoreContributionRef.current?.api?.setCheckConfiguration([]);
        userStoreContributionRef.current?.api?.deselectAll();
        fetchUserStoreContributionDetails();
      } else setChildTableLoader(false);
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  const setUserStoreContributionTableInstance = (params) => {
    userStoreContributionRef.current = params;
  };

  const setIAStoreContributionTableInstance = (params) => {
    iaStoreContributionRef.current = params;
  };

  const setProductDescriptionTableInstance = (params) => {
    productDescriptionRef.current = params;
  };

  const onSelectionChanged = (event) => {
    let selections = event.api.getSelectedRows().map((item) => item);
    setSelectedRecords(selections);
  };

  const setAllReq = () => {
    // if the user has done row edits and then clicks on set all, discard row edits and disable the save edits button
    resetRowUpdatedStates();
    setOpenDialogForSetAll(true);
  };

  const closeSetAll = () => {
    setOpenDialogForSetAll(false);
    let resetEditableFields = Object.fromEntries(
      Object.entries(storeSizeContributionEditableFields).map(([key, val]) => [
        key,
        "",
      ])
    );
    setStoreSizeContributionEditableFields(resetEditableFields);
  };

  const handleChangeSisterStoreAttrs = (updatedFormData) => {
    setStoreSizeContributionEditableFields(updatedFormData);
  };

  const applyEditOnSelectedRows = async () => {
    if (
      Object.keys(storeSizeContributionEditableFields).every(
        (item) => storeSizeContributionEditableFields[item] === ""
      )
    ) {
      displaySnackMessages(NO_UPDATE, "warning");
    } else {
      try {
        setChildTableLoader(true);
        const newObject = {};
        Object.entries(storeSizeContributionEditableFields).forEach(
          ([key, value]) => {
            newObject[key] = parseFloat(value) / 100;
            newObject[key] = newObject[key].toFixed(9);
          }
        );
        const setAllBody = {
          pp_code: props.selectedPPCode?.pp_code,
          new_size_level_proportion: newObject,
          data: selectedRecords.map((item) => {
            let originalSizeObj = {};
            editableColumnNames.forEach((key) => {
              originalSizeObj[key] = (item[key] / 100).toFixed(9);
            });

            return {
              store_code: item.store_code,
              original_overall_proportion: item.overall_proportion,
              original_size_level_proportion: originalSizeObj,
            };
          }),
        };
        // close the modal to view the loader
        setOpenDialogForSetAll(false);
        let response = await props.updateSetAllStoreSizeContribution(
          setAllBody
        );
        if (response.data?.status || response.data?.show_message) {
          displaySnackMessages(response.data?.message, "success");
          closeSetAll();
          setSelectedRecords([]);
          userStoreContributionRef.current?.api?.setCheckConfiguration([]);
          userStoreContributionRef.current?.api?.deselectAll();
          fetchUserStoreContributionDetails();
        }
      } catch (e) {
        handleErrorMessage(e);
      }
    }
  };

  const saveIAStoreContributionPercentage = () => {
    setOpenIAContributionEditsModal(true);
  };

  const closeIAContributionEdit = () => {
    setOpenIAContributionEditsModal(false);
    setProductProfileForm({
      profileName: "",
      profileDescription: "",
    });
  };

  const saveIAContributionEdit = async () => {
    try {
      if (
        isEmpty(productProfileForm.profileName) ||
        isEmpty(productProfileForm.profileDescription)
      ) {
        displaySnackMessages(FILL_MANDATORY_FIELDS, "warning");
        return;
      } else if (
        !checkForSpecialCharacters(productProfileForm.profileName) ||
        !checkForSpecialCharacters(productProfileForm.profileDescription)
      ) {
        displaySnackMessages(PRODUCT_PROFILE_NAME_VALIDATION, "warning");
      } else {
        setChildTableLoader(true);
        let payload = {
          pp_code: props.selectedPPCode?.pp_code,
          data: preparePayloadOnIARowEdit(),
          filters: props.filterDependencies?.filters,
          other_attributes: [
            {
              attribute_name: "name",
              attribute_value: productProfileForm.profileName,
            },
            {
              attribute_name: "description",
              attribute_value: productProfileForm.profileDescription,
            },
          ],
        };
        let response = await props.updateIAStoreContribution(payload);
        if (response.data.status) {
          if (response.data?.show_message)
            displaySnackMessages(response.data?.message, "success");
          else displaySnackMessages(UPDATED_MESSAGE, "success");
          closeIAContributionEdit();
          fetchIAStoreContributionDetails();
        }
        setChildTableLoader(false);
      }
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  const handleChangeNewProductProfileDetails = (updatedFormData) => {
    setProductProfileForm(updatedFormData);
  };

  const renderTopRightOptions = () => {
    const options = [];
    if (userStoreContributionUpdate.length) {
      options.push(
        <Button
          size="large"
          type="default"
          variant="primary"
          onClick={saveUserCreatedStoreContributionPercentage}
        >
          Save Edits
        </Button>
      );
    }
    if (props.displayRowSelectionHeader) {
      options.unshift(
        <Button
          size="large"
          type="default"
          variant="tertiary"
          id="store-size-contribution-set-all"
          onClick={() => setAllReq()}
          disabled={!selectedRecords.length || !enableEdit()}
        >
          Set All
        </Button>
      );
    }
    return options.length ? options : null;
  };

  const renderTopRightOptionsSaveIA = () => {
    if (
      props.showIASavedAsUserCreated &&
      iaStoreContributionUpdate.length
    ) {
      return [
        <Button
          size="large"
          type="default"
          variant="primary"
          onClick={saveIAStoreContributionPercentage}
        >
          Save Edits
        </Button>,
      ];
    }
    return null;
  };

  const openIAEditSavePopUpModal = () => {
    return (
      <Modal
        onClose={() => setOpenIAContributionEditsModal(false)}
        onPrimaryButtonClick={() => saveIAContributionEdit()}
        onSecondaryButtonClick={() => closeIAContributionEdit()}
        primaryButtonLabel="Apply"
        secondaryButtonLabel="Cancel"
        size="small"
        title="Save as a new product profile"
        open={openIAContributionEditsModal}
      >
        <Form
          layout={"horizontal"}
          maxFieldsInRow={1}
          handleChange={handleChangeNewProductProfileDetails}
          fields={CREATE_PRODUCT_PROFILE_FORM}
          updateDefaultValue={false}
          defaultValues={productProfileForm}
          spacing={2}
        />
      </Modal>
    );
  };

  const openPopUpModal = () => {
    return (
      <Modal
        onClose={() => setOpenDialogForSetAll(false)}
        onPrimaryButtonClick={() => applyEditOnSelectedRows()}
        onSecondaryButtonClick={() => closeSetAll()}
        primaryButtonLabel="Apply"
        secondaryButtonLabel="Cancel"
        size="medium"
        title="Set All"
        open={openDialogForSetAll}
      >
        <Form
          layout={"horizontal"}
          maxFieldsInRow={1}
          handleChange={handleChangeSisterStoreAttrs}
          fields={storeSizeContributionSetAllForm}
          updateDefaultValue={false}
          defaultValues={storeSizeContributionEditableFields}
          fieldTypeWidthSpan={4}
          spacing={2}
        />
      </Modal>
    );
  };

  return (
    <div ref={storeSizeTableRef}>
      {props.tabState === 0 && (
        <Loader loader={childTableLoader} minHeight={160}>
          <AgGridComponent
            rowdata={storeSizeContributionData}
            columns={storeSizeContributionColumns}
            uniqueRowId={"store_code"}
            sizeColumnsToFitFlag
            downloadAsExcel={storeSizeContributionData?.length ? true : false}
            showDownloadTooltip={true}
            pagination={false}
            toPrependContent={props.excelDownloadMetaData}
            prependedContentDetails={prependData()}
            getRowStyle={getRowStyle}
            pinnedBottomRowData={props.hidePinnedRow ? [] : pinnedRow}
            loadTableInstance={setIAStoreContributionTableInstance}
            onBlur={onBlurIA}
            tableHeader={
              storeHeaderValue +
              " and size contributions: " +
              replaceSpecialCharacter(props.selectedPPCode[uniqueArticleKey])
            }
            topRightOptions={renderTopRightOptionsSaveIA()}
            closeButton={true}
            handleCloseButtonClick={() => {
              props.setPpSelectionState({
                ppInIAEditsTable: false,
                ppInDetailsTable: false,
              });
              if (props.displayStoreSizeInStoreBand) {
                props.setDisplayStoreSizeInStoreBand(false);
              } else {
                props.setSelectedPPCode(null);
                props.setDisplayStoreSizeContribution(false);
              }
            }}
          />
        </Loader>
      )}
      {props.tabState === 1 && (
        <div>
          <Tabs
            value={storeSizeTabValue}
            onChange={handleChange}
            aria-label="store-size-contribution-tabs"
            tabPanelStyle={{ paddingTop: "8px" }}
            tabNames={[
              { label: "Penetration", value: 0 },
              !props.hideProductDescView && {
                label: `${dynamicLabelsBasedOnTenant("article")} Description`,
                value: 1,
              },
            ]}
            tabPanels={[
              <div key="penetration-panel">
                <Loader loader={childTableLoader} minHeight={160}>
                  {penetrationData?.length > 0  && <AgGridComponent
                    rowdata={penetrationData}
                    columns={penetrationColumns}
                    uniqueRowId={"store_code"}
                    sizeColumnsToFitFlag
                    downloadAsExcel={penetrationData?.length ? true : false}
                    showDownloadTooltip={true}
                    pagination={false}
                    toPrependContent={props.excelDownloadMetaData}
                    prependedContentDetails={prependData()}
                    getRowStyle={getRowStyle}
                    pinnedBottomRowData={
                      props.hidePinnedRow ? [] : pinnedRowUserCreated
                    }
                    onBlur={onBlur}
                    loadTableInstance={setUserStoreContributionTableInstance}
                    selectAllHeaderComponent={props.displayRowSelectionHeader}
                    rowSelection={"multiple"}
                    onSelectionChanged={onSelectionChanged}
                    hideSelectCurrentPageRecords
                    isLoading={childTableLoader}
                    tableHeader={
                      storeHeaderValue +
                      " and size contributions: " +
                      replaceSpecialCharacter(props.selectedPPCode?.name)
                    }
                    topRightOptions={renderTopRightOptions()}
                    closeButton={true}
                    handleCloseButtonClick={() => {
                      props.setSelectedPPCode(null);
                      props.setDisplayStoreSizeContribution(false);
                      props.setPpSelectionState((prevState) => {
                        if (isIAEditsTable) {
                          return {
                            ...prevState,
                            ppInIAEditsTable: false,
                          };
                        } else {
                          return {
                            ...prevState,
                            ppInDetailsTable: false,
                          };
                        }
                      });
                    }}
                  />}
                </Loader>
              </div>,
              <div key="description-panel">
                <Loader loader={childTableLoader} minHeight={160}>
                  <AgGridComponent
                    rowdata={styleColorDescData}
                    columns={styleColorDescColumns}
                    uniqueRowId={props.uniqueArticleKey}
                    sizeColumnsToFitFlag
                    downloadAsExcel={styleColorDescData?.length ? true : false}
                    showDownloadTooltip={true}
                    toPrependContent={props.excelDownloadMetaData}
                    prependedContentDetails={prependData()}
                    loadTableInstance={setProductDescriptionTableInstance}
                    paginationPageSize={props.pageSize}
                    isLoading={childTableLoader}
                    tableHeader={
                      storeHeaderValue +
                      " and size contributions: " +
                      replaceSpecialCharacter(props.selectedPPCode?.name)
                    }
                    closeButton={true}
                    handleCloseButtonClick={() => {
                      props.setSelectedPPCode(null);
                      props.setDisplayStoreSizeContribution(false);
                      props.setPpSelectionState((prevState) => {
                        if (isIAEditsTable) {
                          return {
                            ...prevState,
                            ppInIAEditsTable: false,
                          };
                        } else {
                          return {
                            ...prevState,
                            ppInDetailsTable: false,
                          };
                        }
                      });
                    }}
                  />
                </Loader>
              </div>,
            ]}
          />
        </div>
      )}
      {openIAContributionEditsModal && openIAEditSavePopUpModal()}
      {openDialogForSetAll && openPopUpModal()}
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    initialUserStoreSizeContributionTableData:
      inventorysmartReducer.productProfileDashboardReducer
        .initialUserStoreSizeContributionTableData,
    dynamicLabels:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dynamicLabels,
    filterDashboardConfiguration: filterReducer.filterDashboardConfiguration,
    excelDownloadMetaData:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.excelDownloadMetaData,
    displayStoreBandView:
      inventorysmartReducer.productProfileDashboardReducer
        .productProfileModuleConfig?.ia_recommended_product_profile
        ?.displayStoreBandView,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.inventorysmart_page_count,
    displayRowSelectionHeader:
      inventorysmartReducer.productProfileDashboardReducer
        .productProfileModuleConfig?.ia_recommended_product_profile
        ?.displayRowSelectionHeader,
    initialIAStoreSizeContributionTableData:
      inventorysmartReducer.productProfileDashboardReducer
        .initialIAStoreSizeContributionTableData,
    showIASavedAsUserCreated:
      inventorysmartReducer.productProfileDashboardReducer
        .productProfileModuleConfig?.ia_recommended_product_profile
        ?.showIASavedAsUserCreated,
    hideProductDescView:
      inventorysmartReducer.productProfileDashboardReducer
        .productProfileModuleConfig?.ia_recommended_product_profile
        ?.hideProductDescView,
    hidePinnedRow:
      inventorysmartReducer.productProfileDashboardReducer
        .productProfileModuleConfig?.ia_recommended_product_profile
        ?.hidePinnedRowInCustomerGroup,
    createPPTenantAttrs:
      inventorysmartReducer.createProductProfileReducer
        ?.createProductProfileModuleConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    getStyleColorDescriptionData: (pp_code) =>
      dispatch(getStyleColorDescriptionData(pp_code)),
    getStoreSizeContributionData: (pp_code) =>
      dispatch(getStoreSizeContributionData(pp_code)),
    updateUserStoreContribution: (body) =>
      dispatch(updateUserStoreContribution(body)),
    setInitialUserStoreSizeContributionData: (body) =>
      dispatch(setInitialUserStoreSizeContributionData(body)),
    updateSetAllStoreSizeContribution: (body) =>
      dispatch(updateSetAllStoreSizeContribution(body)),
    setInitialIAStoreSizeContributionTableData: (body) =>
      dispatch(setInitialIAStoreSizeContributionTableData(body)),
    updateIAStoreContribution: (body) =>
      dispatch(updateIAStoreContribution(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreSizeContributionComponent);
