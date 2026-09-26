import { useEffect, useState, useMemo } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import moment from "moment";
import globalStyles from "core/Styles/globalStyles";
import React from "react";
import { ButtonGroup } from "impact-ui-v3";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { addSnack } from "core/actions/snackbarActions";
import { CREATE_NEW_ORDER } from "modules/oms/constants-oms/routeConstants";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import CreateNewOrderForVendorDC from "./components/CreateNewOrderForVendorDC";
import CreateNewOrderForVendorStore from "./components/CreateNewOrderForVendorStore";
import { getOmsCoreFiscalCalendar } from "modules/oms/services-oms/common/common-services";
import { useStyles as omsUseStyles } from "modules/oms/styles-oms/orderingCustomStyles";

const CreateNewOrder = (props) => {
  const globalClasses = globalStyles();
  const omsClasses = omsUseStyles();

  const navigate = useNavigate();

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupOptions, setGroupOptions] = useState(null);

  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [pageLoader, setPageLoader] = useState(false);
  const [showOffCycleOrder, setShowOffCycleOrder] = useState(false);

  useEffect(() => {
    const isCalledFromVendorStore =
      JSON.parse(localStorage.getItem("isRedirectedFromVendorStore")) === true;
    if (isCalledFromVendorStore) {
      setSelectedGroup("vendor_store");
    } else {
      setSelectedGroup("vendor_dc");
    }
    return () => {
      localStorage.removeItem("isRedirectedFromVendorStore");
    };
  }, []);

  useEffect(() => {
    const groupButtons = props.vendorToStoreScreenConfig?.headers_tab;
    setGroupOptions(groupButtons);
  }, [props.vendorToStoreScreenConfig]);

  const handleGroupChange = (event, newValue) => {
    setSelectedGroup(newValue);
    setShowOffCycleOrder(false);
  };

  const breadCrumbOptions = useMemo(
    () => [
      {
        label: "Home",
        to: "/home",
      },
      {
        label: showOffCycleOrder
          ? "Create new off cycle order"
          : "Create New Order",
        id: 1,
        action: () => {
          navigate(CREATE_NEW_ORDER);
        },
      },
    ],
    [showOffCycleOrder, navigate]
  );

  useEffect(() => {
    const fetchFiscalCalendar = async () => {
      try {
        setPageLoader(false);
        let startYear = moment().year();
        let endYear = moment().year() + 2;
        let queryParams = `?start_fiscal_year=${startYear}&end_fiscal_year=${endYear}`;
        const getFinancialCalendarData = await getOmsCoreFiscalCalendar(
          queryParams
        );
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
      } catch (error) {
        setPageLoader(true);
        props.addSnack({
          message: ERROR_MESSAGE,
          options: {
            variant: "error",
          },
        });
      }
    };
    fetchFiscalCalendar();
  }, []);

  const renderGroupOptions = () => {
    return (
      groupOptions && (
        <div
          className={`${globalClasses.centerAlign} ${globalClasses.marginBottom}`}
        >
          <ButtonGroup
            onChange={handleGroupChange}
            options={groupOptions}
            selectedOption={selectedGroup}
          />
        </div>
      )
    );
  };

  return (
    <div className={omsClasses.paddingLayout}>
      {selectedGroup === "vendor_dc" ? (
        <CreateNewOrderForVendorDC
          screenName={props.screenName}
          pageLoader={pageLoader}
          setPageLoader={setPageLoader}
          fiscalCalendarDetails={fiscalCalendarDetails}
          onOffCycleOrderVisibilityChange={setShowOffCycleOrder}
          renderGroupOptions={renderGroupOptions}
          headerBreadCrumb={<HeaderBreadCrumbs options={breadCrumbOptions} />}
        />
      ) : (
        <CreateNewOrderForVendorStore
          screenName={props.screenName}
          fiscalCalendarDetails={fiscalCalendarDetails}
          renderGroupOptions={renderGroupOptions}
          headerBreadCrumb={<HeaderBreadCrumbs options={breadCrumbOptions} />}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    vendorToStoreScreenConfig:
      store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
        ?.create_new_order,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(CreateNewOrder);
