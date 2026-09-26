import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { useHistory } from "react-router-dom";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";

import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getPastAllocationTableConfiguration,
  getPastAllocationTableData,
  setInventorysmartPastAllocationTableDataLoader,
} from "modules/inventorysmart/services-inventorysmart/View-Past-Allocation/view-past-allocation";
import { isEmpty } from "lodash";
import { CREATE_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { scrollIntoView } from "../../inventorysmart-utility";
import {
  setSelectedFilters,
  setFormFilters,
  setInventorySmartFinalizeFilterDependency,
  setRedirectedFrom,
} from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import { replaceSpecialCharacter} from "core/Utils/functions/utils";

const ViewPastAllocationsTables = (props) => {
  const history = useHistory();

  const [pastAllocationTableColumns, setPastAllocationTableColumns] = useState(
    []
  );
  const [render, setRender] = useState(false);
  const allocationRef = useRef();

  useEffect(() => {
    const fetchColumnConfig = async () => {
      let columns = await props.getPastAllocationTableConfiguration();
      let formattedColumns = agGridColumnFormatter(columns?.data?.data, null);
      const updatedConfig = formattedColumns.map(column => {
        if (column.accessor=== 'action') {
            return {
                ...column,
                suppressMenu: true,
                lockPosition: "right",
            };
        }
        return column;
    });
      setPastAllocationTableColumns(updatedConfig);
      setRender(true);
      scrollIntoView(allocationRef);
    };
    fetchColumnConfig();
  }, [props.selectedFilters]);

  useEffect(() => {
    !isEmpty(props.selectedFilters) && setRender(false);
  }, [props.selectedFilters]);

  const manualCallBack = async (manualbody, pageIndex) => {
    try {
      if (props.inventorysmartScreenConfigForInfiniteScrolling?.includes("VPAPastAllocation")) {
        pageIndex == 0 && props.setInventorysmartPastAllocationTableDataLoader(true);
      }
      else {
        props.setInventorysmartPastAllocationTableDataLoader(true);
      }
      let l_formattedTableColumnsToBeSentInDataRequest = pastAllocationTableColumns
        ?.filter((columnConfig) => !columnConfig?.extra?.ignore_in_api)
        ?.map((column) => {
          return {
            attribute_name: column.column_name,
            dimension: "Product",
            filter_type: "cascaded",
            operator: "in",
            values: [],
          };
        });
      let body = {
        filters: [
          ...props.selectedFilters,
          ...l_formattedTableColumnsToBeSentInDataRequest,
        ],
        ...props.startEndDate,
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
      };
      let response = await props.getpastAllocationTableData(body);
      if (response.data.status) {
        let res=response.data.data
        let modifiedArray = res.map(item => {
          if (item.name) {
              return {
                  ...item,
                  name: replaceSpecialCharacter(item.name)
              };
          }
          return item;
      });
        return {
          data: modifiedArray,
          totalCount: response.data.total,
        };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setInventorysmartPastAllocationTableDataLoader(false);
    }
  };

  const onReviewClick = (p_tableData) => {
    props.setSelectedFilters(props.selectedFilters);
    props.setRedirectedFrom("viewPastAllocation");
    props.setInventorySmartFinalizeFilterDependency(
      props.inventorysmartPastAllocationFilterDependency
    );
    props.setFormFilters({ selectedDates: props.selectedDates });
    history.push(
      `${CREATE_ALLOCATION}?step=1&allocation_code=${p_tableData.plan_code}`
    );
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  return (
    <>
      {render && (
        <div ref={allocationRef}>
          <Loader loader={props.inventorysmartPastAllocationTableDataLoader}>
            <AgGridComponent
              columns={pastAllocationTableColumns}
              manualCallBack={(body, pageIndex) =>
                manualCallBack(body, pageIndex)
              }
              // enabling infinite scroll for RL based on key available in response from smart screen config api
              {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                "VPAPastAllocation"
              )
                ? {
                  pagination: false,
                  rowModelType: "infinite",
                  cacheOverflowSize: 2,
                  hideSelectCurrentPageRecords: true,

                } :
                {
                  rowModelType: "serverSide",
                  serverSideStoreType: "partial"
                }
              )}
              onReviewClick={(tableInfo) => onReviewClick(tableInfo.data)}
              cacheBlockSize={10}
              uniqueRowId={"plan_code"}
              skipAutoSizeColumn
            />
          </Loader>
        </div>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .selectedFilters,
    inventorysmartPastAllocationFilterDependency:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .inventorysmartPastAllocationFilterDependency,
    inventorysmartPastAllocationTableDataLoader:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .inventorysmartPastAllocationTableDataLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getPastAllocationTableConfiguration: (payload) =>
    dispatch(getPastAllocationTableConfiguration(payload)),
  setInventorysmartPastAllocationTableDataLoader: (payload) =>
    dispatch(setInventorysmartPastAllocationTableDataLoader(payload)),
  getpastAllocationTableData: (payload) =>
    dispatch(getPastAllocationTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setFormFilters: (payload) => dispatch(setFormFilters(payload)),
  setInventorySmartFinalizeFilterDependency: (payload) =>
    dispatch(setInventorySmartFinalizeFilterDependency(payload)),
  setRedirectedFrom: (payload) => dispatch(setRedirectedFrom(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ViewPastAllocationsTables);
