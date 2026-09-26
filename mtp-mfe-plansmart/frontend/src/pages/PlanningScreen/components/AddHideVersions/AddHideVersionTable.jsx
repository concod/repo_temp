import { bindActionCreators } from "redux";
import { useDispatch, connect } from "react-redux";

import PropTypes from "prop-types";
import AgGridComponent from "core/Utils/agGrid";

import * as actions from "../../slice/planningScreen.slice";

const AddHideVersionTable = ({
  versionColDef,
  versionTableData,
  setSelectedRows,
  prevSelectedPlans,
  setIsDisabled
}) => {
  const dispatch = useDispatch();

  const handleSelectionChange = (event) => {
    const selectedRows = event.api.getSelectedNodes();
    dispatch(setSelectedRows(selectedRows));
    setIsDisabled(false);
  };

  const isRowSelectable = (plan) => {
    const planCodeIndex = prevSelectedPlans
      .map((plans) => plans.plan_code)
      .indexOf(plan.data.plan_code);
    return !(planCodeIndex > -1);
  };

  return (
    <AgGridComponent
      columns={versionColDef}
      hideHeaderCheckboxComponent={true}
      rowdata={versionTableData}
      rowSelection="single"
      selectAllHeaderComponent={true}
      isRowSelectable={isRowSelectable}
      showDisabledCheckboxes={true}
      showSaveTableConfig={false}
      skipAutoSizeColumn={true}
      uniqueRowId="plan_code"
      onSelectionChanged={handleSelectionChange}
      showSearchModalBtn={false}
    />
  );
};

AddHideVersionTable.propTypes = {
  versionColDef: PropTypes.array,
  versionTableData: PropTypes.array,
  setSelectedRows: PropTypes.func,
  setIsDisabled: PropTypes.func
};

const mapState = (state) => ({
  selectedRows: actions.selectedRowsSelector(state),
  prevSelectedPlans: actions.prevSelectedPlansSelector(state)
});

const mapDispatch = (dispatch) => {
  return {
    ...bindActionCreators({ ...actions }, dispatch)
  };
};

export default connect(mapState, mapDispatch)(AddHideVersionTable);
