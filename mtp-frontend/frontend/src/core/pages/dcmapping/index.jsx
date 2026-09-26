import React, { useEffect } from "react";
import { connect } from "react-redux";
import DCtoStore from "./components/dc-store-mapping";
import DCtoProduct from "./components/dc-product-mapping";
import TabsComponentScreen from "core/commonComponents/coreComponentScreen/TabsComponentScreen";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { setDcMappingIsAggregated } from "./services-dc-mapping/dc-mapping-service";
import { dynamicLabelKeysBasedOnTenant } from "core/Utils/DynamicLabels";
import { useNavigate } from "react-router-dom-v5-compat";

function DCMapping(props) {
  const tabsComponentList = [
    {
      label: "DC-Store",
      id: "dc-store-fc",
      TabPanel: (
        <DCtoStore
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.inventorysmartScreenConfig?.roleBasedAccess}
        />
      ),
    },
    {
      label: `DC-${dynamicLabelsBasedOnTenant("product", "core")}`,
      id: "dc-product",
      TabPanel: (
        <DCtoProduct
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.inventorysmartScreenConfig?.roleBasedAccess}
        />
      ),
    },
    // {
    //   label: "FC-Store",
    //   id: "fc-store",
    //   TabPanel: <StoreToFc />,
    // },
  ];

  useEffect(() => {
    const setAggregated = async () => {
      const displayLevelsResp = await props.getTenantConfigApplicationLevel(3, {
        attribute_name: "display_levels",
      });
      if (
        displayLevelsResp?.data?.data?.[0]?.["attribute_value"] &&
        displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.["value"]?.[
          "product"
        ]
      ) {
        const hidden_levels =
          displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.["value"]?.[
            "product"
          ]?.["hidden_levels"];
        if (hidden_levels.includes("product")) {
          props.setIsAggregated(true);
        }
      }
    };
    setAggregated();
  }, []);

  return (
    <TabsComponentScreen
      pageLabel={"DC Mapping"}
      tabsComponentList={tabsComponentList}
    />
  );
}
const StoreToFc = (props) => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/store-mapping", {
      state: {
        isRedirect: true,
      },
    });
  }, []);
  return <></>;
};

const mapStateToProps = (state) => {
  return {
    inventorysmartScreenConfig:
      state.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
  };
};

const mapActionsToProps = {
  setDcMappingIsAggregated,
};

export default connect(mapStateToProps, mapActionsToProps)(DCMapping);
