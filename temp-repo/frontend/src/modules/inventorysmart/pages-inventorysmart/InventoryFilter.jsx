import React from "react";
import LoadingOverlay from "core/Utils/Loader/loader";
import Paper from "@mui/material/Paper";
import Form from "../../../core/Utils/form";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import {
  FILTER_BUTTON_LABEL,
  RESET_BUTTON_LABEL,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import FiltersButtonComponent from "./filters-button-component";

export const InventoryFilter = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <LoadingOverlay loader={props.inventorysmartFilterLoader}>
      <Paper className={globalClasses.paperWrapper}>
        {props?.header && (
          <div className={classes.filterBoardHeader}>
            <h3 className={classes.createDetailsTitle}>{props.header}</h3>
          </div>
        )}
        <div className={classes.filterBoardMain}>
          <Form
            layout={"vertical"}
            maxFieldsInRow={props.maxFieldsInRow ? props.maxFieldsInRow : 4}
            handleChange={props.handleChange}
            fields={props.filterData || []}
            updateDefaultValue={false}
            defaultValues={props.getDefaultValues}
          />
          <FiltersButtonComponent
            filterButtonLabel={FILTER_BUTTON_LABEL}
            resetButtonLabel={RESET_BUTTON_LABEL}
            onFilterHandler={props.onFilter}
            onResetHandler={props.onReset}
          />
        </div>
      </Paper>
    </LoadingOverlay>
  );
};

export default InventoryFilter;
