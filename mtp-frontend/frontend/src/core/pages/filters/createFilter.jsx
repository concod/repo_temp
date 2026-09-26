import React, { useState, useEffect } from "react";
import axiosInstance from "../../Utils/axios";
import { connect } from "react-redux";
import "./index.scss";
import TextField from "@mui/material/TextField";
import { InputLabel } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import ReactSelect from "../../Utils/select";
import { Switch } from "impact-ui";
import TableKeyValue from "./TableKeyValue";
import { getFilterfields, setFilterElements } from "../../actions/filterAction";

const useStyles = makeStyles(() => ({
  root: {
    flexFlow: "row",
    width: "100%",
    "& .MuiInputBase-input": {
      padding: "10px",
    },
    "& . .MuiFormLabel-root ": {
      color: "rgb(0 0 0 / 80%)",
    },
  },
  label: {
    color: "black",
  },
}));

const CreateFilter = (props) => {
  const [selectedModel, setselectedModel] = useState("");
  const [selectedField, setselectedField] = useState("");
  const [selectedLabel, setselectedLabel] = useState("");
  const [selectedDisplayOrder, setselectedDisplayOrder] = useState("");
  const [selectedIsParent, setselectedIsParent] = useState(false);
  const [selectedParentId, setselectedParentId] = useState("");
  const [selectedFilterType, setselectedFilterType] = useState("");
  const [selectedFilterOp, setselectedFilterOp] = useState("");
  const [listfilteroptions, setfilteroptions] = useState([]);
  const [listparentids, setlistparentids] = useState([]);
  const [contenttype, setcontenttype] = useState(0);
  const classes = useStyles();
  var models = {
    ticket: 87,
    subticket: 88,
  };
  var filtertype = [
    "Text",
    "Integer",
    "Select",
    "DateTime",
    "Radio",
    "Checkbox",
    "Boolean",
  ];
  var filteroptions = {
    Text: ["icontains", "iexact"],
    Integer: ["lte", "gte", "equal"],
    Select: ["iexact"],
    DateTime: ["lte", "gte", "equal"],
    Boolean: ["equal"],
    Radio: [],
  };
  var listoffiltertypes = [];

  const filtermap = (option) => {
    return {
      label: option,
      value: option,
    };
  };
  listoffiltertypes = filtertype.map(filtermap);
  const optionMap = (option) => {
    return {
      label: option[0],
      value: option[1],
    };
  };
  const optionfilterkeyMap = (option) => {
    return {
      label: option[1].field_name,
      value: option[1].id,
    };
  };

  const optionParentIdMap = (option) => {
    return {
      label: option[1].label,
      value: option[1].id,
    };
  };

  useEffect(() => {
    async function saveRequest() {
      try {
        const { data } = await axiosInstance({
          url: "/common/filter_elements/",
          method: "GET",
        });
        setlistparentids(
          Object.entries(data.data.results)
            .filter((item) => item[1].is_parent)
            .map(optionParentIdMap)
        );
      } catch (err) {
        setlistparentids([]);
        if (err.response && !err.response.data.status) {
          //setIsLoading(false)
          return { status: false, message: err.response.data.data };
        }

        //setIsLoading(false)
      }
    }
    saveRequest();
  }, []);

  return (
    <div className={classes.root}>
      <form onSubmit={handleSubmit} onReset={resetForm}>
        <div className="input-group">
          <InputLabel required className="filter-text">
            Model name
          </InputLabel>
          <ReactSelect
            name={"Model"}
            placeholder="Model"
            isSearchable={false}
            options={Object.entries(models).map(optionMap)}
            value={selectedModel}
            className="filter-inp"
            onChange={(option) => updatemodel(option)}
          />
        </div>
        <div className="input-group">
          <InputLabel className="filter-text">Filter Keyword</InputLabel>
          <ReactSelect
            name={"Filter Keywords"}
            placeholder="Select Keyword"
            options={Object.entries(props.filterfields).map(optionfilterkeyMap)}
            value={selectedField}
            isSearchable={false}
            className="filter-inp"
            onChange={(option) => updatefield(option)}
          />
        </div>
        <div className="input-group">
          <InputLabel required className="filter-text">
            Label
          </InputLabel>
          <TextField
            variant="outlined"
            className="filter-inp"
            placeholder="Label"
            value={selectedLabel}
            onChange={updatelabel}
          />
        </div>
        <div className="input-group">
          <InputLabel required className="filter-text">
            Display Order
          </InputLabel>
          <TextField
            variant="outlined"
            className="filter-inp"
            placeholder="Order"
            value={selectedDisplayOrder}
            onChange={updateDisplayOrd}
          />
        </div>
        <div className="input-group">
          <InputLabel required className="filter-text">
            Is Parent
          </InputLabel>
          <Switch
            name="isparent"
            checked={selectedIsParent}
            value={selectedIsParent}
            onChange={updateIsParent}
          />
        </div>
        <div className="input-group">
          <InputLabel className="filter-text">Parent id</InputLabel>
          <ReactSelect
            name={"Parent Id"}
            isSearchable={false}
            className="filter-inp"
            options={listparentids}
            value={selectedParentId}
            placeholder="Parent Id"
            onChange={updateParentId}
          />
        </div>

        <div className="input-group">
          <InputLabel required className="filter-text">
            Filter Type
          </InputLabel>
          <ReactSelect
            name={"Filter Type"}
            isSearchable={false}
            className="filter-inp"
            options={listoffiltertypes}
            value={selectedFilterType}
            placeholder="Filter Type"
            onChange={updateFilterType}
          />
        </div>
        <div className="input-group">
          <InputLabel className="filter-text">Filter option</InputLabel>
          <ReactSelect
            name={"Filter Option"}
            isSearchable={false}
            className="filter-inp"
            options={listfilteroptions}
            onChange={updateFilterOption}
            value={selectedFilterOp}
            placeholder="Filter Option"
          />
        </div>
        <div className="input-group">
          {selectedFilterType.value === "Radio" ? (
            <div className="input-group">
              <InputLabel className="filter-text">Key-value Options</InputLabel>
              <TableKeyValue></TableKeyValue>
            </div>
          ) : (
            <div></div>
          )}
        </div>

        <br />
        <input className="filter-btn" type="submit" value="submit" />
        <input className="filter-btn" type="reset" value="reset" />
      </form>
    </div>
  );
  function updatemodel(option) {
    if (option.label !== selectedModel.label) {
      setselectedField("");
    }
    setselectedModel(option);
    setcontenttype(option.value);
    props.getFilterfields(option.label);
  }
  function updatefield(option) {
    setselectedField(option);
  }
  function updatelabel(event) {
    setselectedLabel(event.target.value);
  }
  function updateDisplayOrd(event) {
    setselectedDisplayOrder(event.target.value);
  }
  function updateIsParent(option) {
    setselectedIsParent(~selectedIsParent);
  }
  function updateFilterType(option) {
    setselectedFilterType(option);
    setfilteroptions(filteroptions[option.value].map(filtermap));
  }
  function updateFilterOption(option) {
    setselectedFilterOp(option);
  }
  function updateParentId(option) {
    setselectedParentId(option);
  }

  function handleSubmit(event) {
    event.preventDefault();
    var data = {
      content_type: contenttype,
      //filter_keyword_id : selectedField,
      is_parent: Boolean(selectedIsParent),
      label: selectedLabel,
      display_order: Number(selectedDisplayOrder),
      filter_type: selectedFilterType.label,
      filter_operations: selectedFilterOp.label,
    };
    props.setFilterElements(data);
  }
  function resetForm() {
    setselectedField("");
    setselectedFilterOp("");
    setselectedDisplayOrder("");
    setselectedLabel("");
    setselectedIsParent(false);
    setselectedModel("");
    setselectedFilterType("");
    setfilteroptions([]);
  }
};

const mapStateToProps = (state) => {
  return {
    filterfields: state.filterElementsReducer.filterfields,
  };
};

const mapActionsToProps = {
  getFilterfields,
  setFilterElements,
};

export default connect(mapStateToProps, mapActionsToProps)(CreateFilter);
