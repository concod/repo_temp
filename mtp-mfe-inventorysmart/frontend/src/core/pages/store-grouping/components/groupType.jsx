import { setSelectedStoreGrpType } from "../services-store-grouping/custom-store-group-service";
import { connect } from "react-redux";
import { Badge } from "impact-ui-v3";
//props to be passed are
//1. Type of dimension => Product or Store
//2. Options for Group Types
const GroupType = (props) => {
  return (
    <>
   //OLD CODE FOR DynamicLabels
      {/* <RadioGroup
        id="storeGrpingGrpTypeRadioGrp"
        row
        value={props.type === "store" ? props.selectedGroupType : ""}
        onChange={
          props.type === "store"
            ? (event) => props.setSelectedStoreGrpType(event.target.value)
            : null
        }
      >
        {props.options.map((type) => {
          return (
            <Radio
              value={type.value}
              id={`storeGrpingGrpTypeRadio${type.value}`}
              key={`storeGrpingGrpTypeFormLabel${type.value}`}
              disabled={type.value === "custom"}
              disableRipple={true}
              checkedIcon={
                <Chip size="medium" color="primary" label={type.label} />
              }
              icon={<Chip size="medium" label={type.label} />}
            />
          );
        })}
      </RadioGroup> */}

      
      {props.options.map((type, index) => {
        return (
          <Badge
            color="info"
            label={type.label}
            onClick={(value) => {
              props.setSelectedStoreGrpType(type.value);
            }}
            size="default"
            variant="stroke"
          />
        );
      })}
    </>
  );
};
const mapStateToProps = (state) => {
  return {
    selectedGroupType: state.storeGroupReducer.selectedGroupType,
  };
};

const mapActionsToProps = {
  setSelectedStoreGrpType,
};
export default connect(mapStateToProps, mapActionsToProps)(GroupType);
