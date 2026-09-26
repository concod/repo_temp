import { cloneDeep } from "lodash";
import Form from "core/Utils/form/index";
import moment from "moment";
import { makeStyles } from "@mui/styles";
import { hasTiers, groupFiltersByTier, getFilterLabel } from "./utlis";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";

const useStyles = makeStyles(() => ({
  tierRow: {
    width: "100%",
  },
  tierRowWithMargin: {
    width: "100%",
    marginTop: pxToRem(20),
  },
  tierDivider: {
    width: "100%",
    height: pxToRem(1),
    backgroundColor: colours.tierDivider,
    margin: `${pxToRem(16)} 0`,
  },
}));

const filterGroupFormWrapper = (props) => {
  const classes = useStyles();
  const { inititalSelection = [] } = props;
  const getDefaultFilterValues = () => {
    // update the format of intial selection required by form component
    let cloneInititalSelection = cloneDeep(inititalSelection);
    let defaultFilterValues = {};

    cloneInititalSelection.forEach((item) => {
      defaultFilterValues = {
        ...defaultFilterValues,
        [item.filter_id]: item.values,
      };
    });

    return defaultFilterValues;
  };

  const transformFiltersData = () => {
    let cloneFiltersData = cloneDeep(props.filters);
    cloneFiltersData = cloneFiltersData.map((item) => {
      if (item.display_type === "dropdown") {
        item.isClearable = item.is_clearable;
        item.isDisabled = item.is_disabled;
        item.isMulti = item.is_multiple_selection;
        item.isSelectAllButtonHidden = item.extra?.is_selectall_button_hidden;
      }
      item.options = item.initialData;
      item.accessor = item.column_name;
      item.field_type = item.display_type;
      item.autoSize = false;
      // Translate the label
      item.label = getFilterLabel(item);
      // Preserve tier information from extra
      if (item.extra?.tier) {
        item.tier = item.extra.tier;
      }

      return item;
    });
    return cloneFiltersData;
  };

  const handleChange = (
    obj,
    id,
    field,
    fieldEvent,
    initialValue,
    checkConfiguration = [],
  ) => {
    // update the parameters required by filtergroup component
    let filterValue;
    let filterAttributes = {
      filter_name: field.label,
      filter_id: field.filter_keyword,
      filter_type: field.type,
      dimension: field.dimension,
      display_type: field.display_type,
      check_configuration: checkConfiguration,
      is_mandatory: field.is_mandatory,
      extra: field.extra,
    };
    switch (field.field_type) {
      case "TextField":
        filterValue = [obj[field.accessor]];
        break;
      case "BooleanField":
        filterValue = obj[field.accessor];
        break;
      case "DateTimeField":
        filterAttributes.disablePast = field.disablePast;
        filterAttributes.disableFuture = field.disableFuture;
        filterValue = moment(fieldEvent).isValid()
          ? moment(fieldEvent).format("YYYY-MM-DD")
          : null;
        break;
      case "dropdown":
        filterValue = fieldEvent.map((opt) => {
          return {
            //Incase of custom filters where label & value for an option is different
            label: opt.label || opt.value,
            id: opt.value,
            value: opt.value,
          };
        });
        break;
      case "rangePicker":
        filterAttributes.disableType = field.disableType;
        filterAttributes.startYear = field.startYear;
        filterValue = [
          fieldEvent[0] ? moment(fieldEvent[0]).format("YYYY-MM-DD") : null,
          fieldEvent[1] ? moment(fieldEvent[1]).format("YYYY-MM-DD") : null,
        ];
        break;
      case "radioGroup":
        filterValue = fieldEvent.target.value;
        break;
      case "fiscalCalendar":
        filterAttributes.disablePastWeeks = field.disablePastWeeks;
        filterAttributes.disableFutureWeeks = field.disableFutureWeeks;
        filterValue = fieldEvent;
        break;
      case "monthRangePicker":
        filterValue = fieldEvent;
        break;
      case "sliderRange":
        filterValue = obj[field.accessor];
        break;
      default:
        filterValue = "";
        break;
    }

    props.updateDependency(filterAttributes, filterValue);
  };

  const filtersTiered = hasTiers(props.filters);

  // Normal flow (no tier info) - skip grouping entirely
  if (!filtersTiered) {
    return (
      <Form
        handleResetFlag={props?.handleResetFlag}
        handleReset={props?.handleReset}
        layout={"vertical"}
        maxFieldsInRow={4}
        handleChange={handleChange}
        fields={transformFiltersData()}
        updateDefaultValue={false}
        defaultValues={getDefaultFilterValues()}
        selectDependency={inititalSelection}
        disabledFields={props.disabledFields}
        disableFilterModal={props.disableFilterModal}
        resetOptions={props.resetOptions}
        dependencyChange={props.dependencyChange}
        withPortal={props?.withPortal}
        isFormComponent={props?.isFormComponent}
      ></Form>
    );
  }

  const tierGroups = groupFiltersByTier(transformFiltersData());

  // Multiple tiers - render each tier in a separate row
  return (
    <>
      {tierGroups.map((tierFilters, index) => {
        const isCustomDimension = tierFilters.every(
          (filter) => filter.dimension === "custom",
        );
        const shouldShowDivider =
          index < tierGroups.length - 1 && !isCustomDimension;

        // Add margin-top for tier 2 custom filters (Calendar)
        const shouldAddMargin = isCustomDimension && index > 0;

        return (
          <div
            key={`tier-${index + 1}`}
            className={
              shouldAddMargin ? classes.tierRowWithMargin : classes.tierRow
            }
          >
            <Form
              handleResetFlag={props?.handleResetFlag}
              handleReset={props?.handleReset}
              layout={"vertical"}
              maxFieldsInRow={4}
              handleChange={handleChange}
              fields={tierFilters}
              updateDefaultValue={false}
              defaultValues={getDefaultFilterValues()}
              selectDependency={inititalSelection}
              disabledFields={props.disabledFields}
              disableFilterModal={props.disableFilterModal}
              resetOptions={props.resetOptions}
              dependencyChange={props.dependencyChange}
              withPortal={props?.withPortal}
              isFormComponent={props?.isFormComponent}
            ></Form>
            {shouldShowDivider && <div className={classes.tierDivider} />}
          </div>
        );
      })}
    </>
  );
};

export default filterGroupFormWrapper;
