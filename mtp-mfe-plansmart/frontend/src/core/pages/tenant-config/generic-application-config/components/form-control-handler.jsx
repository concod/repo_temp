import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import DialogAddNewField from "./dialog-add-new-field";
import {
  Checkbox,
  Grid,
  Typography,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  TextField,
  Paper,
  Button,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import _, { cloneDeep, toString } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import Select from "core/commonComponents/filters/Select/Select";
import SelectList from "core/Utils/select";
import AgGrid from "core/Utils/agGrid";
import CellRenderer from "core/Utils/agGrid/cellRenderer";
import { useRef } from "react";
import { appendPropertiesToTableInstance } from "core/Utils/agGrid/table-functions";
import PlansmartTenantConfig from "core/pages/tenant-config/application-configuration/PlansmartTenantConfig";
const useStyles = makeStyles((theme) => ({
  dateHeader: {
    width: theme.typography.pxToRem(190),
  },
  dateBody: {
    width: theme.typography.pxToRem(160),
    marginRight: "1rem",
  },
  divider: {
    borderBottom: `1px solid ${theme.palette.text.disabled}`,
    padding: "1rem 0rem",
  },
  inputLabel: {
    margin: "0.5rem 1rem 1rem 0",
    display: "inline-block",
  },
  dropDownLabelLight: {
    ...theme.typography.h5,
    fontWeight: "lighter",
    margin: "0.5rem 0 0.5rem ",
    display: "block",
  },
}));

/* TODO:
   1. Update the form as per the new incoming form input types
   2. Append control when no initial data is present
 */
const FormControlGenerator = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const [formData, setFormData] = useState(props.fields);
  const [showDialogue, setShowDialogue] = useState(false);
  const [dialogDataState, setDialogueDateState] = useState({});
  const [addDialogueType, setAddDialogueType] = useState(null);
  const tableInstance = useRef(null);

  useEffect(() => {
    if (props.fields) setFormData(props.fields);
  }, [props.fields]);

  useEffect(() => {
    if (tableInstance.current) {
      appendPropertiesToTableInstance(
        {
          formData: formData,
        },
        tableInstance
      );
    }
  }, [formData]);

  const setShowDialogueHandler = () => {
    setShowDialogue(true);
  };
  const setHideDialogueHandler = (inputLabelValue) => {
    if (inputLabelValue) {
      setDialogueDateState((state) => {
        handlerAppendFormData(inputLabelValue);

        return { ...state, inputLabelValue };
      });
    }
    setShowDialogue(false);
  };

  /**
   * Mutates the state of the form and append the form with the control and the label name provide via dialogue
   * @param -> field name
   * @return -> null
   */
  const handlerAppendFormData = (inputLabelValue) => {
    let formDataClone = [...formData];
    const newItemToBeAdded = inputLabelValue;
    const nestingLevel = dialogDataState.nestingLevel;
    if (newItemToBeAdded !== "" && newItemToBeAdded) {
      if (addDialogueType !== "DateField") {
        let createNewItem =
          formDataClone[nestingLevel[0]].settings[nestingLevel[1]].options[0];
        createNewItem = {
          ...createNewItem,
          key: newItemToBeAdded,
          label: newItemToBeAdded,
          value: newItemToBeAdded,
          active: false,
          disabled: false,
        };
        formDataClone[nestingLevel[0]].settings[nestingLevel[1]].options.splice(
          nestingLevel[2],
          0,
          createNewItem
        );
      } else if (addDialogueType === "DateField") {
        /** For date fields the 2 level settings needs to be appended rather than its option field.
         * As date is a grouped component
         */
        let createDateItem = formDataClone[nestingLevel[0]].settings[1];
        let createDateItemClone = _.cloneDeep(createDateItem);
        createDateItemClone.options[0] = {
          ...createDateItemClone.options[0],
          active: true,
          disabled: false,
          key: inputLabelValue,
          label: inputLabelValue,
          value: inputLabelValue,
        };
        createDateItemClone.options[1] = {
          ...createDateItemClone.options[1],
          value: null,
        };
        createDateItemClone.options[2] = {
          ...createDateItemClone.options[2],
          value: null,
        };

        formDataClone[nestingLevel[0]].settings.splice(
          -1,
          0,
          createDateItemClone
        );
      }
    }
  };

  /**
   * Function for handling changes to different type of input fields.
   * @e -> event type to get the type and value of the field once changed
   * @type  -> type of filed "checkbox", "radio" etc
   * @field -> for reference of option in case of multiple options like dropdown
   * @nestingLevel -> for finding the position of tag in the form
   */
  const handleChange = (e, type, field, nestingLevel, accessorId) => {
    let formDataClone = [...(tableInstance?.current?.api?.formData || [])];
    switch (type) {
      case "table":
        if (formDataClone.length)
          formDataClone[nestingLevel[0]].settings[
            nestingLevel[1]
          ].options[0].selectedRows = field.map((selectedRowsData) => {
            return {
              attribute_name:
                selectedRowsData?.attribute_name ||
                selectedRowsData?.configuration,
              attribute_value:
                selectedRowsData?.value || selectedRowsData?.parameter_value,
              [accessorId]: selectedRowsData?.[accessorId],
            };
          });
        break;

      case "DateTimeFieldContainer":
        formDataClone[nestingLevel[0]].settings[nestingLevel[1]].options[
          nestingLevel[2]
        ].value = e;
        break;

      case "checkbox":
        formDataClone[nestingLevel[0]].settings[nestingLevel[1]].options[
          nestingLevel[2]
        ].active = e.target.checked;
        break;

      case "radio":
        formDataClone[nestingLevel[0]].settings[
          nestingLevel[1]
        ].options.forEach((option) => {
          option.selected = false;
        });

        formDataClone[nestingLevel[0]].settings[nestingLevel[1]].options[
          nestingLevel[2]
        ].selected = e.target.checked;
        break;

      case "dropdown":
        formDataClone[nestingLevel[0]].settings[
          nestingLevel[1]
        ].defaultValue = e;
        break;

      case "list":
        formDataClone[nestingLevel[0]].settings[nestingLevel[1]].selected = e;
        break;

      case "input":
        formDataClone[nestingLevel[0]].settings[nestingLevel[1]].options[
          nestingLevel[2]
        ].value = e.target.value;
        break;

      case "button":
        setDialogueDateState((prevState) => {
          return { e, type, field, nestingLevel };
        });
        setShowDialogueHandler();
        break;
      default:
        break;
    }
    setFormData(formDataClone);

    //emit l0_name to cascade the dependent dropdowns
    if (type === "dropdown") {
      props.handleChange(formDataClone, field, nestingLevel);
    } else {
      props.handleChange(formDataClone);
    }
  };

  /**
   *
   * @param {object} params
   * @param {array} nestingLevel
   * When there are editable cells, if we make any changes to those cells. This function is triggered
   * as event callback with table params and nesting level array. We then update the tableData and pass
   * it to onTableCellUpdate function which will modify the screenConfig/props.fields data in the parent
   * component
   */
  const onCellValueChanged = (params, nestingLevel) => {
    const { value, rowIndex, oldValue, colDef } = params;
    if (oldValue !== value) {
      let tableData = cloneDeep([]);
      params.api.forEachNode((node) => {
        tableData.push(node.data);
      });
      tableData[rowIndex] = {
        ...tableData[rowIndex],
        [colDef.field]: toString(value),
      };
      props.onTableCellUpdate(tableData, nestingLevel);
    }
  };

  /**
   *
   * @param {aggrid Selection Event} event
   * @param {type : string} identifierType
   * @param {array} nestingLevel
   * @param {string} columnId
   * When row selection is changed, this function is triggered as event callback
   * Parameters passed are event properties which contain new row selections, type of the property
   * nesting level array in the screenConfig and column Id corresponding to which row selections are
   * made. We then pass all these parameters to handleChange function which updates the formData
   */
  const onSelectionChanged = (
    event,
    identifierType,
    nestingLevel,
    columnId
  ) => {
    const selectedRows = event.api.getSelectedRows();
    handleChange(
      selectedRows,
      identifierType,
      selectedRows,
      nestingLevel,
      columnId
    );
  };

  /**
   * Function for rendering form
   * @item  -> points to corresponding tag type
   * @typeIdentifierParent -> for reference of parent in case of grouped tags like radio
   * @nestingLevel -> for finding the position of tag in the form
   */
  const renderForm = (item, typeIdentifierParent, nestingLevel) => {
    let identifierType = item?.type ? item?.type : typeIdentifierParent.type,
      initialColumns = item.columns;

    let updatedColumn =
      initialColumns &&
      initialColumns.map((columnData) => {
        if (columnData?.Header) {
          columnData.headerName = columnData.Header;
        }
        if (columnData?.accessor) {
          columnData.field = columnData.accessor;
        }
        if (
          columnData?.is_editable &&
          (columnData?.type === "int" || columnData?.type === "str" || columnData?.type === "float")
        ) {
          //Return a cell rendered of editable input box in case of a int or str type
          return {
            ...columnData,
            cellRenderer: (params) => {
              return (
                <>
                  <CellRenderer cellData={params} column={columnData} />
                </>
              );
            },
          };
        }
        return columnData;
      });
    switch (identifierType) {
      case "table":
        return (
          <>
            <AgGrid
              rowdata={item.rows}
              columns={updatedColumn}
              uniqueRowId={item.columns[0].accessor}
              rowSelection={"multiple"}
              selectAllHeaderComponent={true}
              selectedRows={item.selectedRows.map(
                (row) => row[item.columns[0].accessor]
              )}
              loadTableInstance={(instance) =>
                (tableInstance.current = instance)
              }
              autoSizeColumnsFlag
              sizeColumnToFitFlag
              onSelectionChanged={(event) =>
                onSelectionChanged(
                  event,
                  identifierType,
                  [...nestingLevel],
                  item.columns[0].accessor
                )
              }
              onCellValueChanged={(params) =>
                onCellValueChanged(params, nestingLevel)
              }
            />
          </>
        );
      case "DateTimeFieldContainer":
        return (
          <>
            <Grid container>
              <Grid item sx={4}>
                <Typography variant="h4" className={classes.dateHeader}>
                  {typeIdentifierParent.label1}
                </Typography>
              </Grid>
              <Grid item sx={4}>
                <Typography variant="h4" className={classes.dateHeader}>
                  {typeIdentifierParent.label2}
                </Typography>
              </Grid>
              <Grid item sx={4}>
                <Typography variant="h4" className={classes.dateHeader}>
                  {typeIdentifierParent.label3}
                </Typography>
              </Grid>
            </Grid>
            <Grid container>
              <Grid item sx={4}>
                <h3 className={classes.dateBody}>{item[0]?.label}</h3>
              </Grid>
              <Grid item sx={4} className={classes.dateBody}>
                <LocalizationProvider dateAdapter={AdapterMoment}>
                  <DatePicker
                    disableToolbar
                    disabled={item[1].isDisabled}
                    variant="inline"
                    inputVariant="outlined"
                    inputFormat={props.tenantDateFormat}
                    className={classes.datePicker}
                    id="date-picker"
                    value={item[1]?.value || null}
                    renderInput={(props) => <TextField {...props} />}
                    onChange={(event) => {
                      handleChange(event, identifierType, item, [
                        ...nestingLevel,
                        1,
                      ]);
                    }}
                    keyboardIcon={<CalendarMonthIcon />}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item sx={4} className={classes.dateBody}>
                <LocalizationProvider dateAdapter={AdapterMoment}>
                  <DatePicker
                    disableToolbar
                    disabled={item[2].isDisabled}
                    variant="inline"
                    inputVariant="outlined"
                    inputFormat={props.tenantDateFormat}
                    className={classes.datePicker}
                    id="date-picker"
                    value={item[2].value || null}
                    onChange={(event) => {
                      handleChange(event, identifierType, item, [
                        ...nestingLevel,
                        2,
                      ]);
                    }}
                    renderInput={(props) => <TextField {...props} />}
                    keyboardIcon={<CalendarMonthIcon />}
                  />
                </LocalizationProvider>
              </Grid>
            </Grid>

            {item[3]?.type === "button" && (
              <Button
                variant="contained"
                id={item[3].key}
                color="primary"
                onClick={(event) => {
                  setAddDialogueType(() => {
                    return "DateField";
                  });
                  handleChange(event, "button", buttonDataParent, [
                    ...nestingLevel,
                  ]);
                }}
              >
                {item[3].label}
              </Button>
            )}
          </>
        );

      case "checkbox":
        return (
          <FormControlLabel
            value={item.value}
            control={<Checkbox color="primary" />}
            label={item.label}
            checked={item.active}
            disabled={item.disabled}
            onChange={(event) =>
              handleChange(event, item.type, item, nestingLevel)
            }
            labelPlacement={item.position ? item.position : "end"}
          />
        );
      case "input":
        return (
          <>
            <FormLabel className={classes.inputLabel}>{item.label}</FormLabel>
            <TextField
              id="outlined-select"
              value={item.value || ""}
              placeholder={item.placeHolder}
              onChange={(event) =>
                handleChange(event, item.type, item, nestingLevel)
              }
              variant="outlined"
              size="small"
            />
          </>
        );
      case "dropdown":
        const listOptions = item.options
          ? item.options.map((option) => {
              return {
                label: option.label || option.name,
                value: option.id,
              };
            })
          : [];
        return (
          <div style={{ width: `${item?.width}%` }}>
            {item.heading && (
              <Typography
                variant="h3"
                className={globalClasses.paddingVertical}
              >
                {item.heading || ""}
              </Typography>
            )}
            {item.headingType && (
              <Typography
                variant="h3"
                className={globalClasses.paddingVertical}
              >
                <span style={{ color: "transparent" }}>blank</span>
              </Typography>
            )}

            {item.inputLabel ? (
              <label
                className={classes.dropDownLabelLight}
              >{`${item.inputLabel}`}</label>
            ) : (
              <label className={classes.dropDownLabelLight}>
                <span style={{ color: "transparent" }}>blank</span>
              </label>
            )}
            <Select
              menuPosition={"fixed"}
              isDisabled={item.isDisabled ? true : false}
              name={item.accessor}
              isSearchable={item.isSearchable ? true : false}
              menuShouldBlockScroll={true}
              pagination={item.pagination}
              fetchOptions={item.fetchOptions}
              is_multiple_selection={item.isMulti ? true : false}
              dependency={[]}
              initialData={listOptions}
              selectedOptions={item.defaultValue || []}
              data-testid={`select${item.name}`}
              updateDependency={(key, option) =>
                handleChange(option, item.type, item.column_name, nestingLevel)
              }
              label={item.label}
              isClearable={item.isClearable ? true : false}
            />
          </div>
        );

      // list can be used in case of using MUI drop down instead of reactSelect
      case "list":
        const listDataParent = typeIdentifierParent;

        return (
          <div style={{ width: `${listDataParent?.width}%` }}>
            {listDataParent.inputLabel ? (
              <label
                className={classes.dropDownLabelLight}
              >{`${listDataParent.inputLabel}`}</label>
            ) : (
              <label className={classes.dropDownLabelLight}>
                <span style={{ color: "transparent" }}>blank</span>
              </label>
            )}
            <SelectList
              options={listDataParent.options}
              label={listDataParent.label}
              placeholder={listDataParent.placeholder}
              onChange={(event) =>
                handleChange(
                  event,
                  typeIdentifierParent.type,
                  listDataParent,
                  nestingLevel
                )
              }
              defaultValue={listDataParent?.selected || null}
              isSearchable={listDataParent?.isSearchable || false}
            />
          </div>
        );
      case "radio":
        const radioDataParent = item;
        return (
          <FormControl className="radio-form-control">
            <FormLabel id="radio-buttons-group-label">
              {typeIdentifierParent.radioLabel}
            </FormLabel>
            <RadioGroup
              aria-labelledby="radio-buttons-group-label"
              name="radio-buttons-group"
              row
            >
              {radioDataParent.map((radioData, indexRadio) => {
                return (
                  <FormControlLabel
                    value={radioData.key}
                    control={<Radio color="primary" />}
                    label={radioData.key}
                    disabled={radioData.disabled}
                    checked={radioData.selected}
                    onChange={(event) =>
                      handleChange(
                        event,
                        typeIdentifierParent.type,
                        radioDataParent,
                        [...nestingLevel, indexRadio]
                      )
                    }
                  />
                );
              })}
            </RadioGroup>
          </FormControl>
        );
      case "button":
        const buttonDataParent = typeIdentifierParent;

        return (
          <Button
            variant="contained"
            id={item.key}
            color="primary"
            onClick={(event) => {
              setAddDialogueType(() => {
                return "button";
              });
              handleChange(event, item.type, buttonDataParent, [
                ...nestingLevel,
              ]);
            }}
          >
            {item.label}
          </Button>
        );
      default:
        return null;
    }
  };

  const hideSaveButton = () => {
    if(props.applicationInfo.appType === "PlanSmart") { //save and cancel buttons on the screen is not required for plan smart since each setting's update is handled separately 
      return true
    }
    return false
  }

  const render = () => {
    return (
      <Paper>
        {props?.fields?.map((field, indexOutest) => {
          /**
           * Set the alignment of the parent(outermost) object/array.
           * If alignment is set as "row" then the count will be 12 -> content will occupy entire row
           * If not row the it will be divided in columns. maximum columns could be 4.
           * column-no-gap -> doesn't take width into consideration and place content side by side (auto width)
           * OR provide with from JSON as a key (see example in dropdown select)
           */
          let count = Math.ceil(12 / field?.settings.length);

          if (field.alignment === "row") {
            count = 12;
          } else if (field.alignment === "column-no-gap") {
            count = 0;
          }
          return (
            <div className={classes.divider}>
              <Grid key={indexOutest} container>
                <Grid item xs={12}>
                  {field.label && (
                    <Typography
                      variant="h3"
                      className={globalClasses.paddingHorizontal}
                    >
                      {field.label}
                    </Typography>
                  )}
                  {field.subHeading && (
                    <Typography
                      variant="h4"
                      className={globalClasses.paddingAround}
                    >
                      {field.subHeading}
                    </Typography>
                  )}
                </Grid>
              </Grid>
              <Grid container>
                {field.settings.map((setting, indexSettings) => {
                  let individualFieldAlignment = null;
                  /**
                   * Move the individual content to next line if the alignment type of item is row
                   */
                  if (setting?.alignment === "row") {
                    individualFieldAlignment = 12;
                  }
                  return (
                    <Grid
                      key={indexSettings}
                      xs={individualFieldAlignment || count}
                      item
                    >
                      {setting.label && (
                        <Typography
                          variant="h4"
                          className={globalClasses.paddingAround}
                        >
                          {setting.label}
                        </Typography>
                      )}

                      {setting.subHeading && (
                        <Typography
                          variant="h6"
                          className={globalClasses.paddingAround}
                        >
                          {setting.subHeading}
                        </Typography>
                      )}

                      {setting.type === "table" &&
                        setting.options.map((option, indexOptions) => {
                          let inputCount = Math.ceil(
                            12 / setting.options?.length
                          );

                          if (field.alignment === "row") {
                            inputCount = 12;
                          }
                          return (
                            <Grid
                              key={indexOptions}
                              item
                              sx={inputCount}
                              className={globalClasses.paddingAround}
                            >
                              {renderForm(option, setting.options, [
                                indexOutest,
                                indexSettings,
                                indexOptions,
                              ])}
                            </Grid>
                          );
                        })}

                      {setting.type === "DateTimeFieldContainer" && (
                        <Grid
                          item
                          sx={6}
                          className={globalClasses.paddingAround}
                        >
                          {renderForm(setting.options, setting, [
                            indexOutest,
                            indexSettings,
                          ])}
                        </Grid>
                      )}

                      {(setting.type === "radio" ||
                        setting.type === "list") && (
                        <Grid
                          item
                          sx={12}
                          className={globalClasses.paddingHorizontal}
                        >
                          {renderForm(setting.options, setting, [
                            indexOutest,
                            indexSettings,
                          ])}
                        </Grid>
                      )}
                      {setting.type === "dropdown" && (
                        <Grid
                          item
                          sx={12}
                          className={globalClasses.paddingAround}
                        >
                          {renderForm(setting, setting, [
                            indexOutest,
                            indexSettings,
                          ])}
                        </Grid>
                      )}
                      {setting.type === "checkbox" &&
                        setting.options.map((option, indexOptions) => {
                          return (
                            <Grid
                              key={indexOptions}
                              item
                              sx={12}
                              className={globalClasses.paddingHorizontal}
                            >
                              {renderForm(option, setting.options, [
                                indexOutest,
                                indexSettings,
                                indexOptions,
                              ])}
                            </Grid>
                          );
                        })}

                      <Grid container>
                        {setting.type === "input" &&
                          setting.options.map((option, indexOptions) => {
                            let inputCount = Math.ceil(
                              12 / setting.options?.length
                            );

                            if (field.alignment === "row") {
                              inputCount = 12;
                            }
                            return (
                              <Grid
                                key={indexOptions}
                                item
                                sx={inputCount}
                                className={globalClasses.paddingAround}
                              >
                                {renderForm(option, setting.options, [
                                  indexOutest,
                                  indexSettings,
                                  indexOptions,
                                ])}
                              </Grid>
                            );
                          })}
                      </Grid>
                    </Grid>
                  );
                })}
              </Grid>
            </div>
          );
        })}
        {props.applicationInfo.appType === "PlanSmart" && (
          <PlansmartTenantConfig />
        )}
        {!hideSaveButton() && props?.fields.length > 0 && (
          <Grid container direction="row" justifyContent="center" spacing={2}>
            <Grid item sx={4}>
              <Button
                variant="contained"
                color="primary"
                className={globalClasses.marginAround}
                onClick={() => {
                  props.onSaveHandler();
                }}
              >
                Save
              </Button>
            </Grid>
            <Grid item sx={4}>
              <Button variant="outlined" className={globalClasses.marginAround}>
                Cancel
              </Button>
            </Grid>
          </Grid>
        )}
      </Paper>
    );
  };

  return (
    <>
      {render()}

      {
        <DialogAddNewField
          show={showDialogue}
          setHideDialogueHandler={setHideDialogueHandler}
          setShowDialogueHandler={setShowDialogueHandler}
        ></DialogAddNewField>
      }
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    tenantDateFormat:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .tenantDateFormat,
  };
};

export default connect(mapStateToProps, null)(FormControlGenerator);
