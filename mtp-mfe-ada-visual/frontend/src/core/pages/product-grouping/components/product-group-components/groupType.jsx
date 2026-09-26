import { forwardRef, useEffect } from "react";
import {
  setSelectedProductGrpType,
  setProdGroupFilteredProds,
  resetFilterProds,
} from "core/pages/product-grouping/product-grouping-service";
import { connect } from "react-redux";
import { Badge } from "impact-ui-v3";
//props to be passed are
//1. Type of dimension => Product or Store
//2. Options for Group Types

const GroupType = forwardRef((props, ref) => {

  useEffect(() => {
    props.resetFilterProds();
    ref?.productLvlRef?.current?.api?.refreshServerSideStore({ purge: false });
  }, [props.selectedGroupType]);

  return (
    <>
      {/* <RadioGroup
        row
        id="productGrpingGrpTypeRadioGrp"
        value={props.type === "product" ? props.selectedGroupType : ""}
        onChange={
          props.type === "product"
            ? (event) => props.setSelectedProductGrpType(event.target.value)
            : null
        }
      >
        {props.options.map((type) => {
          return (
            <Radio
              value={type.value}
              id={`productGrpingGrpTypeRadio${type.value}`}
              classes={{ disabled: classes.disabledButton }}
              disabled={
                props.isEdit === true &&
                (type.value === "objective" || type.value === "custom")
              }
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
              console.log("value", value);
              props.setSelectedProductGrpType(type.value);
            }}
            size="default"
            variant="stroke"
          />
        );
      })}
    </>
  );
});
const mapStateToProps = (state) => {
  return {
    selectedGroupType: state.productGroupReducer.selectedGroupType,
  };
};

const mapActionsToProps = {
  setSelectedProductGrpType,
  setProdGroupFilteredProds,
  resetFilterProds,
};
export default connect(mapStateToProps, mapActionsToProps, null, {
  forwardRef: true,
})(GroupType);
