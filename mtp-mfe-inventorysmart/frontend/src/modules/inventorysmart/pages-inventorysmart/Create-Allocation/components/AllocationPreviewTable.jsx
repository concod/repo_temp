import React, { useEffect, useMemo, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { Select } from "impact-ui-v3";
import { isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import { getAllocationPreview, sbcnaFinalise } from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import globalStyles from "core/Styles/globalStyles";
import { getWeekFromActionCell, getDateRangePayload, applyWeekLevelFinalisedRenderer } from "../helperFunctions";
import ShipLevelRecommendationsTable from "./ShipLevelRecommendationsTable";

const AllocationPreviewTable = (props) => {
  const dispatch = useDispatch();
  const globalClasses = globalStyles();

  const [tableColumns, setTableColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showNestedTable, setShowNestedTable] = useState(false);
  const [selectedDropdownOption, setSelectedDropdownOption] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [linkColumnName, setLinkColumnName] = useState(null);
  const [finaliseLoading, setFinaliseLoading] = useState(false);
  const tableInstance = useRef(null);
  const filterConfigLoaded = useRef(false);
  const linkColumnNameRef = useRef(null);
  const selectedDropdownOptionRef = useRef(null);

  // Build dropdown options from the Allocation filter configuration API response
  const dropdownOptions = useMemo(() => {
    if (!props.filterConfig || isEmpty(props.filterConfig)) return [];
    return props.filterConfig.map((filter) => ({
      label: filter.label,
      value:  filter.column_name,
    }));
  }, [props.filterConfig]);

  const onProgramLinkClick = (data, columnName) => {
    setSelectedProgram(data);
    setShowNestedTable(true);
  };

  const actionMap = {
    program: onProgramLinkClick,
  };

  const getTableData = async (groupByValue) => {
    setTableData([]);
    setTableColumns([]);
    setLoading(true);
    try {
      const groupBy = groupByValue || selectedDropdownOption?.value;
      // Merge the selected alert article (when redirected from alerts) into the
      // dashboard filters so the recommendation is scoped to that article.
      const combinedFilters = [
        ...(props.selectedFilters || []),
        ...(props.articleFilter ? [props.articleFilter] : []),
      ];
      const payload = {
        group_by: groupBy || null,
        filters: isEmpty(combinedFilters) ? null : combinedFilters,
        meta: null,
        ...getDateRangePayload(props.startEndDate),
      };
      const response = await dispatch(getAllocationPreview(payload));
      if (response?.data?.status) {
        const responseData = response.data.data;
        const columns = responseData.columns || [];
        const data = responseData.data || [];

        // Identify the first link column to use as action map key
        const firstLinkColumn = columns.find((col) => col.type === "link");
        const linkColName = firstLinkColumn?.column_name;
        setLinkColumnName(linkColName);
        linkColumnNameRef.current = linkColName;

        const dynamicActionMap = {
          [linkColName]: onProgramLinkClick,
          finalise: onFinaliseClick,
        };

        const formattedColumns = agGridColumnFormatter(columns, null, dynamicActionMap);

        // Show "Finalised" text instead of button for weeks already finalised
        applyWeekLevelFinalisedRenderer(formattedColumns);

        setTableColumns(formattedColumns);
        setTableData(data);
      }
    } catch (e) {
      console.error("Error fetching allocation preview data:", e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-select first dropdown option when filter config is loaded
  useEffect(() => {
    if (dropdownOptions.length > 0 && !selectedDropdownOption) {
      setSelectedDropdownOption(dropdownOptions[0]);
      selectedDropdownOptionRef.current = dropdownOptions[0];
    }
  }, [dropdownOptions]);

  // Turn off loader if filterConfig loaded with data but produced no valid dropdown options
  useEffect(() => {
    if (!isEmpty(props.filterConfig)) {
      filterConfigLoaded.current = true;
    }
    if (filterConfigLoaded.current && dropdownOptions.length === 0) {
      setLoading(false);
    }
  }, [props.filterConfig, dropdownOptions]);

  // Fetch data when dropdown selection or applied filters change.
  // Debounced so that multiple rapid prop updates from a single "Apply Filters"
  // action (selectedFilters + startEndDate committed separately when the parent
  // updates are not batched) collapse into a single API call.
  useEffect(() => {
    if (!selectedDropdownOption) return;
    const timer = setTimeout(() => {
      setShowNestedTable(false);
      setSelectedProgram(null);
      getTableData(selectedDropdownOption.value);
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedDropdownOption, props.selectedFilters, props.startEndDate, props.articleFilter]);

  const handleDropdownChange = (option) => {
    setSelectedDropdownOption(option);
    selectedDropdownOptionRef.current = option;
  };

  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };

  const onFinaliseClick = async (data, cellProps) => {
    const attributeName = linkColumnNameRef.current || linkColumnName;
    const attributeValue = data?.[attributeName] || "";
    const week = getWeekFromActionCell(cellProps);

    const payload = {
      level: "hierarchy",
      hierarchy_attribute_name: attributeName,
      hierarchy_attribute_value: attributeValue,
      week,
      status: "FINALISED",
      ...getDateRangePayload(props.startEndDate),
      ...(props.articleFilter?.values?.length > 0 && { article: props.articleFilter.values }),
    };

    setFinaliseLoading(true);
    try {
      const response = await dispatch(sbcnaFinalise(payload));
      if (response?.data?.status) {
        dispatch(addSnack({ message: response?.data?.message || "Finalised successfully", options: { variant: "success" } }));
        getTableData(selectedDropdownOptionRef.current?.value);
      } else {
        dispatch(addSnack({ message: response?.data?.message || "Failed to finalise", options: { variant: "error" } }));
      }
    } catch (e) {
      console.error("Error finalising hierarchy:", e);
      const errMsg = e?.response?.data?.message || "Error finalising. Please try again.";
      dispatch(addSnack({ message: errMsg, options: { variant: "error" } }));
    } finally {
      setFinaliseLoading(false);
    }
  };

  const getTopRightOptions = () => {
    if (isEmpty(dropdownOptions)) return null;
    return (
      <Select
        placeholder="Select Option"
        isClearable={false}
        isMulti={false}
        isOpen={isDropdownOpen}
        setIsOpen={setIsDropdownOpen}
        currentOptions={dropdownOptions}
        selectedOptions={selectedDropdownOption}
        initialOptions={dropdownOptions}
        handleChange={handleDropdownChange}
        setSelectedOptions={() => {}}
        setCurrentOptions={() => {}}
        width="250px"
      />
    );
  };

  return (
    <div className={globalClasses.marginTop}>
      <Loader loader={loading || finaliseLoading}>
        <AgGridComponent
          columns={tableColumns}
          rowdata={tableData}
          tableHeader="Allocation Preview (Overall)"
          topRightOptions={getTopRightOptions()}
          sizeColumnsToFitFlag={true}
          suppressFieldDotNotation
          pagination={false}
          loadTableInstance={loadTableInstance}
          onReviewClick={(cellProps) => onFinaliseClick(cellProps?.data, cellProps)}
          nestedTable={showNestedTable}
          nestedTableComponent={
            <ShipLevelRecommendationsTable
              selectedProgram={selectedProgram}
              selectedDropdownOption={selectedDropdownOption}
              linkColumnName={linkColumnName}
              startEndDate={props.startEndDate}
              isViewOnly={props.isViewOnly}
              articleFilter={props.articleFilter}
              selectedFilters={props.selectedFilters}
              refreshParent={() => getTableData(selectedDropdownOptionRef.current?.value)}
            />
          }
        />
      </Loader>
    </div>
  );
};

export default AllocationPreviewTable;
