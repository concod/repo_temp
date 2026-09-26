import { useState, useEffect } from "react";
import FilterGroupSection from "./FilterGroupSection";
import LoadingOverlay from "core/Utils/Loader/loader";
import { Switch } from "impact-ui-v3";
import InfoIcon from "@mui/icons-material/Info";
import { connect } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import { setSelectedFilters } from "core/actions/filterAction";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles((theme) => ({
  stackedFiltersContainer: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    gap: "24px",
    "& .dimension-section": {
      width: "100%",
      display: "flex",
      flexDirection: "column",
      padding: "16px 12px",
      alignItems: "flex-start",
      gap: "16px",
      alignSelf: "stretch",
      borderRadius: "8px",
      background: "#FFF",
      "& .header": {
        fontSize: "16px",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        "& img": {
          width: "20px",
          height: "20px",
        },
      },
      "& .toggle-section": {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        alignItems: "flex-start",
      },
      "& .toggle-btn-section": {
        display: "flex",
        padding: "6px 8px",
        alignItems: "center",
        gap: "16px",
        alignSelf: "stretch",
        borderRadius: "8px",
        background: "#F5F6FA",
      },
      "& .info-message": {
        display: "flex",
        padding: "8px 16px",
        gap: "12px",
        alignItems: "center",
        borderRadius: "8px",
        background: "#E2F4FF",
        fontWeight: 600,
        "& svg": {
          color: "#4259EE",
        },
      },
    },
  },
}));

const StackedFiltersPanel = (props) => {
  const [showFilters, setShowFilters] = useState({});
  const [filtersData,setFiltersData] = useState({});
  const [filterScreenNames,setFilterScreenNames] = useState([]);

  const classes = useStyles();

  useEffect(() => {
    if(!isEmpty(filtersData) && isEmpty(showFilters)){
      let data = {};
      filtersData?.filters?.forEach((dimension) => {
        data[dimension.value] = false;
      });
      setShowFilters(data);
    }
  }, [filtersData]);

  useEffect(() => {
    if(!isEmpty(props.filtersData)){
      let data = cloneDeep(props.filtersData);
      let filters = data.filters || [];
      const order = { product: 1, store: 2 };
      filters = filters.sort((a, b) => {
        const aIdx = order[a?.value] ?? 999;
        const bIdx = order[b?.value] ?? 999;
        return aIdx - bIdx;
      });
      setFiltersData(data);
      let screens = [];
      props.filtersData?.filters?.forEach(filterDimension => {
        if(!screens.includes(filterDimension?.item?.screenName)){
          screens.push(filterDimension.item.screenName);
        }
      })
      setFilterScreenNames(screens);
    }
    
  },[props.filtersData]);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters) && !isEmpty(filterScreenNames)) {
      let data = cloneDeep(showFilters);
      Object.entries(props.selectedFilters)?.forEach(([key, value]) => {
        if (filterScreenNames?.includes(key) && value.length > 0) {
          let dimension = value[0].dimension;
          data[dimension] = true;
        }
      });
      setShowFilters(data);
    }
  }, [props.selectedFilters]);

  const handleToggleChange = (e, filter) => {
    setShowFilters((prev) => ({ ...prev, [filter.value]: e.target.checked }));
    props.stackedFiltersPanelConfigs?.[filter.value]?.toggle?.onChange(e);
    if (!e.target.checked) {
      const screenName = filter.item?.screenName;
      if (screenName) {
        let filters = cloneDeep(props.selectedFilters);
        filters[screenName] = [];
        props.setSelectedFilters(filters);
      }
    }
  };

  return (
    <LoadingOverlay loader={props.firstTimeRenderLoader}>
      <div className={classes.stackedFiltersContainer}>
        {filtersData.filters?.map((filter) => {
          const configs = props.stackedFiltersPanelConfigs[filter.value];
          return (
            <div className="dimension-section">
              <div className="header">
                {configs.icon && <img src={configs.icon} />}
                {filter.title}
              </div>
              {configs?.toggle?.enabled && (
                <div className="toggle-section">
                  <div className="toggle-btn-section">
                    <Switch
                      leftLabel={configs?.toggle?.toggleMessage}
                      onChange={(e) => handleToggleChange(e, filter)}
                      value={showFilters[filter.value]}
                    />
                  </div>
                  {!showFilters[filter.value] && (
                    <div className="info-message">
                      <InfoIcon fontSize="small" />
                      <p>{configs?.toggle?.infoMessage}</p>
                    </div>
                  )}
                </div>
              )}
              {((configs?.toggle?.enabled && showFilters[filter.value]) ||
                !configs?.toggle?.enabled) && (
                <FilterGroupSection
                  {...props}
                  alignClearButton={props.alignClearButton}
                  item={filter.item}
                  filter={filter.filter}
                  setMappingKeys={props.setMappingKeys}
                  setFilterDependencyChips={props.setFilterDependencyChips}
                  setShowFilterLoader={props.setShowFilterLoader}
                  showFilterLoader={props.showFilterLoader}
                  filterSectionRadio={props.filterSectionRadio}
                  isEditModalOpen={props.isEditModalOpen}
                  disableFilterModal={props.disableFilterModal}
                />
              )}
            </div>
          );
        })}
      </div>
    </LoadingOverlay>
  );
};

const mapStateToProps = (state) => {
  return {
    selectedFilters: state.filterReducer.selectedFilters,
  };
};

const mapActionToProps = (dispatch) => {
  return {
    setSelectedFilters: (body) => dispatch(setSelectedFilters(body)),
  };
};

export default connect(mapStateToProps, mapActionToProps)(StackedFiltersPanel);
