import React, { useEffect, useState, useRef } from "react";
import {
  Grid,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import Form from "core/Utils/form/index";
import CloseIcon from "@mui/icons-material/Close";
import { TIME_PERIOD_FORM_FIELDS, SET_ALL_FORM } from "./formConstants";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { Button, Prompt } from "impact-ui";
import Loader from "../../../Utils/Loader/loader";
import { getColumnsAg } from "core/actions/tableColumnActions";
import AgGridTable from "core/Utils/agGrid";
import SetAllMultiRow from "core/Utils/agGrid/setall-multirow-form"; //For SetAll Multi Row to add dates
import {
  modifyInlineEdits,
  viewStoreTierList,
  modifySetAll,
} from "../services-product-mapping/productMappingService";
import globalStyles from "core/Styles/globalStyles";
import { useDispatch } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import moment from "moment";
import makeStyles from "@mui/styles/makeStyles";
import { addSnack } from "core/actions/snackbarActions";
import { formatMomentDate } from "core/Utils/functions/utils";
import { dateValidationMessage } from "core/Utils/functions/helpers/validation-helpers";
import { hasRangeOverlap } from "./common-functions";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { fetchDynamicConfigFromTenantReducer } from "core/Utils/DynamicLabels";
import { isFilterAccessRestricted } from "core/commonComponents/coreComponentScreen/utils";

const useStyles = makeStyles({
  formRow: {
    alignItems: "end",
    marginBottom: "0.5rem",
  },
});

const ModifyMappings = (props) => {
  const [columns, setColumns] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedProductData, setSelectedProductData] = useState([]);
  const [currentEditId, setCurrentEditId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [formFields, setFormFields] = useState([]);
  const [showSetAll, setShowSetAll] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [formData, setFormData] = useState({});
  const [setAllCols, setSetAllCols] = useState({});
  const [showConfirmationDialogue, setShowConfirmationDialogue] = useState(
    false
  );
  const [setAllPopUpFields, setsetAllPopUpFields] = useState([]);
  const [isUnmapClicked, setIsUnmapClicked] = useState(false);
  const [isFilterHidden, setIsFilterHidden] = useState(true);
  const [confirmUnmap, setConfirmUnmap] = useState(false);
  const [metaPayload, setMetaPayload] = useState({});
  const isEditActionRestricted = useRef(false);
  const modifyTableRef = useRef();
  const dependencyRef = useRef();
  const editedTimePeriodRef = useRef({});
  const globalClasses = globalStyles();
  const classes = useStyles();
  const dispatch = useDispatch();

  useEffect(() => {
    getInitialData();
    let invScreenConfig = JSON.parse(
      localStorage.getItem("inventorysmartScreenConfig")
    );
    if (
      isEmpty(
        invScreenConfig?.inventorysmart_configuration?.drillDown?.hiddenFilter
      )
    ) {
      setIsFilterHidden(false);
      loadFilters();
    } else {
      dependencyRef.current = props.dependencyRef.current;
    }
    onFilter();

    // Cleanup function
    return () => {
      // Cleasnup for local states and references
      modifyTableRef.current = null;
      dependencyRef.current = null;
      resetEdits();
    };
  }, []);

  const displaySnackMessages = (message, variance) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
        },
      })
    );
  };

  /**
   * @function
   * @description Load excpetion filters using filter name
   */
  const loadFilters = async () => {
    const response = await fetchFilterFieldValues(
      "ps mapping modify rules",
      []
    );
    if (isEmpty(props.psModifyMappingRules)) {
      let filterConfigData = [
        {
          filterDashboardData: response,
          isCrossDimensionFilter: false,
          screen_name: "Inventorysmart Configurations",
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        "psModifyMappingRules",
        filterConfigData,
        "Inventorysmart Configurations"
      );
      dispatch(setFilterConfiguration(filterConfig));
    }
  };

  const getInitialData = async () => {
    let agGridcols = await getColumnsAg(
      `table_name=ps_mapping_modify_rules_map`
    )();
    let setAllColumns = await getColumnsAg(
      `table_name=ps_mapping_set_all_fields`
    )();
    prepareSetAllConfig(setAllColumns);
    agGridcols = agGridcols.map((column) => {
      if (column.type === "edit_icon") {
        column.cellRenderer = (params, extraProps) => {
          return (
            <div
              className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${globalClasses.h_100}`}
            >
              <Button
                variant="primary"
                id={`modify-time-period-${params.data.psa_name}`}
                size="small"
                onClick={() => onEdit(params.data.psa_name)}
                disabled={isEditActionRestricted.current}
              >
                Modify Time Period
              </Button>
            </div>
          );
        };
      }
      return column;
    });
    setColumns(agGridcols);
  };

  const prepareSetAllConfig = (configuration) => {
    let newConfg = {};
    const accessorList = [];
    if (!props.isSelectAll) {
      configuration.forEach((config, index) => {
        accessorList.push(config.column_name);
        if (!index) {
          newConfg = { ...config };
        }
      });
      const newAccessor = accessorList.join("~");
      const selectedData = props.selectedProducts.map((data) => {
        const newCol = accessorList.map((col) => data[col]).join("~");
        return {
          ...data,
          accessor: newAccessor,
          [newAccessor]: newCol,
        };
      });
      newConfg.accessor = newAccessor;
      newConfg.column_name = newAccessor;
      setSetAllCols(newConfg);
      setSelectedProductData(selectedData);
    }
  };

  const onFilter = async () => {
    try {
      modifyTableRef.current.api?.refreshServerSideStore({ purge: true });
      modifyTableRef.current.api?.deselectAll(true);
    } catch (error) {
      setShowLoader(false);
    }
  };

  const onFilterDashboardClick = (dependency) => {
    dependencyRef.current = dependency;
    const filterBasedAccessList = fetchDynamicConfigFromTenantReducer(
      "core",
      "mapping_no_edit_access"
    );
    isEditActionRestricted.current = isFilterAccessRestricted(filterBasedAccessList, dependency);
    onFilter();
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    setShowLoader(true);
    if (
      !Boolean(dependencyRef.current) ||
      dependencyRef.current?.length === 0
    ) {
      setShowLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
    try {
      const meta = {
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
      };
      const body = {
        filters: dependencyRef.current || [],
        ...meta,
      };
      setMetaPayload(meta);
      const resp = await viewStoreTierList(body);
      setShowLoader(false);
      return {
        data: resp.data.data,
        totalCount: resp.data.total,
      };
    } catch (error) {
      setShowLoader(false);
      displaySnackMessages("Something went wrong", "error");
      console.error(error);
    }
  };

  /**
   * @function
   * @description Handle selection changes and update local state
   * @param {Object} event
   */
  const onSelectionChanged = (event) => {
    const selectedRows = event.api.getSelectedRows();
    setSelectAll(Boolean(event.api?.isSelectAllRecords));
    setSelectedRows(selectedRows);
  };

  const onEdit = (id) => {
    setCurrentEditId(id);
    updateFormObject(false, id);
    setIsModalOpen(true);
  };

  const updateFormObject = (addNewField = false, currentEditId) => {
    const currentDataToEdit =
      currentEditId && editedTimePeriodRef.current?.[currentEditId]
        ? cloneDeep(editedTimePeriodRef.current?.[currentEditId])
        : [];
    const newFieldSet = cloneDeep(TIME_PERIOD_FORM_FIELDS);
    if (!addNewField && currentDataToEdit.length) {
      const newFormData = {};
      const newFormFields = [];
      currentDataToEdit.forEach((data, index) => {
        newFormData[index] = {
          start_date: data[0],
          end_date: data[1],
        };
        newFormFields.push({
          rowId: index,
          fields: newFieldSet,
        });
      });
      setFormData(newFormData);
      setFormFields(newFormFields);
    } else {
      const lastRowId = formFields.length
        ? formFields[formFields.length - 1].rowId
        : 0;
      const newRow = {
        rowId: lastRowId + 1,
        fields: newFieldSet,
      };
      setFormFields([...formFields, newRow]);
    }
  };

  const deleteFormRow = (rowId) => {
    setFormFields((prevState) =>
      prevState.filter((state) => state.rowId !== rowId)
    );
    setFormData((dataStates) => {
      let newDataObj = {};
      Object.keys(dataStates).forEach((state) => {
        if (state != rowId) {
          newDataObj[state] = dataStates[state];
        }
      });
      return newDataObj;
    });
  };

  const onCancel = () => {
    setIsModalOpen(false);
    setFormFields([]);
    setCurrentEditId(null);
    setFormData({});
  };

  const onApplySave = () => {
    const validFormData = updateFormData();
    if (validFormData) {
      onCancel();
    }
  };

  const updateFormData = () => {
    const updatedTimePeriod = getTimePeriodData();
    const hasConflicts = hasRangeOverlap(updatedTimePeriod);
    if (updatedTimePeriod && updatedTimePeriod.length && !hasConflicts) {
      const rowUpdate = {
        [currentEditId]: updatedTimePeriod,
      };
      editedTimePeriodRef.current = {
        ...editedTimePeriodRef.current,
        ...rowUpdate,
      };
      setCurrentEditId(null);
      return true;
    }
    if (!updatedTimePeriod) {
      displaySnackMessages("Please select valid dates", "error");
    }

    if (hasConflicts) {
      displaySnackMessages("Please reslove conflicting dates", "error");
    }
    return false;
  };

  const getTimePeriodData = () => {
    let hasValidDates = true;
    const validTimeobject = Object.keys(formData).map((key) => {
      let startDate = formatMomentDate(moment(formData[key].start_date));
      let endDate = formatMomentDate(moment(formData[key].end_date || ""));
      if (
        Object.keys(formData[key]).length === 1 ||
        startDate === "Invalid Date" ||
        endDate === "Invalid Date"
      ) {
        displaySnackMessages("Please select valid dates", "error");
        return [];
      }
      let validationMessage = dateValidationMessage(startDate, endDate);
      if (validationMessage.length === 0) {
        return [startDate, endDate];
      } else {
        hasValidDates = false;
        displaySnackMessages(validationMessage, "error");
        return [];
      }
    });
    if (hasValidDates) {
      return validTimeobject.filter((data) => data.length);
    }
    return false;
  };

  const handleChange = (data, id, rowId) => {
    const newFormObj = cloneDeep(formData);
    newFormObj[rowId] = {
      ...newFormObj[rowId],
      ...data,
    };
    setFormData(newFormObj);
  };

  const applyEdits = async () => {
    const rulesList = Object.keys(editedTimePeriodRef.current);
    if (!rulesList.length) {
      dispatch(displaySnackMessages("No changes to save.", "warning"));
    }
    try {
      const postBody = {
        ...(props.isSelectAll || selectAll ? props.dependency : {}),
        store_filters: !isFilterHidden
          ? { filters: dependencyRef.current, ...metaPayload }
          : { ...props.dependency.rule_filters },
        rule_codes: props.isSelectAll
          ? null
          : selectedProductData.map((prod) => prod.rule_code),
        rules_updated_list: rulesList.map((key) => {
          return {
            psa_name: key,
            validity: formatToDateString(editedTimePeriodRef.current[key]),
          };
        }),
      };
      const resp = await modifyInlineEdits(postBody);
      displaySnackMessages(
        resp.data?.message || "Applied changes successfully",
        "success"
      );
      resetEdits();
    } catch (error) {
      displaySnackMessages("Something went wrong", "error");
    }
  };

  const resetEdits = () => {
    onCancel();
    setSelectedRows([]);
    setShowSetAll(false);
    setSelectAll(false);
    editedTimePeriodRef.current = {};
    modifyTableRef.current?.api?.refreshServerSideStore({ purge: true });
  };

  const setAllChanges = async (formattedAttributes) => {
    let ruleList = [];
    if (props.isSelectAll) {
      Object.keys(formattedAttributes || {}).forEach(
        (key) =>
          key.split("_")[2] != undefined &&
          !ruleList.includes(key.split("_")[2]) &&
          ruleList.push(key.split("_")[2])
      );
    } else {
      ruleList = Object.keys(formattedAttributes).filter((attr, index) =>
        attr.includes(setAllCols.accessor.replace("_", ""))
      );
    }
    if (ruleList.length || props.isSelectAll) {
      let formattedDependency = {};
      let validDates = true;
      ruleList.forEach((key) => {
        let ruleIndex = props.isSelectAll ? key : key.split("_")[1];
        if (!isUnmapClicked) {
          (props.isSelectAll ? [key] : formattedAttributes[key]).forEach(
            (rule) => {
              const parsedStartDate = moment(
                formattedAttributes[`start_date_${ruleIndex}`],
                "YYYY-MM-DD",
                true
              );
              const parsedEndDate = moment(
                formattedAttributes[`end_date_${ruleIndex}`],
                "YYYY-MM-DD",
                true
              );
              validDates = parsedStartDate.isValid() && parsedEndDate.isValid();
              if (validDates) {
                formattedDependency[rule] = [
                  ...(formattedDependency[rule]
                    ? formattedDependency[rule]
                    : []),
                  [
                    formatMomentDate(
                      moment(formattedAttributes[`start_date_${ruleIndex}`])
                    ),
                    formatMomentDate(
                      moment(formattedAttributes[`end_date_${ruleIndex}`])
                    ),
                  ],
                ];
              }
            }
          );
        } else {
          formattedAttributes[key].forEach((rule) => {
            formattedDependency[rule] = null;
          });
        }
      });

      if (!validDates) {
        displaySnackMessages("Please enter valid dates.", "error");
        throw new Error("Please enter valid dates.");
      }
      if (props.isSelectAll) {
        let newDependency = [];
        Object.keys(formattedDependency).forEach(
          (key) =>
            (newDependency = [...newDependency, ...formattedDependency[key]])
        );
        formattedDependency = { isSetAll: newDependency };
      }
      const hasConflicts = isUnmapClicked
        ? false
        : Object.keys(formattedDependency).some((key) => {
            return hasRangeOverlap(formattedDependency[key]);
          });
      if (hasConflicts) {
        displaySnackMessages("Please resolve date conflicts.", "error");
        throw new Error("Please resolve date conflicts.");
      }
      try {
        let resp = {};
        const updatedList =
          isUnmapClicked && props.isSelectAll
            ? [
                {
                  rule_code: null,
                  validity: null,
                },
              ]
            : Object.keys(formattedDependency).map((key) => {
                return {
                  rule_code: props.isSelectAll
                    ? null
                    : selectedProductData.filter(
                        (item) => key === item[setAllCols.accessor]
                      )[0].rule_code,
                  validity: isUnmapClicked
                    ? null
                    : formatToDateString(formattedDependency[key]),
                };
              });
        const payload = {
          ...(props.isSelectAll || selectAll ? props.dependency : {}),
          store_filters: !isFilterHidden
            ? { filters: dependencyRef.current, ...metaPayload }
            : { ...props.dependency.rule_filters },
          psa_names: selectAll ? null : selectedRows.map((row) => row.psa_name),
          rules_updated_list: updatedList,
        };
        resp = await modifySetAll(payload);
        displaySnackMessages(
          resp.data?.message || "Applied changes successfully",
          "success"
        );
        resetEdits();
      } catch (error) {
        displaySnackMessages("Something went wrong", "error");
        throw new Error("Something went wrong");
      }
    } else {
      displaySnackMessages(`Please select ${setAllCols.label}`, "error");
      throw new Error(`Please select ${setAllCols.label}`);
    }
  };

  const formatToDateString = (timeperiods) => {
    return timeperiods?.map((subarray) =>
      subarray.map((dateObj) => formatMomentDate(moment(dateObj)))
    );
  };

  const getSetAllFormFields = (setAllFields, isUnmap = false) => {
    return [
      {
        fields: setAllFields.map((field) => {
          if (field.type === "DateTimeField") {
            field.disablePast = true;
          }
          if (field.column_name === "rulecode") {
            return {
              ...field,
              isMulti: true,
              column_name: setAllCols.column_name.replace("_", ""),
              accessor: setAllCols.accessor.replace("_", ""),
              label: setAllCols.label,
              options: selectedProductData.map((details) => ({
                label: details[setAllCols.accessor],
                value: details[setAllCols.accessor],
                id: details[setAllCols.accessor],
              })),
            };
          }
          return field;
        }),
        hideRowLabel: isUnmap,
        addRowLabel: "Add Date",
        id: setAllCols?.accessor?.replace("_", "") || "",
        rowCount: 0,
      },
    ];
  };

  const onSetAllBtnClick = (isUnmap = false) => {
    setIsUnmapClicked(false);
    if (isUnmap || props.isSelectAll) {
      if (props.isSelectAll && !isUnmap) {
        setsetAllPopUpFields(
          getSetAllFormFields(
            cloneDeep(SET_ALL_FORM).filter((col) =>
              ["start_date", "end_date"].includes(col.column_name)
            ),
            true
          )
        );
        setShowSetAll(true);
      } else if (!props.isSelectAll && isUnmap) {
        setIsUnmapClicked(true);
        setsetAllPopUpFields(
          getSetAllFormFields(
            cloneDeep(SET_ALL_FORM).filter(
              (col) => !["start_date", "end_date"].includes(col.column_name)
            ),
            true
          )
        );
        setShowSetAll(true);
      } else {
        setIsUnmapClicked(true);
        setConfirmUnmap(true);
      }
    } else {
      setsetAllPopUpFields(getSetAllFormFields(cloneDeep(SET_ALL_FORM)));
      setShowSetAll(true);
    }
  };

  const renderContent = () => {
    return (
      <>
        {!isFilterHidden && (
          <CoreComponentScreen
            showFilterDashboard={true}
            filterConfigKey={"psModifyMappingRules"}
            onApplyFilter={onFilterDashboardClick}
            hideNoDataFound={true}
          />
        )}
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignEnd} ${globalClasses.marginBottom}`}
        >
          <Button
            variant="primary"
            id="modifySetAll"
            onClick={() => onSetAllBtnClick(true)}
            disabled={!Boolean(selectedRows.length) || isEditActionRestricted.current}
          >
            Unmap Set All
          </Button>
          <Button
            variant="primary"
            id="modifySetAll"
            onClick={() => onSetAllBtnClick()}
            disabled={!Boolean(selectedRows.length) || isEditActionRestricted.current}
            className={`${globalClasses.marginLeft1rem}`}
          >
            Set All
          </Button>
        </div>
        <Loader loader={showLoader || columns.length === 0}>
          <AgGridTable
            columns={columns}
            selectAllHeaderComponent={true}
            sizeColumnsToFitFlag
            onGridChanged
            onRowSelected
            loadTableInstance={(instance) => {
              modifyTableRef.current = instance;
            }}
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params)
            }
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={10}
            uniqueRowId={"psa_name"}
            onSelectionChanged={onSelectionChanged}
            disableSelectionOnSelectAll={true}
          />
        </Loader>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${globalClasses.gap} ${globalClasses.marginTop}`}
        >
          <Button
            variant="secondary"
            id="applyEdits"
            onClick={() => {
              applyEdits();
            }}
            disabled={showLoader}
          >
            Save
          </Button>
          <Button
            variant="secondary"
            id="cancelEdit"
            onClick={() => {
              setShowConfirmationDialogue(true);
            }}
            disabled={
              !Boolean(Object.keys(editedTimePeriodRef.current)?.length) ||
              showLoader
            }
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            id="navigateBack"
            onClick={() => props.closeModify()}
          >
            Go Back
          </Button>
        </div>
        <Dialog
          onClose={() => onCancel()}
          className="setAllModal"
          maxWidth={"md"}
          aria-labelledby="customized-dialog-title"
          open={isModalOpen}
          fullWidth={true}
          disableEscapeKeyDown={true}
        >
          <DialogTitle id="edit-dialog-title">
            <Grid
              container
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              Edit Time Period
              <IconButton
                aria-label="close"
                onClick={() => onCancel()}
                size="large"
              >
                <CloseIcon />
              </IconButton>
            </Grid>
          </DialogTitle>
          <DialogContent>
            {formFields.map((fieldData, index) => {
              return (
                <div
                  className={`${globalClasses.flexRow} ${globalClasses.gap} ${classes.formRow}`}
                >
                  <Form
                    handleChange={(change, id) =>
                      handleChange(change, id, fieldData.rowId)
                    }
                    fields={fieldData.fields}
                    updateDefaultValue={false}
                    defaultValues={formData[fieldData.rowId] || {}}
                    layout={"vertical"}
                    maxFieldsInRow={2}
                    addOptionSet={true}
                  ></Form>
                  {index === formFields.length - 1 ? (
                    <Button
                      variant="primary"
                      id={`add-${fieldData.rowId}`}
                      onClick={() => updateFormObject(true)}
                      icon={AddIcon}
                    />
                  ) : (
                    <Button
                      variant="secondary"
                      id={`remove-${fieldData.rowId}`}
                      icon={DeleteIcon}
                      onClick={() => {
                        deleteFormRow(fieldData.rowId);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </DialogContent>
          <DialogActions>
            <Button
              variant="secondary"
              id="cancelEdit"
              onClick={() => {
                onCancel();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              id="saveEditedDates"
              disabled={isEmpty(formData)}
              onClick={() => onApplySave()}
            >
              Apply
            </Button>
          </DialogActions>
        </Dialog>
        {showSetAll && (
          <SetAllMultiRow
            updateDefaultValue={false}
            setDefaultDateFieldValues={true}
            onApply={setAllChanges}
            fieldList={setAllPopUpFields}
            handleModalClose={() => {
              setIsUnmapClicked(false);
              setShowSetAll(false);
            }}
          />
        )}
        {showConfirmationDialogue && (
          <Prompt
            isOpen={showConfirmationDialogue}
            title="Discard changes"
            subHeading="Are you sure you want to discard the changes?"
            infoList={[]}
            primaryButtonProps={{
              children: "Yes",
              onClick: () => {
                resetEdits();
                setShowConfirmationDialogue(false);
              },
            }}
            tertiaryButtonProps={{
              children: "No",
              onClick: () => setShowConfirmationDialogue(false),
            }}
            variant="error"
          />
        )}
        {confirmUnmap && (
          <Prompt
            isOpen={confirmUnmap}
            title="Unmap Selected SKU's"
            subHeading="Are you sure you want to unmap selected SKU's?"
            infoList={[]}
            primaryButtonProps={{
              children: "Yes",
              onClick: () => {
                setConfirmUnmap(false);
                setAllChanges();
                resetEdits();
              },
            }}
            tertiaryButtonProps={{
              children: "No",
              onClick: () => {
                setConfirmUnmap(false);
                setIsUnmapClicked(false);
              },
            }}
            variant="error"
          />
        )}
      </>
    );
  };

  return <React.Fragment>{renderContent()}</React.Fragment>;
};

export default ModifyMappings;
