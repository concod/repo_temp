import { forwardRef } from "react";
import { connect } from "react-redux";
import ManualGroup from "./manualGroup";
import MetricGroup from "./metricGroup";
const GroupTypeFilters = forwardRef((props, ref) => {
  const renderFilterAttributes = (groupType) => {
    switch (groupType) {
      case "manual":
        return (
          <ManualGroup
            ref={ref}
            grpObj={props.grpObj}
            isEdit={props.isEdit}
            screenName={props.screenName}
            application_code={props.application_code}
          />
        );
      case "objective":
        return <MetricGroup type="objective" />;
      case "custom":
        return <MetricGroup type="custom" />;
      default:
        return <></>;
    }
  };

  return <>{renderFilterAttributes(props.selectedGroupType)}</>;
});

const mapStateToProps = (state) => {
  return {
    selectedGroupType: state.productGroupReducer.selectedGroupType,
  };
};
export default connect(mapStateToProps, null, null, { forwardRef: true })(
  GroupTypeFilters
);
