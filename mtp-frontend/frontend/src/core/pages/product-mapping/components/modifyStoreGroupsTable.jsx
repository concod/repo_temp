import { forwardRef, useEffect, useState, useRef } from "react";
import AgGridTable from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { connect } from "react-redux";
import { fetchStoreGroups } from "core/pages/store-grouping/services-store-grouping/custom-store-group-service";
import { END_DATE, SKU_STORE_STATUS_START_DATE } from "config/constants/index";
import { isColumnPresent } from "core/Utils/functions/helpers/table-helpers";

const ModifyStoreGroupsTable = forwardRef((props, ref) => {
  /**
   * State variables
   */
  const [storeGroupTableCols, setStoreGroupTableCols] = useState([]);
  const isTimePeriodPresent = useRef(true);
  useEffect(() => {
    const fetchStoreGrpsTableCols = async () => {
      //on mount, get the columns of modify table
      let agGridcols = await getColumnsAg(
        `table_name=product_mapping_modify_table_store_group_level`
      )();
      if (!isColumnPresent(agGridcols, "time_period")) {
        isTimePeriodPresent.current = false;
        props.setHideSetDates(true);
      }
      setStoreGroupTableCols(agGridcols);
    };
    fetchStoreGrpsTableCols();
  }, []);

  useEffect(() => {
    if (ref.current) {
      ref.current.api.filterDependency = props.filterDependency;
      ref.current.api.storeGroupDatesAPIPayload =
        props.storeGroupDatesAPIPayload;
      ref.current.api.startDate = props.defaultStartDate;
      ref.current.api.endDate = props.defaultEndDate;
    }
  }, [
    props.filterDependency,
    props.storeGroupDatesAPIPayload,
    props.defaultStartDate,
    props.defaultEndDate,
  ]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    //If the filters are not applied, we display empty data
    if (
      (params.api.filterDependency || props.filterDependency || []).length === 0
    ) {
      props.setloader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
    let body = {
      filters: params.api.filterDependency || props.filterDependency || [],
      meta: { ...manualbody },
    };
    try {
      const res = await props.fetchStoreGroups(body, "", pageIndex + 1);
      props.setloader(false);
      return {
        data: res.data.data,
        totalCount: res.data.total,
      };
    } catch (error) {
      props.setloader(false);
      // displaySnackMessages("Something went wrong", "error");
    }
  };

  /**
   *
   * @param {*} event
   * When we select new rows, this callback is triggered
   */
  const onSelectionChanged = (event) => {
    const selectedRows = event.api.getSelectedRows();

    /**
     * We clear the exisiting details, because only single date range is allowed for multiple
     * multiple store groups
     */
    props.clearExisitingStoreGroups(event.api.storeGroupDatesAPIPayload);
    const startDate = isTimePeriodPresent.current
      ? event.api.startDate || props.defaultStartDate
      : SKU_STORE_STATUS_START_DATE;
    const endDate = isTimePeriodPresent.current
      ? event.api.endDate || props.defaultEndDate
      : END_DATE;
    let newUpdatedDatesPayload = props.getDefaultStoreGroupPayload(
      startDate,
      endDate
    );
    /**
     * loop over the selected rows, update the time period value with today to end date
     */
    selectedRows.forEach((row) => {
      const rowNode = ref.current.api.getRowNode(row.sg_code + "");
      newUpdatedDatesPayload.store_groups.push(row.sg_code);
      props.updateStoreGroupRowNodeDate(rowNode, startDate, endDate);
    });
    //Update with the updated payload
    props.setStoreGroupDatesAPIPayload(newUpdatedDatesPayload);
    props.setSelectedStoreGroupObjects(selectedRows);
  };
  return (
    <>
      <AgGridTable
        columns={storeGroupTableCols}
        selectAllHeaderComponent={true}
        sizeColumnsToFitFlag
        onGridChanged
        onRowSelected
        manualCallBack={(body, pageIndex, params) =>
          manualCallBack(body, pageIndex, params)
        }
        loadTableInstance={(gridInstance) => {
          ref.current = gridInstance;
        }}
        rowModelType="serverSide"
        serverSideStoreType="partial"
        cacheBlockSize={10}
        uniqueRowId={"sg_code"}
        onSelectionChanged={onSelectionChanged}
        hideSelectAllRecords={true}
      />
    </>
  );
});
const mapStateToProps = (state) => {};

const mapActionsToProps = {
  fetchStoreGroups,
};
export default connect(mapStateToProps, mapActionsToProps, null, {
  forwardRef: true,
})(ModifyStoreGroupsTable);
