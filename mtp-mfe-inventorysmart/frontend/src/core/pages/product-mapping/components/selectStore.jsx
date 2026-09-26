import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import Loader from "../../../Utils/Loader/loader";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { Button } from "impact-ui-v3";
import AgGridTable from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  getAllStores,
  newExceptionsListing,
  resetNewExceptionStates,
  setNewExceptionPayload,
} from "../services-product-mapping/productMappingService";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { cloneDeep, isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";

const SelectStore = (props) => {
  const [columns, setColumns] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [metaBody, setMetaBody] = useState({});
  const filterDependecy = useRef();
  const productTableRef = useRef();
  const dispatch = useDispatch();
  const globalClasses = globalStyles();
  const { newExceptionObject } = useSelector(
    (store) => store?.productMappingReducerService
  );

  useEffect(() => {
    getInitialData();
    loadFilters();
  }, []);

  /**
   * @function
   * @description Fetch column configuration for Select Stores Screen
   */
  const getInitialData = async () => {
    setShowLoader(true);
    try {
      let cols = await getColumnsAg(
        "table_name=ps_mapping_add_exception_stores_list"
      )();
      setColumns(cols);
      setShowLoader(false);
    } catch (error) {
      setShowLoader(false);
    }
  };

  /**
   * @function
   * @description Load products filters using Select Stores filter name
   */
  const loadFilters = async () => {
    const response = await fetchFilterFieldValues(
      "ps mapping add exception store list",
      []
    );
    if (isEmpty(props.productMappingAddExceptionStores)) {
      let filterConfigData = [
        {
          filterDashboardData: response,
          isCrossDimensionFilter: false,
          screen_name: "Inventorysmart Configurations",
        },
      ];
      const filterConfig = formattedFilterConfiguration(
        "productMappingAddExceptionStores",
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
      const resp = await getAllStores(body);
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
  const gotoNextStep = async () => {
    setShowLoader(true);
    let payload;
    if (selectAll) {
      payload = {
        store_codes: {
          filters: cloneDeep(filterDependecy.current),
          ...metaBody,
        },
      };
    } else {
      payload = {
        store_codes: selectedRows.map((store) => store.store_code),
      };
    }
    try {
      const body = cloneDeep(newExceptionObject);
      payload = { ...body, ...payload };
      const resp = await newExceptionsListing(payload);
      dispatch(resetNewExceptionStates());
      displaySnackMessages(
        resp.data.message ||
          "Exception creation in progress, you will recieve a notification shortly.",
        "success"
      );
      setShowLoader(false);
      props.onNext();
    } catch (error) {
      displaySnackMessages(
        error.response.data.message || "Something went wrong",
        "error"
      );
      setShowLoader(false);
    }
  };

  const displaySnackMessages = (message, variance) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
        },
      })
    );
  };

  /**
   * @function
   * @description Hande Navigation to prev step save
   */
  const gotoPrevtStep = () => {
    props.onCancel();
  };

  return (
    <>
      <CoreComponentScreen
        showFilterDashboard={true}
        filterConfigKey={"productMappingAddExceptionStores"}
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
              uniqueRowId={"store_code"}
              onSelectionChanged={onSelectionChanged}
              disableSelectionOnSelectAll={true}
            />
          )}
        </Loader>
      </CoreComponentScreen>
      <div className={`${globalClasses.stickyFooter}`}>
        <Button variant="tertiary" id="storesPrevBtn" onClick={gotoPrevtStep}>
          Back
        </Button>
        <Button
          variant="primary"
          id="storesNextBtn"
          onClick={gotoNextStep}
          disabled={!Boolean(selectedRows.length) || showLoader}
        >
          Create Exceptions
        </Button>
      </div>
    </>
  );
};

export default SelectStore;
