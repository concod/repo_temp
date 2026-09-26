import { useEffect } from "react";
import ConditionalFormatting from "./ConditionalFormatting";
import EditableMetricTenantTable from "./EditableMetricTenantTable";
import { connect } from "react-redux";
import {
  getPlanSmartScreenConfig,
  planSmartScreenConfigsSelector,
} from "core/reducers/tenantConfigService/conditionalFormatting";

function PlansmartTenantConfig({ getPlanSmartScreenConfigReq, screenConfig }) {
  useEffect(() => {
    getPlanSmartScreenConfigReq();
  }, []);

  return (
    <>
      {screenConfig?.tenantScreen?.showConditionalFormatting && (
        <ConditionalFormatting />
      )}
      {screenConfig?.tenantScreen?.showEditableMetricConfigTable && (
        <EditableMetricTenantTable />
      )}
    </>
  );
}

const mapState = (state) => {
  return {
    screenConfig: planSmartScreenConfigsSelector(state),
  };
};

const mapDispatch = (dispatch) => {
  return {
    getPlanSmartScreenConfigReq: () => dispatch(getPlanSmartScreenConfig()),
  };
};

export default connect(mapState, mapDispatch)(PlansmartTenantConfig);
