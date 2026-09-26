import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import Form from "core/Utils/form";
import { Accordion, Alerts, Button, Input, Panel, Tag } from "impact-ui";
import {
  Checkbox,
  FormGroup,
  FormControlLabel,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { staticTableForm } from "./constant";
import makeStyles from "@mui/styles/makeStyles";
import DragAndDrop from "core/commonComponents/dragDrop";
import {
  cloneDeep,
  isArray,
  lowerCase,
  capitalize,
  uniqueId,
  isEmpty,
  startCase,
} from "lodash";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { setEnableTableHeaderEdit } from "./services-table-configurator";
import { hasCaseInsensitiveDuplicates } from "core/Utils/functions/utils";
import GroupedCarousel from "./groupedCarousels";
import PreviewTable from "./previewTable";

const useStyles = makeStyles((theme) => ({
  disableClose: {
    "& .alert": {
      width: "100%",
    },
    "& .alert-action-container": {
      display: "none",
    },
  },
  divider: {
    borderBottom: `1px solid ${theme.palette.text.disabled}`,
    padding: "1rem 0rem",
  },
  formGroupWrapper: {
    maxHeight: "24rem",
    overflow: "hidden",
    overflowY: "auto",
  },
  maxFormWidths: {
    maxWidth: `min(40rem, 70%)`,
  },
  sourceTags: {
    width: "66.66%",
    marginTop: "0.5rem",
    paddingInline: "1rem",
    marginLeft: "auto",
  },
  sourcesWrapper: {
    gap: "2rem",

    "&::after": {
      content: "' '",
      borderRight: `1px solid ${theme.palette.text.disabled}`,
      order: 2,
    },
  },
  sourcesAccordions: {
    height: "100%",
    paddingRight: "2rem",
    flexBasis: "40%",
  },
  sourcesGroups: {
    flexBasis: "60%",
    order: 3,
  },
  tagsWrapper: {
    flexWrap: "wrap",
    gap: "0.5rem",
  },
}));

const TableConfigurationForm = (props) => {
  const {
    allMappings,
    tcCode,
    tName,
    savedTableConfiguration = {},
    dimensions = [],
  } = {
    ...props,
  };
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [currentSourceMappings, setCurrentSourceMappings] = useState([]);
  const [formConfig, setFromConfig] = useState([]);
  const [warningShown, setWarningShown] = useState([]);
  const [formDependency, setFormDependency] = useState({});
  const [sourceAccordions, setSourceAccordions] = useState({});
  const [selectedSources, setSelectedSources] = useState([]);
  const [accordionState, setAccordionState] = useState({});
  const [selectedSourceCheck, setSelectedSourceCheck] = useState([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [groupedTags, setGroupedTags] = useState([]);
  const [columnsInReview, setColumnsInReview] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [dragDropTags, setDragDropTags] = useState([]);
  const [groupedColumns, setGroupedColumns] = useState([]);
  const [checkGroupColumns, setCheckedGroupColumns] = useState([]);
  const [currentGroupInEdit, setCurrentGroupInEdit] = useState({});
  const [tablePayloadConfiguration, setTablePayloadConfiguration] = useState(
    {}
  );

  useEffect(() => {
    initialSetup();
  }, []);

  useEffect(() => {
    updateGroupedColumns();
  }, [selectedSources]);

  useEffect(() => {
    const allColumns = groupedTags.map((group) => group.value);
    const newColumnsInReview = selectedSourceCheck.filter(
      (group) => !allColumns.includes(group.value)
    );
    setColumnsInReview(newColumnsInReview);
  }, [groupedTags, selectedSourceCheck]);

  useEffect(() => {
    setUpTableConfiguration();
  }, [formDependency, columnsInReview, groupedColumns]);

  useEffect(() => {
    if (props.getValidationFunc) {
      props.getValidationFunc(saveTableConfigurationChanges);
    }
  }, [tablePayloadConfiguration, warningShown]);

  useEffect(() => {
    setWarningShown(false);
  }, [tablePayloadConfiguration]);

  /**
   * @function
   * @description Update table payload on every updated call with the configs provided
   * @param {Object} config
   */
  const updateConfig = (config) => {
    let updatedTabelConfiguration = cloneDeep(tablePayloadConfiguration);
    let mappings = updatedTabelConfiguration?.mappings || [];
    const allColumns = [];
    mappings?.forEach((col, index) => {
      allColumns.push(col.label);
      if (col.column_name === config.column_name) {
        mappings[index] = {
          ...col,
          ...config,
        };
      }
    });
    updatedTabelConfiguration?.groups?.forEach((group, groupIndex) => {
      let groupedMappings =
        updatedTabelConfiguration?.groups[groupIndex].mappings;
      group.mappings.forEach((col, colIndex) => {
        allColumns.push(col.label);
        if (col.column_name === config.column_name) {
          groupedMappings[colIndex] = {
            ...col,
            ...config,
          };
        }
      });
    });

    if (hasCaseInsensitiveDuplicates(allColumns)) {
      displaySnackMessage(
        `Please select unique label name for ${config.column_name} column.`,
        "error"
      );
      return;
    }
    setTablePayloadConfiguration(updatedTabelConfiguration);
  };

  const displaySnackMessage = (message, variant) => {
    props.addSnack({
      message: message,
      options: {
        variant: variant,
      },
    });
  };

  /**
   * @function
   * @description Initial setup on form load
   */
  const initialSetup = () => {
    const formConfiguration = cloneDeep(staticTableForm);
    let sources = {};
    setCurrentSourceMappings(allMappings);
    allMappings.forEach((mappedOptions) => {
      const dimension = lowerCase(
        dimensions.includes(mappedOptions.dimension)
          ? mappedOptions.dimension
          : "custom"
      );
      
      if (sources[dimension]?.length) {
        sources[dimension].push({
          value: mappedOptions.column_name,
          label: mappedOptions.label,
          dimension: mappedOptions.dimension,
        });
      } else {
        sources[dimension] = [
          {
            value: mappedOptions.column_name,
            label: mappedOptions.label,
            dimension: mappedOptions.dimension,
          },
        ];
      }
    });

    formConfiguration.forEach((formObj) => {
      if (formObj.formAccessor === "selectSources") {
        formObj.form.forEach((config) => {
          if (config.accessor === "selectSources") {
            config.options = dimensions.map((source) => {
              return {
                label: capitalize(source),
                value: source,
              };
            });
          }
        });
      }
    });
    setSourceAccordions(sources);
    setFromConfig(formConfiguration);
    prepopulateSavedConfiguration();
  };

  /**
   * @function
   * @description Update all states for current table configuration if there are any saved configurations
   */
  const prepopulateSavedConfiguration = () => {
    const dependency = cloneDeep(formDependency);
    const allSources = [];
    const checkedAttributesFromSources = [];
    const savedGroupedColumns = [];
    const clonedConfig = cloneDeep(savedTableConfiguration);
    let allGroupedTags = [];
    clonedConfig.mappings?.forEach((col) => {
      if (!col.is_deleted && dimensions.includes(col.dimension)) {
        if (!allSources.includes(col.dimension)) {
          allSources.push(col.dimension);
        }
        checkedAttributesFromSources.push({
          value: col.column_name,
          sourceType: col.dimension,
          label: col.label,
        });
      }
    });
    const groupedConfig = clonedConfig.groups?.map((group) => {
      if (!group.is_deleted) {
        const selectedTags = [];
        group.mappings.forEach((col) => {
          if (dimensions.includes(col.dimension)) {
            if (!allSources.includes(col.dimension)) {
              allSources.push(col.dimension);
            }
            checkedAttributesFromSources.push({
              value: col.column_name,
              label: col.label,
              sourceType: col.dimension,
            });
            selectedTags.push({
              value: col.column_name,
              label: col.label,
              type: col.dimension,
              variant: "default",
            });
          }
        });
        allGroupedTags = [...allGroupedTags, ...selectedTags];
        savedGroupedColumns.push({
          groupName: group.label,
          groupId: uniqueId(group.label),
          colGroup: selectedTags,
        });

        return {
          column_name: group.column_name,
          is_deleted: false,
          label: group.groupName,
          dimension: group.dimension,
          mappings: group.mappings,
        };
      }

      return {
        column_name: group.column_name,
        is_deleted: true,
        label: group.groupName,
        dimension: group.dimension,
        mappings: group.mappings,
      };
    });
    dependency["nameForm"] = {
      nameForm:
        savedTableConfiguration.table_name ||
        startCase(tName.replaceAll("_", " ")),
    };
    dependency["selectSources"] = {
      selectSources: allSources,
    };

    let config = {
      table_name: tName,
      tc_code: tcCode,
      mappings: clonedConfig.mappings,
      groups: groupedConfig,
    };

    setTablePayloadConfiguration(config);
    setGroupedTags(allGroupedTags);
    setGroupedColumns(savedGroupedColumns);
    setSelectedSourceCheck(checkedAttributesFromSources);
    setSelectedSources(allSources);
    setFormDependency(dependency);
  };

  /**
   * @function
   * @description Fetch table configuration to setup table columns respective dimension
   */
  const setUpTableConfiguration = () => {
    const columnsMappings = columnsInReview.map((col) => col.value);
    let counter = 0;
    const mappings = [];
    const originalConfig = cloneDeep(tablePayloadConfiguration);

    [...currentSourceMappings].forEach((col) => {
      if (columnsMappings.includes(col.column_name)) {
        const filteredOriginal =
          originalConfig?.mappings?.filter(
            (filteredCol) => col.column_name === filteredCol.column_name
          ) || [];
        mappings.push({
          ...col,
          order_of_display: counter++,
          is_deleted: false,
          ...(filteredOriginal[0] || []),
        });
      }
    });

    const groupedCol = groupedColumns.map((group) => {
      const filteredGroup = originalConfig.groups?.filter(
        (prevGroup) => prevGroup.label === group.groupName
      );
      if (
        filteredGroup.length &&
        filteredGroup[0].mappings?.length === group.colGroup.length
      ) {
        return { ...filteredGroup[0] };
      }
      const groupedMappings = group.colGroup?.map((col) => col.value);
      const newGroupedColumns = [];
      [...currentSourceMappings].forEach((col) => {
        if (groupedMappings.includes(col.column_name)) {
          newGroupedColumns.push({
            ...col,
            order_of_display: counter++,
            is_deleted: false,
          });
        }
      });
      return {
        column_name: group.groupName.toLowerCase().replace(" ", "_"),
        is_deleted: false,
        label: group.groupName,
        dimension: "others",
        order_of_display: counter++,
        mappings: newGroupedColumns,
      };
    });
    let config = {
      table_name: tName,
      tc_code: tcCode,
      mappings: mappings,
      groups: groupedCol,
    };
    // Handle Table configuration on request
    setTablePayloadConfiguration(config);
  };

  /**
   * @function
   * @description Callback function for Validation and other functionalities
   */
  const saveTableConfigurationChanges = async () => {
    const isValid = isValidData();
    isValid && setWarningShown(false);
    return {
      isValid: isValid,
      data: tablePayloadConfiguration,
    };
  };

  /**
   * @function
   * @description
   * @returns {Boolean} Returns true/false depends on the table data
   */
  const isValidData = () => {
    let isValid =
      Boolean(columnsInReview.length) ||
      Boolean(groupedColumns.length) ||
      warningShown;
    // Handle form Validation here
    if (!isValid) {
      displaySnackMessage(
        `No options selected from sources in ${startCase(
          tName.replaceAll("_", " ")
        )} tab. Click Save agiain to proceed.`,
        "warning"
      );
      setWarningShown(true);
    }
    return isValid;
  };

  /**
   * @function
   * @description Handle static form changes on user input
   * @param {Object} deps
   */
  const handleChange = (deps) => {
    const key = Object.keys(deps)[0];
    const newFormDependency = { ...formDependency, [key]: { ...deps } };
    if (deps["selectSources"]) {
      setSelectedSources([...deps["selectSources"]]);
      setSelectedSourceCheck((prevState) =>
        prevState.filter((item) =>
          deps["selectSources"].includes(item.sourceType)
        )
      );
    }
    if (newFormDependency.hasOwnProperty("renameHeadersOptionForm")) {
      props.setEnableTableHeaderEdit(
        newFormDependency["renameHeadersOptionForm"][
          ["renameHeadersOptionForm"]
        ]
      );
    }
    setFormDependency(newFormDependency);
  };

  /**
   * @function
   * @description Update Grouped columns and grouped tags if any of the souces are unchecked
   */
  const updateGroupedColumns = () => {
    setGroupedTags((prevState) =>
      prevState.filter((item) => selectedSources.includes(item.tyoe))
    );
    setGroupedColumns((prevState) =>
      prevState.reduce((newGroupAcc, group) => {
        const cols = group.colGroup.filter((item) =>
          selectedSources.includes(item.type)
        );
        if (cols.length) {
          return [...newGroupAcc, { ...group, colGroup: cols }];
        }
        return newGroupAcc;
      }, [])
    );
  };

  /**
   * @function
   * @description Update source selection form dependency when tags are removed
   * @param {String} option
   * @param {String} accessor
   */
  const removeSelectedOption = (option, accessor) => {
    let newFormDependency = { ...formDependency };
    const updatedOptions = selectedSources.filter((item) => item != option);
    newFormDependency[accessor][accessor] = updatedOptions;
    setSelectedSourceCheck((prevState) =>
      prevState.filter((item) => item.sourceType !== option)
    );
    setSelectedSources(updatedOptions);
    setFormDependency(newFormDependency);
  };

  /**
   * @function
   * @description Show sources tags when sources are selected
   * @param {Array} selectedOptions
   * @param {String} accessor
   * @returns {ReactElement}
   */
  const renderTags = (selectedOptions, accessor) => {
    return (
      <div className={`${globalClasses.flexRow}`}>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.gap} ${classes.sourceTags}`}
        >
          {selectedOptions.map((option) => (
            <Tag
              isRemovable={true}
              onClose={() => removeSelectedOption(option, accessor)}
            >
              {capitalize(option)}
            </Tag>
          ))}
        </div>
      </div>
    );
  };

  /**
   * @function
   * @description Update tags when cols are selected in souce accordions
   * @param {Boolean} checked
   * @param {String} value
   * @param {String} source
   */
  const onSourceSelectionChanges = (checked, value, source, dimension) => {
    if (!checked) {
      setSelectedSourceCheck((prevState) => {
        return prevState.filter((item) => item.value !== value);
      });
    } else {
      const checkedAttr = currentSourceMappings.filter(
        (mapping) =>
          mapping.column_name === value && mapping.dimension === dimension
      );
      const label =
        checkedAttr?.[0]?.label ||
        checkedAttr?.[0]?.column_name.replace("_", " ");
      setSelectedSourceCheck([
        ...selectedSourceCheck,
        { value: value, label: label, sourceType: source, dimension },
      ]);
    }
  };

  /**
   * @function
   * @description Update state for drag and drop operation
   * Add tags from columnsInReview
   */
  const updateDragDropTags = (
    dragDropColumns = columnsInReview,
    selectedOptions = []
  ) => {
    const dragDropObj = [
      {
        type: "columns",
        label: `Note: You can add new columns by dragging and dropping it from the selected columns`,
        options: dragDropColumns.map((col) => {
          return {
            value: col.value,
            label: col.label,
            type: col.sourceType,
            variant: "default",
          };
        }),
      },
      {
        type: "selected_columns",
        options: selectedOptions.map((col) => {
          return {
            value: col.value,
            label: col.label,
            type: col.sourceType,
            variant: "default",
          };
        }),
      },
    ];
    setDragDropTags(dragDropObj);
  };

  /**
   * @function
   * @description Handle states on panel closed
   */
  const handlePanelClose = () => {
    if (!isEmpty(currentGroupInEdit)) {
      setGroupedColumns([...groupedColumns, currentGroupInEdit]);
      setGroupedTags([...groupedTags, ...selectedColumns]);
    }
    setGroupName("");
    setSelectedColumns([]);
    setCurrentGroupInEdit({});
    setIsPanelOpen(false);
  };

  /**
   * @function
   * @description Remove tags with particular col_id if in a particular groupId
   * @param {String} groupId
   * @param {String} col_id
   */
  const moveColumnToReview = (groupId, col_id) => {
    let updatedGroups = [...groupedColumns];
    let hasSingleValue = false;
    updatedGroups.forEach((group) => {
      if (group.groupId === groupId) {
        if (group.colGroup.length === 1) {
          hasSingleValue = groupId;
          deleteGroups(groupId);
          return false;
        }
        group.colGroup = group.colGroup.filter((col) => col.value != col_id);
      }
    });
    if (hasSingleValue) {
      return;
    }
    setGroupedTags((prevState) =>
      prevState.filter((col) => col.value !== col_id)
    );
    setGroupedColumns(updatedGroups);
  };

  /**
   * @function
   * @description Validate and save group once tags are dragged and drop
   */
  const saveNewGroup = () => {
    const groupedColumnLabels = groupedColumns.map((col) => col.groupName);
    if (hasCaseInsensitiveDuplicates([...groupedColumnLabels, groupName])) {
      displaySnackMessage(
        "Duplicate group name. Please use another group name.",
        "error"
      );
      return;
    }
    const newGroup = {
      groupName: groupName,
      groupId: uniqueId(groupName),
      colGroup: selectedColumns,
    };

    setGroupedTags([...groupedTags, ...selectedColumns]);
    setGroupedColumns([...groupedColumns, newGroup]);
    setCurrentGroupInEdit({});
    setSelectedColumns([]);
    setGroupName("");
    setIsPanelOpen(false);
  };

  /**
   * @function
   * @description Delete selected group and update attributes back to review columns
   * @param {String} groupID id assigned to every group
   */
  const deleteGroups = (groupID) => {
    let newGroups = [];
    if (groupID) {
      newGroups = [...groupedColumns].filter(
        (group) => !(groupID === group.groupId)
      );
    } else {
      newGroups = [...groupedColumns]?.filter(
        (group) => !checkGroupColumns.includes(group.groupId)
      );
    }
    const colValues = (
      [...groupedColumns]
        ?.filter(
          (group) =>
            checkGroupColumns.includes(group.groupId) ||
            groupID === group.groupId
        )
        .map((group) => group.colGroup) || []
    )
      .flat()
      .map((col) => col.value);
    setGroupedTags((prevState) =>
      prevState.filter((col) => !colValues.includes(col.value))
    );
    setGroupedColumns(newGroups);
    setCheckedGroupColumns([]);
  };

  /**
   * @function
   * @description Hanlde Edit Mode setup for the selected Group (checkGroupColumns)
   */
  const editGroup = () => {
    // Code for edit mode setup
    const groupID = checkGroupColumns[0];
    const groupToEdit = [];
    const selectedOptionValues = [];
    setGroupedColumns((prevState) => {
      return prevState.filter((group) => {
        if (group.groupId === groupID) {
          groupToEdit.push(group);
          return false;
        }
        return true;
      });
    });
    const selectedOptions = [
      ...groupToEdit[0]?.colGroup.map((item) => {
        selectedOptionValues.push(item.value);
        return { value: item.value, label: item.label, sourceType: item.type };
      }),
    ];
    updateDragDropTags(columnsInReview, selectedOptions);
    setSelectedColumns([...groupToEdit[0]?.colGroup]);
    setGroupedTags((prevState) =>
      prevState.filter((tag) => !selectedOptionValues.includes(tag.value))
    );
    setCurrentGroupInEdit(...groupToEdit);
    setGroupName(groupToEdit[0].groupName);
    setCheckedGroupColumns([]);
    setIsPanelOpen(true);
  };

  /**
   * @func
   * @description Render the static form with saved user data and cascaed dependencies
   * @returns {ReactElement} returns form
   */
  const renderForm = () => {
    return formConfig.map((config) => {
      return (
        <>
          <div className={classes.maxFormWidths}>
            <Form
              layout={"horizontal"}
              updateDefaultValue={false}
              maxFieldsInRow={1}
              handleChange={handleChange}
              fields={config.form}
              defaultValues={formDependency[config.formAccessor] || {}}
              fieldTypeWidthSpan={
                config.formAccessor === "renameHeadersOptionForm" ? 1 : false
              }
              labelWidthSpan={
                config.formAccessor === "renameHeadersOptionForm" ? 11 : false
              }
            />
            {config.showChips &&
              Boolean(
                formDependency[config.formAccessor]?.[config.formAccessor]
                  .length
              ) &&
              renderTags(
                formDependency[config.formAccessor]?.[config.formAccessor] ||
                  [],
                config.formAccessor
              )}
          </div>
          {config.hasDivider && (
            <div
              className={`${classes.divider} ${globalClasses.marginBottom}`}
            ></div>
          )}
        </>
      );
    });
  };

  return (
    <>
      {renderForm()}
      {Boolean(selectedSources.length) && (
        <div
          className={`${classes.sourcesWrapper} ${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.marginTop}`}
        >
          <div className={`${classes.sourcesAccordions}`}>
            {selectedSources.map((source, index) => {
              const selectedValues = selectedSourceCheck
                .filter((item) => item.sourceType === source)
                .map((item) => item.value);
              if (accordionState[source] === undefined) {
                setAccordionState({ ...accordionState, [source]: false });
              }
              return (
                <div
                  className={`${
                    selectedSources.length === index + 1
                      ? ""
                      : globalClasses.marginBottom
                  }`}
                >
                  <Accordion
                    label={capitalize(source)}
                    isExpanded={accordionState[source]}
                    onChange={() => {
                      setAccordionState({
                        ...accordionState,
                        [source]: !accordionState[source],
                      });
                    }}
                  >
                    <div className={`${classes.formGroupWrapper}`}>
                      <FormGroup>
                        {sourceAccordions[source]?.map((item) => {
                          return (
                            <FormControlLabel
                              onChange={(event) =>
                                onSourceSelectionChanges(
                                  event.target.checked,
                                  event.target.value,
                                  source,
                                  item.dimension
                                )
                              }
                              control={
                                <Checkbox
                                  checked={selectedValues.includes(item.value)}
                                  value={item.value}
                                />
                              }
                              label={item.label}
                            />
                          );
                        })}
                      </FormGroup>
                    </div>
                  </Accordion>
                </div>
              );
            })}
          </div>
          <div className={`${classes.sourcesGroups}`}>
            {Boolean(columnsInReview.length) && (
              <div className={globalClasses.marginBottom}>
                <Typography variant="h4" className={globalClasses.marginBottom}>
                  Review Selected Columns
                </Typography>
                <div
                  className={`${globalClasses.flexRow} ${globalClasses.marginBottom} ${classes.tagsWrapper}`}
                >
                  {columnsInReview.map((tag) => (
                    <Tag
                      isRemovable={true}
                      onClose={(_event) =>
                        onSourceSelectionChanges(
                          false,
                          tag.value,
                          tag.sourceType,
                          tag.dimension
                        )
                      }
                    >
                      {tag.label}
                    </Tag>
                  ))}
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => setSelectedSourceCheck([])}
                  >
                    Clear All
                  </Button>
                </div>
                <Alerts
                  variant="info"
                  message='Click the "Create Group" button to form groups from the chosen column'
                  className={classes.disableClose}
                />
              </div>
            )}
            {Boolean(groupedColumns.length) && (
              <>
                <div
                  className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.layoutAlignBetweenCenter}`}
                >
                  <Typography variant="h4">Groups</Typography>
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.gap}`}
                  >
                    {Boolean(checkGroupColumns.length) && (
                      <Button
                        icon={DeleteIcon}
                        variant="url"
                        onClick={() => deleteGroups()}
                      />
                    )}
                    {checkGroupColumns.length === 1 && (
                      <Button
                        icon={EditIcon}
                        variant="url"
                        onClick={editGroup}
                      />
                    )}
                  </div>
                </div>
                {Boolean(groupedColumns.length) &&
                  groupedColumns.map((group) => (
                    <GroupedCarousel
                      groupConfig={group}
                      onRemoveColumn={(col_id) =>
                        moveColumnToReview(group.groupId, col_id)
                      }
                      checkedList={checkGroupColumns}
                      handleGroupCheck={(checked, id) => {
                        if (checked) {
                          setCheckedGroupColumns([...checkGroupColumns, id]);
                        } else {
                          setCheckedGroupColumns((prevState) =>
                            prevState.filter((item) => item !== id)
                          );
                        }
                      }}
                    />
                  ))}
                <Alerts
                  className={`${globalClasses.marginTop} ${classes.disableClose}`}
                  variant="info"
                  message='Click the "Master Group" button to form master groups from the chosen group column'
                />
              </>
            )}
            <div
              className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.marginTop}`}
            >
              <Button
                variant="secondary"
                onClick={() => {
                  updateDragDropTags(), setIsPanelOpen(true);
                }}
                disabled={!columnsInReview.length}
              >
                Create Group
              </Button>
              {/* <Button
                variant="primary"
                onClick={() => {
                  createMasterGroup();
                }}
                disabled={!(checkGroupColumns.length > 1) || true}
              >
                Create Master Group
              </Button> */}
            </div>
            <div className={globalClasses.panelWrapper}>
              <Panel
                size="large"
                isOpen={isPanelOpen}
                onClose={() => handlePanelClose()}
                title="Create Group"
                primaryButtonProps={{
                  children: "Save Group",
                  disabled:
                    !Boolean(selectedColumns.length) ||
                    !Boolean(groupName.replace(" ", "").length),
                  onClick: () => {
                    saveNewGroup();
                  },
                }}
                tertiaryButtonProps={{
                  children: "Cancel",
                  onClick: () => handlePanelClose(),
                }}
              >
                <DragAndDrop
                  dependency={dragDropTags}
                  handleChange={({
                    allOptions,
                    primaryFileds,
                    _secondaryFields,
                  }) => setSelectedColumns(primaryFileds)}
                />
                <div
                  className={`${classes.divider} ${globalClasses.marginBottom}`}
                ></div>
                {Boolean(selectedColumns.length) && (
                  <Input
                    label="Name of the group"
                    placeholder="Enter group name"
                    helperText="Please enter group name"
                    onChange={(event) => setGroupName(event.target.value)}
                    value={groupName}
                  />
                )}
              </Panel>
            </div>
          </div>
        </div>
      )}
      {(Boolean(columnsInReview.length) || Boolean(groupedColumns.length)) && (
        <div className={globalClasses.marginTop}>
          <PreviewTable
            allMappings={currentSourceMappings}
            updateConfig={(config) => updateConfig(config)}
            tablePayloadConfiguration={cloneDeep(tablePayloadConfiguration)}
          />
        </div>
      )}
    </>
  );
};

TableConfigurationForm.propTypes = {
  // Madatory proptype will be added
};

const mapStateToProps = (state) => {
  return {};
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      addSnack,
      setEnableTableHeaderEdit,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TableConfigurationForm);
