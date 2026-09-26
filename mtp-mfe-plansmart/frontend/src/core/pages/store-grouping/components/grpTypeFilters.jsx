import { forwardRef } from "react";
import { connect } from "react-redux";
import CustomGroup from "./custom-group";
import ManualGroup from "./manualGroup";
const GroupTypeFilters = forwardRef((props, ref) => {
  const renderFilterAttributes = (groupType) => {
    switch (groupType) {
      case "manual":
        return (
          <ManualGroup
            ref={ref}
            grpObj={props.grpObj}
            {...props}
            isEdit={props.isEdit}
          />
        );
      case "custom":
        return <CustomGroup {...props} ref={ref} />;
      default:
        return <></>;
    }
  };
  return <>{renderFilterAttributes(props.selectedGroupType)}</>;
});

const mapStateToProps = (state) => {
  return {
    selectedGroupType: state.storeGroupReducer.selectedGroupType,
  };
};
export default connect(mapStateToProps, null, null, { forwardRef: true })(
  GroupTypeFilters
);
