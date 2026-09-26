import AgGridComponent from "core/Utils/agGrid";
import PropTypes from "prop-types";

const MasterPlanHistoryTable = ({ historyColDef, historyData }) => {
  return (
    <AgGridComponent
      columns={historyColDef}
      rowdata={historyData}
      sideBar={false}
      showSearchModalBtn={false}
    />
  );
};

MasterPlanHistoryTable.propTypes = {
  historyColDef: PropTypes.any,
  historyData: PropTypes.any
};

export default MasterPlanHistoryTable;
