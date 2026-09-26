import { useState, useEffect, useRef } from 'react';
import { connect } from "react-redux";
import { Switch, Checkbox, Divider, Button } from '@mui/material';
import { cloneDeep, isEmpty } from 'lodash';
import AgGrid from 'core/Utils/agGrid';
import { addSnack } from "core/actions/snackbarActions";

import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import LoadingOverlay from 'core/Utils/Loader/loader';
import { DEFAULT_ATTRIBUTE_CONSTANTS } from 'core/Utils/constants/assortSmart-constants';
import Form from 'core/Utils/form';
import { transformFilterDropdownData, generateProductHierarchy, createSavePayload, generateFilterPayload, transformUpdatedFilter, showSnackMessage, customAgGridCustomCellRenderer } from 'core/Utils/utils';
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CellRenderers from "core/Utils/agGrid/cellRenderer";

import { getSeasonOptions } from 'core/pages/commonModulesServices/plan-dashboard-service';
import { getAttributesList, fetchDefaultAttributes, saveDefaultAttributes } from 'core/actions/assortSmartActions';

function AttributesConfig({ index, yearOptions, filterData, setFiltersToSendToCrossFilter, currentSelectedAttributes, isAttributeDropdownListLoading, addSnack, getValidationFunc }) {
  const [isTimePeriodChecked, setIsTimePeriodChecked] = useState(false);
  const [isAttibuteListApiLoading, setIsAttributeListApiLoading] = useState(false);
  const [isPreviewTableLoading, setIsPreviewTableLoading] = useState(false);
  const [seasonOptions, setSeasonOptions] = useState([]);
  const [attributeListData, setAttributeListData] = useState({});
  const [filterDropdowns, setFiltersDropdowns] = useState([]);
  const [yearAndSeasonDropdown, setYearAndSeasonDropdown] = useState([]);
  const [previewTableData, setPreviewTableData] = useState(null);
  const [selectedYearAndSeasonVal, setSelectedYearAndSeasonVal] = useState({});
  const [selectedAttributesData, setSelectedAttributesData] = useState([]);
  const classes = useStyles();
  const attributeTableRef = useRef(null);
  const previewTableRef = useRef(null);

  const { SNACK_MESSAGES, SNACK_MESSAGE_VARIANTS: { ERROR } } = DEFAULT_ATTRIBUTE_CONSTANTS;

  /**
  * @function
  * @description Transforms the filter data and sets the dropdown values for filters.
  */
  useEffect(() => {
    if (filterData.length) {
      const transformedData = transformFilterDropdownData(filterData);
      setFiltersDropdowns(transformedData);
    }
  }, [filterData])

  /**
   * @function
   * @description Generates and sets the dropdown values for year and season fields.
  */
  useEffect(() => {
    if (yearOptions.length) {
      // Get these values from Constant
      const dropdownData = [
        {
          label: "Year",
          column_name: "year",
          options: yearOptions,
        },
        {
          label: "Season",
          column_name: "season",
          options: seasonOptions,
        },
      ];
      const transformedData = transformFilterDropdownData(dropdownData);
      setYearAndSeasonDropdown(transformedData);
    }
  }, [yearOptions, seasonOptions])

  /**
   * @function
   * @description setup callbacks to parent to ensure smooth transition
   */
  useEffect(() => {
    if (getValidationFunc) {
      getValidationFunc(async () => {
        const allRows = [];
        previewTableRef.current.api.forEachNode((node) => {
          if (!isEmpty(node.data)) {
            const { levels, path, hierarchy_code, ...attributeList } = node.data;

            allRows.push({
              levels,
              path,
              hierarchy_code,
              attribute_list: { ...attributeList },
            });
          }
        });
        return allRows;
      });
    }
  }, [previewTableRef]);



  const handleSwitchChange = () => setIsTimePeriodChecked((prev) => !prev);

  /**
 * @function
 * @description Create a generic dropdown option object
 * @param {String} label
 * @param {String|Number} value
 * @param {String|Number} id
 * @returns {Object}
 */
  const createDropdownObject = (label, value, id) => ({
    label,
    value,
    id,
  });

  const generateAttributeListColumn = () => {
    const colConfig = cloneDeep(attributeListData.columns).map((column) => {
      let config = column;
      switch (config.column_name) {
        case "attribute_list":
          config.options = cloneDeep(attributeListData.attribute_list).map((option) => {
            return createDropdownObject(
              option,
              option,
              option
            )
          }

          );
          config.cellRenderer = (cellProps, extraProps) => {
            return (
              <CellRenderers
                cellData={cellProps}
                column={config}
                extraProps={extraProps}
              ></CellRenderers>
            );
          };
          config.type = 'list'
          config.isMulti = true
          break;
      }
      return config;
    });
    return agGridColumnFormatter(colConfig, {}, {}, false, null, false);
  };

  const generatePreviewTableColumns = () => {

    if (!previewTableData || !previewTableData.columns) {
      return [];
    }

    const colConfig = cloneDeep(previewTableData.columns);
    return agGridColumnFormatter(colConfig, {}, {}, false, null, false);
  };

  // TODO : What can be the other best way
  const generatePreviewTableRows = () => {
    if (!previewTableData || !previewTableData.data) {
      return [];
    }
    return previewTableData.data.map((data) => ({
      levels: data.levels,
      path: data.path,
      hierarchy_code: data.hierarchy_code,
      ...data.attribute_list,
    }));
  };

  const callTheAttributeListApi = async () => {
    try {
      setIsAttributeListApiLoading(true);
      const genPayLoad = currentSelectedAttributes.map(li => {
        return {
          attribute_name: li.attribute_name,
          operator: li.operator,
          value: li.values
        }
      })

      const response = await getAttributesList({
        filters: genPayLoad
      });

      if (!isEmpty(response.data)) {
        setAttributeListData(response.data);
        callFetchDefaultAttributeApi();
      }

    } catch (err) {
      showSnackMessage(addSnack, SNACK_MESSAGES.ATTRIBUTE_LIST_API.ERROR, ERROR);
    } finally {
      setIsAttributeListApiLoading(false);
    }
  }

  const callFetchDefaultAttributeApi = async () => {
    try {
      setIsPreviewTableLoading(true);
      const response = await fetchDefaultAttributes();

      if (response?.data) {
        setPreviewTableData({
          data: response?.data?.data,
          columns: response?.data?.columns,
        });
      }

    } catch (err) {
      showSnackMessage(addSnack, SNACK_MESSAGES.FETCH_DEFAULT_ATTRIBUTES_API.ERROR, ERROR);
    } finally {
      setIsPreviewTableLoading(false);
    }
  }

  const handleApply = () => {
    if (currentSelectedAttributes.length) {
      callTheAttributeListApi();
    }
  }

  const getDataPath = (data) => Object.values(data.path);

  const callSaveDefaultAttributes = async (payload) => {
    try {
      const response = await saveDefaultAttributes(payload);

      if (response?.data?.status) {
        callFetchDefaultAttributeApi();
      }
    } catch (error) {
      showSnackMessage(addSnack, SNACK_MESSAGES.SAVE_DEFAULT_ATTRIBUTES_API.ERROR, ERROR);
    }
  }

  const handleSaveClick = () => {
    let timePeriodFilters = [];
    if (isTimePeriodChecked && selectedYearAndSeasonVal) {
      timePeriodFilters = Object.entries(selectedYearAndSeasonVal).map(
        ([key, value]) => ({
          attribute_name: key,
          value: [String(value)],
          operator: "in",
        })
      );
    }

    const baseFilters = generateFilterPayload(filterData, currentSelectedAttributes);

    const filters = timePeriodFilters.length
      ? [...baseFilters, ...timePeriodFilters]
      : baseFilters;

    const hierarchyData = generateProductHierarchy(selectedAttributesData);
    const payload = createSavePayload(filters, hierarchyData);

    callSaveDefaultAttributes(payload);
  };


  /**
   * @function fetchSeasonOptionsByYear
   * @description Fetches season options for a given year.
   * @param {String} year - The year for which to fetch season options.
   */
  const fetchSeasonOptionsByYear = async (year) => {
    try {
      const seasonResponse = await getSeasonOptions({
        filters: [
          {
            attribute_name: "year",
            value: [year],
            operator: "=",
          },
        ],
      })();
      setSeasonOptions(
        (seasonResponse?.data?.data || []).map((season) => ({ name: season.name, id: season.season_code }))
      );
    } catch (error) {
      showSnackMessage(addSnack, SNACK_MESSAGES.ASSORT_SEASON_API.ERROR, ERROR);
    }
  };

  /**
   * @function handleYearAndSeasonChange
   * @description Handles the change in the year and season
   * @param {Object} updatedData - The overall data with the latest values
   * @param {Object} id - The key[name] for which the value is changed
   * 
   */
  const handleYearAndSeasonChange = (updatedData, id) => {
    // Use constant here
    if (id === 'year') {
      const yearValue = updatedData[id];
      fetchSeasonOptionsByYear(yearValue);
    };
    setSelectedYearAndSeasonVal(updatedData);
  }

  /**
   * @function handleFilterAttrChange
   * @description Handles the changes in the attributes
   * @param {Object} updatedData - The overall data with the latest values
   * @param {Object} id - The key[name] for which the value is changed
   * 
   */
  const handleFilterAttrChange = (updatedData, id) => {
    const updatedFilters = transformUpdatedFilter(updatedData);
    setFiltersToSendToCrossFilter(updatedFilters);
  };

  /**
  * @function
  * @description Handle change of cell values and dynamic changes of cell Data
  * @param {Object} event
  */
  const onCellValueChangeHandler = async (event) => {
    if (event?.api) {
      const allRowData = [];

      event.api.forEachNode((node) => {
        allRowData.push(node.data);
      });

      setSelectedAttributesData(allRowData);

    }
  };

  const renderDefaultPreviewTable = () => {
    return (
      <LoadingOverlay
        loader={isPreviewTableLoading}
        spinner
      >
        {
          previewTableData?.data ? (
            <div className={classes.flexColumnContainer}>
              <h3>{DEFAULT_ATTRIBUTE_CONSTANTS.DEFAULT_ATTRIBUTE_PREVIEW_TITLE}</h3>
              <div>
                <span>{DEFAULT_ATTRIBUTE_CONSTANTS.ATTRIBUTES_INFO_TITLE}</span>
                {DEFAULT_ATTRIBUTE_CONSTANTS.ATTRIBUTE_INFO_TEXT.map((info, index) => (
                  <span key={index}>
                    {info.checkbox && (
                      <Checkbox checked={info.checkbox.checked} disabled={info.checkbox.disabled} />
                    )}
                    {info.isBold ? <strong>{info.text.split("-")[0]}-</strong> : null}
                    <i>{info.isBold ? info.text.split("-")[1] : info.text}</i>
                  </span>
                ))}
              </div>
              <div className={classes.defaultAttributeAgGridContainer}>
                <AgGrid
                  tableRef={previewTableRef}
                  columns={generatePreviewTableColumns()}
                  rowdata={generatePreviewTableRows()}
                  selectAllHeaderComponent={false}
                  getDataPath={getDataPath}
                  treeData={true}
                  hideFormatSideBar={false}
                  pagination={false}
                  showColumnPanel={false}
                  hideRangeFilter={true}
                  customCellRenderer={(cellProps) => customAgGridCustomCellRenderer(cellProps, "preview-table")}
                  tableId={"preview-table"}
                />
              </div>
            </div>
          ) : null
        }
      </LoadingOverlay>
    )
  }

  const renderAttributesListTable = () => {
    return (
      !isEmpty(attributeListData) && (
        <div className={classes.flexColumnContainer}>
          <h3>{DEFAULT_ATTRIBUTE_CONSTANTS.SELECT_VALID_ATTRIBUTES_TITLE}</h3>
          <div className={classes.defaultAttributeAgGridContainer} >
            <AgGrid
              tableRef={attributeTableRef}
              columns={generateAttributeListColumn()}
              rowdata={attributeListData?.data || []}
              onCellValueChanged={onCellValueChangeHandler}
              selectAllHeaderComponent={false}
              hideFormatSideBar={false}
              pagination={false}
              showColumnPanel={false}
              hideRangeFilter={true}
            />
          </div>
          <div>
            <Button className={classes.buttonDiv} variant="contained" disabled={isEmpty(selectedAttributesData)} onClick={handleSaveClick} >{DEFAULT_ATTRIBUTE_CONSTANTS.SAVE_BUTTON}</Button>
          </div>
        </div>
      )
    )

  }

  const renderAttributeFilters = () => {
    return (
      <>
        <div className={classes.flexColumnContainer}>

          <div className={classes.heading}>{DEFAULT_ATTRIBUTE_CONSTANTS.SELECT_FILTERS_TITLE}</div>
          <div style={{ display: 'block' }}>
            <Form
              layout={"vertical"}
              maxFieldsInRow={4}
              handleChange={handleFilterAttrChange}
              fields={filterDropdowns}
              updateDefaultValue={false}
              handleDropdownClose={true}
              heirarchy={false}
            />
          </div>
          <div>
            {
              !isAttributeDropdownListLoading && (
                <Button className={classes.buttonDiv} variant="contained" disabled={!currentSelectedAttributes.length} onClick={handleApply}>{DEFAULT_ATTRIBUTE_CONSTANTS.APPLY_BUTTON}</Button>)
            }
          </div>
          <LoadingOverlay loader={isAttibuteListApiLoading} spinner>
            {renderAttributesListTable()}
          </LoadingOverlay>
        </div>

        <Divider />
      </>
    )
  }

  const renderTimeSpecficAttributes = () => {
    return (
      <>
        <div>
          <span>{DEFAULT_ATTRIBUTE_CONSTANTS.APPLY_ATTRIBUTE_SETTING}</span>
          <Switch checked={isTimePeriodChecked} onChange={handleSwitchChange} />
          {isTimePeriodChecked && (
            <div>
              <Form
                layout={"vertical"}
                maxFieldsInRow={4}
                handleChange={handleYearAndSeasonChange}
                fields={yearAndSeasonDropdown}
                updateDefaultValue={false}
                handleDropdownClose={true}
                heirarchy={false}
              />
            </div>
          )}
        </div>

        <Divider />
      </>
    )
  }

  const renderAttributes = () => {
    return (
      <LoadingOverlay
        loader={isAttributeDropdownListLoading}
        spinner
      >
        {renderTimeSpecficAttributes()}
        {renderAttributeFilters()}
      </LoadingOverlay>
    )
  }

  return (
    <div key={index}>
      {renderAttributes()}
      {renderDefaultPreviewTable()}
    </div>
  );
}

const mapStateToProps = (state) => {
  return {};
};

const mapActionToProps = {
  addSnack
};

export default connect(mapStateToProps, mapActionToProps)(AttributesConfig);