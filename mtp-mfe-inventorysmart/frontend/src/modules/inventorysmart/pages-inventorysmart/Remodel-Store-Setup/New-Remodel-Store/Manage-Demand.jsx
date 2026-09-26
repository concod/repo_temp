import React from "react";
import globalStyles from "core/Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import AgGridComponent from "core/Utils/agGrid";
import { Prompt, Button, RadioButtonGroup, useTranslation } from "impact-ui-v3";
import Form from "core/Utils/form";
import { common } from "../../../constants-inventorysmart/stringConstants";

const useStyles = makeStyles(() => ({
  alignButtons: {
    display: "flex",
    justifyContent: "flex-end",
  },
  timePeriodFormStyle: {
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  timePeriodFormContainer: {
    width: "20%",
    marginRight: "1rem",
  },
}));

const ManageDemandWrapperComponent = (props) => {
  const { t } = useTranslation();
  const {
    title,
    addNewRow,
    selectedItems,
    showDeleteConfirmPopup,
    columns,
    rows,
    onSelectionChanged,
    loadTableInstance,
    onChangeSisterStoreValidation,
    onBlur,
    onCellValueChanged,
    clearMappings,
    toggleValue,
    handleChangeTimePeriod,
    timePeriodFields,
    timePeriodValues,
    handleChangeDatePicker,
    datePickerFields,
    datePickerValues,
    setToggleState,
    showConfirmPopup,
    onDelete,
    onClose,
  } = props;
  const globalClasses = globalStyles();
  const classes = useStyles();

  const topRightOptionsManageDemand = () => {
    let options = [];
    options.push(
      <>
        <div className={classes.alignButtons}>
          <Button
            title={t("inventorysmart.addNewRow")}
            variant="tertiary"
            id="sister-store-add-row-button"
            onClick={addNewRow}
            sx={{
              marginRight: "1rem",
            }}
            size="large"
            icon={<AddIcon />}
          />
          <Button
            className={globalClasses.marginLeft1rem}
            title={t("inventorysmart.delete")}
            variant="tertiary"
            id="sister-store-delete-row-button"
            disabled={selectedItems.length === 0}
            onClick={showDeleteConfirmPopup}
            icon={<DeleteIcon />}
            sx={{
              marginRight: "1rem",
            }}
            size="large"
          />
          <Button
            variant="tertiary"
            id="sister-store-reset-button"
            onClick={clearMappings}
            size="large"
            sx={{
              marginRight: "1rem",
            }}
          >
            {t("inventorysmart.reset")}
          </Button>
        </div>
      </>
    );
    return options;
  };

  return (
    <div className={globalClasses.evenPaddingAround}>
      <AgGridComponent
        columns={columns}
        rowdata={rows}
        uniqueRowId={"key"}
        rowSelection={"multiple"}
        selectAllHeaderComponent
        hideHeaderCheckboxComponent
        onSelectionChanged={onSelectionChanged}
        loadTableInstance={loadTableInstance}
        callBackOnChangeCustomFunction={onChangeSisterStoreValidation}
        onBlur={onBlur}
        onCellValueChanged={onCellValueChanged}
        tableHeader={title}
        topRightOptions={topRightOptionsManageDemand()}
      />
      {props.showTimePeriodField && (
        <div className={classes.timePeriodFormStyle}>
          <div className={globalClasses.paddingVertical}>
            <RadioButtonGroup
              options={[
                { label: t("inventorysmart.static"), value: "static" },
                { label: t("inventorysmart.dynamic"), value: "dynamic" },
              ]}
              onChange={setToggleState}
              selectedOption={toggleValue === true ? "dynamic" : "static"}
              orientation="row"
            />
          </div>
          <div className={classes.timePeriodFormContainer}>
            {toggleValue ? (
              <Form
                layout={"vertical"}
                maxFieldsInRow={1}
                handleChange={handleChangeTimePeriod}
                fields={timePeriodFields}
                updateDefaultValue={false}
                defaultValues={timePeriodValues}
                labelWidthSpan={2}
                fieldTypeWidthSpan={2}
              ></Form>
            ) : (
              <Form
                layout={"vertical"}
                maxFieldsInRow={1}
                handleChange={handleChangeDatePicker}
                fields={datePickerFields}
                updateDefaultValue={false}
                defaultValues={datePickerValues}
                labelWidthSpan={2}
                fieldTypeWidthSpan={2}
              ></Form>
            )}
          </div>
        </div>
      )}
      {showConfirmPopup && (
        <>
          <Prompt
            isOpen={showConfirmPopup}
            title={t("inventorysmart.deleteSelectedRows")}
            primaryButtonLabel={common.__ConfirmBtnText}
            onPrimaryButtonClick={onDelete}
            secondaryButtonLabel={common.__RejectBtnText}
            onSecondaryButtonClick={onClose}
            handleClose={onClose}
            variant="error"
          >
            {t("inventorysmart.areYouSureToDeleteSelectedRows")}
          </Prompt>
        </>
      )}
    </div>
  );
};

export default ManageDemandWrapperComponent;
