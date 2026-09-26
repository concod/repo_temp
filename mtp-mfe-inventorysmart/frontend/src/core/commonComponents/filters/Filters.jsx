import React from "react";
import { connect } from "react-redux";
import "./Filters.scss";
import { Select } from "./Select";
// import { DateRange } from "./DateRange";
import { CheckBox } from "./CheckBox";

function Filters(props) {
  const filterRender = (params) => {
    switch (params.filterType) {
      case "SingleSelect":
        return <Select />;

      case "MultiSelect":
        return <Select is_multiSelect={true} />;

      // case "DateRange":
      //   return <DateRange />;

      case "CheckBox":
        return <CheckBox />;
      default:
        return <>default hit</>;
    }
  };

  return (
    <div className="d-flex row ml-4 mr-4 mb-4">
      {props.filters.map((filter, i) => (
        <div className="col-md-2" key={i}>
          {filter.isDisplay && (
            <React.Fragment>
              <label
              // className={classNames(
              //   "mb-1 mt-3",
              //   filter.isRequired ? "required" : ""
              // )}
              >
                {filter.label}
              </label>
              {filterRender(filter)}
            </React.Fragment>
          )}
        </div>
      ))}
    </div>
  );
}

const mapStateToProps = (store) => {
  return {
    filters: store.filtersReducer.filters,
  };
};
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(Filters);
