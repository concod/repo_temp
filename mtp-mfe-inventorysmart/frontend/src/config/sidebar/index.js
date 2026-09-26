import { sideBarOptions as inventorysmart_sideBarOptions } from "modules/inventorysmart/routes-inventorysmart/routes";
import { sideBarOptions as adda_sideBarOptions } from "modules/ada/routes-ada/routes";
import {
  notificationSideBarOptions,
  uamSideBarOptions,
} from "core/commonComponents/core-layout";
export const sideBarDataSet = {
  inventorysmart: inventorysmart_sideBarOptions,
  ada: adda_sideBarOptions,
  notification: notificationSideBarOptions,
  "application access management": uamSideBarOptions,
};
