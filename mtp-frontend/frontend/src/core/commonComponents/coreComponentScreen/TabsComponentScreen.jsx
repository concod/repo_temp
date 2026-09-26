import React from "react";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import TabsComponent from "core/commonComponents/tabs";

function TabsComponentScreen(props) {
  return (
    <CoreComponentScreen
      pageLabel={props.pageLabel}
      showPageRoute={true}
      showPageHeader={true}
      routeAction={props.routeAction}
      contained={true}
      hideNoDataFound
    >
      <TabsComponent
        tabPannelStyle={{ padding: "0px" }}
        tabContainerstyle={{ padding: "0px" }}
        tabHeadingStyle={{ padding: "0" }}
        tabsData={props.tabsComponentList}
      />
    </CoreComponentScreen>
  );
}

export default TabsComponentScreen;
