import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import TabsComponent from "core/commonComponents/tabs";

function TabsComponentScreen(props) {
  return (
    <CoreComponentScreen
      pageLabel={props.pageLabel}
      showPageRoute={props.showPageRoute}
      showPageHeader={props.showPageHeader}
      routeAction={props.routeAction}
      contained={props.contained}
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
TabsComponentScreen.defaultProps = {
  showPageRoute: true,
  showPageHeader: true,
  contained: true
}

export default TabsComponentScreen;
