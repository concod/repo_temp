/**
 * DropdownGroupField - Renders a group of related dropdowns within a form.
 *
 * This is a thin presentational component that delegates all state management,
 * cascading logic, and default value handling to the useDropdownGroup hook.
 * It is responsible only for rendering the UI:
 * - An optional group label.
 * - A responsive Grid of Select dropdowns (one per configured dropdown in item.dropdowns).
 * - Hidden dropdowns (hidden=true) are excluded from rendering but their values
 *   are still managed by the hook and included in the saved payload.
 *
 * Used inside configurator-form.jsx for the "dropdownGroup" display_type.
 */
import React from "react";
import { Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import Select from "core/commonComponents/filters/Select/Select";
import useDropdownGroup from "./useDropdownGroup";
import makeStyles from "@mui/styles/makeStyles";

/**
 * @param {Object} props
 * @param {Object} props.item - The dropdownGroup field config (accessor, dropdowns[], label, etc.).
 * @param {Object} props.formData - The full form state object.
 * @param {Function} props.handleChange - The form's change handler from configurator-form.
 * @param {boolean} props.disabledFields - Global flag to disable all fields.
 * @param {string} props.uniqueInputId - Unique prefix for generating input element IDs.
 */

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    padding: "8px 12px 10px 12px",
    backgroundColor: "#fff",
  },

  title: {
    fontWeight: 600,
    fontSize: 14,
    color: "#111827",
  },

  innerContainer: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
  },

  row: {
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    alignItems: "center",
    marginBottom: 12,

    "&:last-child": {
      marginBottom: 0,
    },
  },

  label: {
    fontSize: 14,
    color: "#1F2B4D",
  },

  fieldWrapper: {
    width: "100%",
  },
}));
const DropdownGroupField = ({
  item,
  formData,
  handleChange,
  disabledFields,
  uniqueInputId,
}) => {
  const classes = useStyles();

  const {
    normalizedDropdowns,
    getResolvedOptionsForIndex,
    getSelectedOptionsForField,
  } = useDropdownGroup({ item, formData, handleChange, disabledFields });

  return (
    <div className={classes.root}>
      {/* Title */}
      {item.label && (
        <Typography className={classes.title}>{item.label}</Typography>
      )}

      {/* Inner Grey Container */}
      <div className={classes.innerContainer}>
        {normalizedDropdowns.map(
          ({ field, isMulti, isLocked, isHidden }, dropdownIndex) => {
            // Hidden dropdowns are not rendered but their default values
            // are still managed by the useDropdownGroup hook.
            if (isHidden) {
              return null;
            }

            const resolvedOptions = getResolvedOptionsForIndex(dropdownIndex);

            const { selected } = getSelectedOptionsForField(
              field.field_name,
              dropdownIndex,
              isMulti
            );

            return (
              <div
                key={`${item.accessor}-${field.field_name}`}
                className={classes.row}
              >
                {/* Label */}
                <Typography className={classes.label}>{field.label}</Typography>

                {/* Dropdown */}
                <div className={classes.fieldWrapper}>
                  <Select
                    {...field}
                    menuPosition={"fixed"}
                    isDisabled={isLocked}
                    name={`${item.accessor}.${field.field_name}`}
                    isSearchable={field.isSearchable ? true : false}
                    menuShouldBlockScroll={true}
                    is_multiple_selection={isMulti}
                    dependency={[]}
                    initialData={resolvedOptions}
                    selectedOptions={
                      selected
                        ? Array.isArray(selected)
                          ? selected
                          : [selected]
                        : []
                    }
                    id={`${uniqueInputId}-${field.field_name}`}
                    data-testid={`select${
                      field.name || field.label || field.field_name
                    }`}
                    // When the user selects/clears an option, propagate the
                    // change to formData via handleChange with "dropdownGroup" type.
                    // The dropdownFieldName tells handleChange which nested key to update.
                    updateDependency={(key, option) =>
                      handleChange(
                        option,
                        "dropdownGroup",
                        item.accessor,
                        {
                          ...item,
                          dropdownFieldName: field.field_name,
                          isMulti,
                        },
                        key?.check_configuration
                      )
                    }
                    label={""} // remove internal label (important)
                    selectAllLabel={field.label}
                    isClearable={
                      !isLocked &&
                      (field.isClearable || field.is_clearable ? true : false)
                    }
                    customPlaceholder={`Select ${field.label}`}
                    reset={false}
                    updation={false}
                    doNotUpdateDefaultValue={false}
                    handleDropdownClose={false}
                    isSelectAllButtonHidden={field.isSelectAllButtonHidden}
                    labelOrientation={field?.labelOrientation}
                    withPortal={false}
                    width={"100%"}
                    isFormComponent={true}
                  />
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
};
export default DropdownGroupField;
