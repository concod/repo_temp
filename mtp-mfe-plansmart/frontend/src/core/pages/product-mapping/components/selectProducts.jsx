import React, { useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import Loader from "../../../Utils/Loader/loader";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { Button } from "impact-ui";
import AgGridTable from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  getRulesList,
  setNewExceptionPayload,
} from "../services-product-mapping/productMappingService";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { cloneDeep, isEmpty } from "lodash";

const SelectProducts = (props) => {
  const [columns, setColumns] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [metaBody, setMetaBody] = useState({});
  const filterDependecy = useRef();
  const productTableRef = useRef();
  const dispatch = useDispatch();
  const globalClasses = globalStyles();

  useEffect(() => {
    getInitialData();
    loadFilters();
  }, []);

  /**
   * @function
   * @description Fetch column configuration for Select Products Screen
   */
  const getInitialData = async () => {
    setShowLoader(true);
    try {
      let cols = await getColumnsAg(
        "table_name=ps_mapping_add_exception_rules_list"
      )();
      setColumns(cols);
      setShowLoader(false);
    } catch (error) {
      setShowLoader(false);
    }
  };

  /**
   * @function
   * @description Load products filters using Select Products filter name
   */
  const loadFilters = async () => {
    const response = await fetchFilterFieldValues(
      "ps mapping add exception rules list",
      []
    );
    if (isEmpty(props.productMappingAddExceptionRules)) {
      let filterConfigData = [
        {
          filterDashboardData: response,
          isCrossDimensionFilter: false,
          screen_name: "Inventorysmart Configurations",
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        "productMappingAddExceptionRules",
        filterConfigData,
        "Inventorysmart Configurations"
      );
      dispatch(setFilterConfiguration(filterConfig));
    }
  };

  /**
   * @function
   * @description Handle selection changes and update local state
   * @param {Object} event
   */
  const onSelectionChanged = (event) => {
    const checkedRows = event.api.getSelectedRows();
    setSelectAll(Boolean(event.api?.isSelectAllRecords));
    setSelectedRows(checkedRows);
  };

  /**
   * @function
   * @description Load table data from selected fillters or for sorted/searchable/paginated table columns
   * @param {Objet} manualbody
   * @param {Number} pageIndex
   * @param {Object} params
   * @returns {Object}
   */
  const manualCallBack = async (manualbody, pageIndex, params) => {
    setShowLoader(true);
    if (
      !Boolean(filterDependecy.current) ||
      filterDependecy.current?.length === 0
    ) {
      setShowLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
    try {
      const meta = {
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
      };
      let body = {
        filters: filterDependecy.current,
        ...meta,
      };
      setMetaBody(meta);
      const resp = await getRulesList(body);
      setShowLoader(false);
      return {
        data: resp.data.data,
        totalCount: resp.data.total,
      };
    } catch (err) {
      setShowLoader(false);
    }
  };

  /**
   * @function
   * @description Save filter dependency to current state referance
   * @param {Object} dependencyData
   */
  const onFilterDashboardClick = (dependencyData) => {
    filterDependecy.current = dependencyData;
    productTableRef.current?.api?.refreshServerSideStore({ purge: true });
  };

  /**
   * @function
   * @description Hande Navigation to next step save changes to global state
   */
  const gotoNextStep = () => {
    let payload;
    if (selectAll) {
      payload = {
        rule_codes: {
          filters: cloneDeep(filterDependecy.current),
          ...metaBody
        },
      };
    } else {
      payload = {
        rule_codes: selectedRows.map((rules) => rules.rule_code),
      };
    }
    dispatch(setNewExceptionPayload(payload));
    props.onNext();
  };

  return (
    <>
      <CoreComponentScreen
        showFilterDashboard={true}
        filterConfigKey={"productMappingAddExceptionRules"}
        onApplyFilter={onFilterDashboardClick}
      >
        <Loader loader={showLoader}>
          {columns.length > 0 && (
            <AgGridTable
              columns={columns}
              selectAllHeaderComponent={true}
              hideChildSelection={true}
              sizeColumnsToFitFlag
              onGridChanged
              onRowSelected
              loadTableInstance={(instance) => {
                productTableRef.current = instance;
              }}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              uniqueRowId={"rule_code"}
              onSelectionChanged={onSelectionChanged}
              disableSelectionOnSelectAll={true}
            />
          )}
        </Loader>
      </CoreComponentScreen>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.layoutAlignEnd} ${globalClasses.gap} ${globalClasses.marginVertical1rem}`}
      >
        <Button
          variant="primary"
          id="productsPrevBtn"
          onClick={props.onCancel}
          disabled={showLoader}
        >
          Back
        </Button>
        <Button
          variant="primary"
          id="productsNextBtn"
          onClick={gotoNextStep}
          disabled={!selectedRows.length || showLoader}
        >
          Next
        </Button>
      </div>
    </>
  );
};

export default SelectProducts;
