import React, { useState } from "react";
import { Button, Drawer, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import makeStyles from "@mui/styles/makeStyles";
import clsx from "clsx";
import colours from "core/Styles/colours";
import Select from "core/Utils/select";
import { connect } from "react-redux";
import { useEffect } from "react";
import {
  fetchMatchWithKpiList,
  planSmartMatchWithKpiListLoaderSelector,
  planSmartMatchWithKpiListSelector,
} from "modules/plansmart/services-plansmart/BudgetPlanTable/budget-plan-table-service";
import { useMemo } from "react";
import LoadingOverlay from "core/Utils/Loader/loader";
import { getMatchWithSeason } from "modules/plansmart/constants-plansmart/stringConstants";

const useStyles = makeStyles((theme) => ({
  drawer: {
    flexShrink: 0,
    whiteSpace: "nowrap",
    backgroundColor: theme.palette.common.white,
  },
  drawerOpen: {
    width: 516,
    height: "calc(100% - 105px)",
    right: 50,
    top: 105,
  },
  drawerClose: {
    width: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 20px",
    borderBottom: "1px solid #EFEFEF",
    alignItems: "center",
    fontWeight: 600,
    height: 40,
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colours.catskillWhite,
    width: "100%",
    padding: "12px 20px",
  },
  body: {
    marginTop: "0.75rem",
    padding: "12px 20px",
  },
  dropDownGroup: {
    marginTop: "1.5rem",
  },
  mainSelectContainer: {
    paddingTop: "20px",
    display: "flex",
    gap: "24px",
    flexDirection: "column",
    width: "100%",
  },

  selectContainer: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    "& .label": {
      flexBasis: "20%",
    },
    "& > div:last-child": {
      flexBasis: "55%",
    },
  },
}));

const MatchWith = ({
  isOpen,
  onClose,
  planRefColMapping,
  planRefColVal,
  fetchMatchWithKpiListReq,
  matchWithKpiListLoader,
  matchWithKpiList,
  onSave,
  planDetails,
}) => {
  const classes = useStyles();

  const [selectedVersion, setSelectedVersion] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedKpi, setSelectedKpi] = useState(null);
  const season = getMatchWithSeason(planDetails?.status);

  const formattedCategoryList = useMemo(() => {
    const formattedMatchWithKpiList = matchWithKpiList.map((categoryObj) => ({
      ...categoryObj,
      label: categoryObj.category_name,
      value: categoryObj.category_name,
    }));
    if (selectedVersion?.value === "forcasted")
      return formattedMatchWithKpiList;
    return [{ label: "Select all", value: "all" }].concat(
      formattedMatchWithKpiList
    );
  }, [matchWithKpiList, selectedVersion]);

  const disableKpiSelection = useMemo(() => selectedCategory?.value === "all", [
    selectedCategory,
  ]);

  const kpiList = useMemo(() => {
    const selectedOption = (formattedCategoryList || []).find(
      (option) => option?.value === selectedCategory?.value
    );
    const kpiListData = [];
    if (selectedOption) {
      selectedOption?.kpis?.forEach((kpi) => {
        //TODO: temporary fix need to move this check backend
        if (
          planDetails?.business_unit === "Wholesale"
            ? !kpi.kpi?.startsWith("non_comp")
            : true
        ) {
          kpiListData.push({
            ...kpi,
            value: kpi.kpi,
          });
        }
      });
    }
    return kpiListData;
  }, [selectedCategory, planDetails]);

  const handleVersionSelection = (option) => {
    fetchMatchWithKpiListReq(season, option?.value);
    setSelectedVersion(option);
    setSelectedCategory(null);
    setSelectedKpi(null);
  };

  const handleCategorySelection = (option) => {
    setSelectedCategory(option);
    setSelectedKpi(null);
  };

  const handleApply = () => {
    onClose();
    onSave(selectedVersion, selectedCategory, selectedKpi);
    setSelectedVersion(null);
    setSelectedCategory(null);
    setSelectedKpi(null);
  };

  return (
    <Drawer
      open={isOpen}
      anchor="right"
      variant="permanent"
      className={clsx(classes.drawer, {
        [classes.drawerOpen]: isOpen,
        [classes.drawerClose]: !isOpen,
      })}
      classes={{
        paper: clsx(
          {
            [classes.drawerOpen]: isOpen,
            [classes.drawerClose]: !isOpen,
          },
          classes.drawer
        ),
      }}
    >
      <LoadingOverlay loader={matchWithKpiListLoader}>
        <div className={classes.header}>
          <div>Match WP with</div>
          <IconButton aria-label="close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <div className={classes.body}>
          <Typography variant="subtitle1">
            Choose the metrics that you want to override the values with
          </Typography>

          <div className={classes.mainSelectContainer}>
            <div className={classes.selectContainer}>
              <Typography component={"div"} className="label">
                Match with
              </Typography>
              <Select
                label="Match with"
                options={planRefColMapping}
                value={selectedVersion}
                onChange={handleVersionSelection}
                isSearchable={false}
              />
            </div>
            <div className={classes.selectContainer}>
              <Typography component={"div"} className="label">
                Category
              </Typography>
              <Select
                label="Category"
                options={formattedCategoryList}
                value={selectedCategory}
                onChange={handleCategorySelection}
                isSearchable={false}
              />
            </div>
            <div className={classes.selectContainer}>
              <Typography component={"div"} className="label">
                KPI
              </Typography>
              <Select
                label="KPI"
                options={kpiList}
                value={selectedKpi}
                onChange={setSelectedKpi}
                isSearchable={true}
                isDisabled={disableKpiSelection}
              />
            </div>
          </div>
        </div>

        <div className={classes.footer}>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={
              !selectedVersion?.value ||
              !selectedCategory?.value ||
              (selectedCategory?.value !== "all" && !selectedKpi?.value)
            }
          >
            Apply
          </Button>
        </div>
      </LoadingOverlay>
    </Drawer>
  );
};

const mapState = (state) => {
  return {
    matchWithKpiListLoader: planSmartMatchWithKpiListLoaderSelector(state),
    matchWithKpiList: planSmartMatchWithKpiListSelector(state),
  };
};

const mapDispatch = (dispatch) => {
  return {
    fetchMatchWithKpiListReq: (season, version) =>
      dispatch(fetchMatchWithKpiList(season, version)),
  };
};

export default connect(mapState, mapDispatch)(MatchWith);
