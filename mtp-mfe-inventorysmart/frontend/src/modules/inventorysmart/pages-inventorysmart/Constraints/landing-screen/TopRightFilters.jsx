import globalStyles from "core/Styles/globalStyles";
import DatePickerWrapper from "core/commonComponents/filters/DatePicker/DatePicker";
import MultiSelect from "core/commonComponents/filters/Select/Select";
import { getfilterAttributeList, mapDataToLabel } from "core/commonComponents/coreComponentScreen/utils";
import { getCombinedCrossDimensionFiltersData } from "core/actions/filterAction";

const TopRightFilters = ({
  screenName,
  selectedDate,
  styleOptions,
  selectedStyles,
  userChoiceFilterConfig,
  dependencyData,
  onDateSelect,
  onStyleUpdate,
  onStyleOptionsFetched,
}) => {
  const globalClasses = globalStyles();

  return (
    <form
      className={`${globalClasses.flexRow} ${globalClasses.gap_12}`}
    >
      <DatePickerWrapper
        label="Select Date"
        labelOrientation="left"
        disableOnlyPast
        name="view_date"
        selectedDate={selectedDate}
        onPrimaryButtonClick={onDateSelect}
        isOutsideRange={() => false}
        hideTertiaryButton={true}
      />
      <MultiSelect
        label="Style Color ID"
        is_mandatory
        minWidth="155px"
        labelOrientation="left"
        name="style"
        filter_keyword="style"
        initialData={styleOptions}
        selectedOptions={selectedStyles}
        updateDependency={onStyleUpdate}
        dropdownOpenCallback={async (dispatch, fieldData) => {
          const payload = {
            screen_name: screenName,
            is_urm_filter: true,
            filter_type: 'cascaded',
            application_code: 1,
            attributes: getfilterAttributeList(userChoiceFilterConfig),
            filters: dependencyData
          }
          dispatch({
            type: "OPTION_INIT",
          });
          const response = await getCombinedCrossDimensionFiltersData(payload)();
          const options = response.data?.data?.article || [];

          let dropdownOptions = options.map((item) => {
            return mapDataToLabel(item);
          });

          onStyleOptionsFetched(dropdownOptions);

          if (dropdownOptions.length > 50) {
            dropdownOptions = dropdownOptions.slice(0, 50);
          }

          dispatch({
            type: "OPTION_SUCCESS",
            payload: dropdownOptions,
          });
        }}
      />
    </form>
  );
};

export default TopRightFilters;
