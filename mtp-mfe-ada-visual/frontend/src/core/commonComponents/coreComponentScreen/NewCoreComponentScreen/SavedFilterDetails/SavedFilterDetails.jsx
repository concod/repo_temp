import { useMemo } from "react";
import { Tag, TagGroup } from "impact-ui-v3";
import FilterNameEdit from "../FilterNameEdit/FilterNameEdit";
import { getFiltersDataDict } from "../filterUtils";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import "./SavedFilterDetails.scss";
import { formatStringDate } from "core/Utils/functions/utils";

const SavedFilterDetails = (props) => {
  const {
    savedFiltersList,
    handleDialog,
    currentSelectedFilterName,
    copySavedFilter,
    copyFilterDetailsRef,
    onFilterChipEditClick,
    savedFilterSectionRef,
    setCopySavedFilter,
    setCurrentSelectedFilterName,
    filterDashboardData,
  } = props;

  const filtersDict = useMemo(
    () => getFiltersDataDict(filterDashboardData || []),
    [filterDashboardData]
  );

  const allDimensions = {};
  savedFiltersList?.saved_filter_preference?.forEach((filter) => {
    allDimensions[filter.dimension] = [
      ...(allDimensions?.[filter.dimension]
        ? allDimensions[filter.dimension]
        : []),
      filter,
    ];
  });

  return (
    <div>
      <div className="heading">Saved Filters</div>
      <div className="saved-filter-new-edit">
        <FilterNameEdit
          copyFilterDetailsRef={copyFilterDetailsRef}
          savedFilterSectionRef={savedFilterSectionRef}
          copySavedFilter={copySavedFilter}
          savedFiltersList={savedFiltersList}
          setCopySavedFilter={setCopySavedFilter}
          onFilterChipEditClick={onFilterChipEditClick}
          setCurrentSelectedFilterName={setCurrentSelectedFilterName}
          handleDialog={handleDialog}
          currentSelectedFilterName={currentSelectedFilterName}
        />
      </div>
      <div className="dimension">
        {Object.entries(allDimensions).map(([key, dimensionValues]) => {
          return (
            <>
              <div className="dimension-wise-filter">
                <div className="dimension-heading">{key}</div>
                {dimensionValues.map((filter) => {
                  let itemsLength = 0;
                  let isFinal = false;
                  const totalValuesLength = filter.values?.length || 0;
                  const isRequired =
                    filtersDict[filter.attribute_name]?.is_required ||
                    filtersDict[filter.attribute_name]?.is_mandatory ||
                    filtersDict[filter.attribute_name]?.required;

                  if (!filtersDict[filter.attribute_name]) {
                    return null;
                  }

                  return (
                    <div className="filters">
                      <div className="filter-heading">
                        {filtersDict[filter.attribute_name]?.label}
                        {isRequired && <span className="required">*</span>}
                      </div>
                      <TagGroup>
                        {typeof filter?.values === "string" ? (
                          <Tag key={filter.values} label={filter.values} />
                        ) : filter?.display_type === "fiscalCalendar" ? (
                          <>
                            <Tag
                              key={
                                filter?.values?.fiscalInfoStartDate
                                  ?.calendar_week_start_date
                              }
                              label={formatStringDate(
                                filter?.values?.fiscalInfoStartDate
                                  ?.calendar_week_start_date,
                                false,
                                false
                              )}
                            />{" "}
                            to{" "}
                            <Tag
                              key={
                                filter?.values?.fiscalInfoEndDate
                                  ?.fiscal_week_end_date
                              }
                              label={formatStringDate(
                                filter?.values?.fiscalInfoEndDate
                                  ?.actualSelectedDate,
                                false,
                                false
                              )}
                            />
                          </>
                        ) : filter?.display_type === "monthRangePicker" &&
                          filter?.values?.startMonth ? (
                          <>
                            <Tag
                              key="startMonth"
                              label={filter.values.startMonth
                                ? new Date(filter.values.startMonth).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                                : ""}
                            />
                            {" to "}
                            <Tag
                              key="endMonth"
                              label={filter.values.endMonth
                                ? new Date(filter.values.endMonth).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                                : ""}
                            />
                          </>
                        ) : (
                          Array.isArray(filter?.values) && filter?.values?.map((item, index) => {
                            if (typeof item === "object")
                              item = item?.label || "";
                            itemsLength += item?.length || 0;
                            const remainingValues = totalValuesLength - index;
                            const label =
                              itemsLength > 30 && index > 0
                                ? !remainingValues
                                  ? totalValuesLength === index + 1
                                    ? "+1"
                                    : ""
                                  : `+${remainingValues}`
                                : `${replaceSpecialCharacter(item)}`;
                            if (label && !isFinal && label !== "undefined") {
                              if (label?.includes("+")) isFinal = true;
                              return <Tag key={item} label={label} />;
                            }
                            return null;
                          })
                        )}
                      </TagGroup>
                    </div>
                  );
                })}
              </div>
              <hr />
            </>
          );
        })}
      </div>
    </div>
  );
};

export default SavedFilterDetails;
