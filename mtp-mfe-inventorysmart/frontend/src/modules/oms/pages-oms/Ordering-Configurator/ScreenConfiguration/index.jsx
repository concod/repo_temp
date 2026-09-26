import React, { useMemo, useState, useEffect } from "react";
import { Tabs, Tab, Button } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import classNames from "classnames";
import { Grid } from "@mui/material";
import FilterConfigTable from "./FilterConfigTable";
import TableConfigTable from "./TableConfigTable";
import Loader from "core/Utils/Loader/loader";
import { connect, useDispatch } from "react-redux";
import { fetchproductFilterData } from "modules/oms/services-oms/Ordering-Configurator/ordering-configurator-service.js";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useNavigate } from "react-router-dom-v5-compat";
import CustomConfigScreen from "./CustomConfigScreen";

const ScreenConfigurationScreen = (props) => {
  const [tabValue, setTabValue] = useState("");
  const [productFilters, setProductFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const globalClasses = globalStyles();
  const navigate = useNavigate();

  const moduleName = useMemo(() => {
    return localStorage.getItem("moduleName") || "";
  }, []);

  const isKpi = useMemo(() => {
    const value = localStorage.getItem("is_kpi");
    return value !== null && value !== "undefined" && value !== undefined;
  });

  const showFilterConfig = useMemo(() => {
    const fcName = localStorage.getItem("module_fc_name");
    const fcCode = localStorage.getItem("module_fc_code");
    const show =
      fcName &&
      fcName !== "undefined" &&
      fcName !== "null" &&
      fcCode &&
      fcCode !== "undefined" &&
      fcCode !== "null";
    console.log(
      "showFilterConfig:",
      show,
      "fcName:",
      fcName,
      "fcCode:",
      fcCode
    );
    return show;
  }, []);

  const showTableConfig = useMemo(() => {
    const tcName = localStorage.getItem("module_tc_name");
    const tcCode = localStorage.getItem("module_tc_code");
    const show =
      tcName &&
      tcName !== "undefined" &&
      tcName !== "null" &&
      tcCode &&
      tcCode !== "undefined" &&
      tcCode !== "null";
    console.log("showTableConfig:", show, "tcName:", tcName, "tcCode:", tcCode);
    return show;
  }, []);

  const tabsList = useMemo(() => {
    const tabs = [];

    if (showFilterConfig) {
      tabs.push({ label: "Filter Configurations", value: "filter_config" });
    }

    if (showTableConfig) {
      tabs.push({ label: "Table Configurations", value: "table_config" });
    }

    if (isKpi) {
      tabs.push({ label: "Custom Configurations", value: "custom_config" });
    }

    return tabs;
  }, [showFilterConfig, showTableConfig, isKpi]);

  const renderTabComponents = () => {
    const Mapper = {
      filter_config: (
        <FilterConfigTable
          productFilters={productFilters}
          moduleName={moduleName}
        />
      ),
      table_config: <TableConfigTable moduleName={moduleName} />,
      custom_config: (
        <CustomConfigScreen moduleName={moduleName} isKpi={isKpi} />
      ),
    };
    return tabsList.map((thisTab) => (
      <div key={thisTab.value}>{Mapper[thisTab.value]}</div>
    ));
  };

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  //   if (loading || !productFilters) {
  //     return <Loader loader={loading}></Loader>;
  //   }

  // Set initial tab value to the first available tab
  useEffect(() => {
    if (tabsList.length > 0 && !tabValue) {
      setTabValue(tabsList[0].value);
    }
  }, [tabsList, tabValue]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        //call the modules API
        const orderingModuleProductFilter = await props.fetchproductFilterData();
        if (orderingModuleProductFilter?.data?.status) {
          console.log("filtersData", orderingModuleProductFilter?.data);
          setProductFilters(orderingModuleProductFilter?.data?.data);
          setLoading(false);
          // let modulesDataResp = [
          //     orderingModuleConfiguartorData?.data?.data
          // ]
          // const transformedData = convertAPIDataToDummyDataFormat(
          //     modulesDataResp
          // );
          // setModulesData(transformedData);
          // setFilteredModule(transformedData);
          // setLoading(false);
        }
      } catch (err) {
        console.log("error", err);
        //displaySnackMessages(err?.message || "Something went wrong", "error");
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const routeOptions = [
    {
      label: "Home",
      to: "/home",
    },
    {
      id: 1,
      label: "Module Super Admin",
      action: () => {
        navigate(
          `/inventory-smart/configurator/${"ordering"}/module-configurator`
        );
      },
    },
    {
      id: 2,
      label: "Screen Super Admin",
      // action: () => {
      //   navigate("/configurator/ordering/module-configurator");
      // },
    },
  ];

  return (
    <>
      <Loader loader={loading}>
        {productFilters.length !== 0 && (
          <div className={globalClasses.paddingAround}>
            <HeaderBreadCrumbs options={routeOptions}></HeaderBreadCrumbs>
            {/* <div style={{ fontSize: 18, fontWeight: 600, }}>
        {moduleName ? `${moduleName} Screen Configuration` : 'Screen Configuration'}
      </div> */}
            <div
              className={classNames(globalClasses.marginTop)}
              style={{ marginTop: "26px" }}
            >
              <Tabs
                value={tabValue}
                onChange={handleChangeTabValue}
                aria-label="oms-product-details-tabs"
                tabNames={[...tabsList]}
                tabPanels={renderTabComponents()}
              ></Tabs>
            </div>
          </div>
        )}
      </Loader>
    </>
  );
};

const mapDispatchToProps = (dispatch) => ({
  fetchproductFilterData: (payload) =>
    dispatch(fetchproductFilterData(payload)),
});

export default connect(null, mapDispatchToProps)(ScreenConfigurationScreen);
