import { sideBarOptions as inventorysmart_sideBarOptions } from "modules/inventorysmart/routes-inventorysmart/routes";
import { sideBarOptions as assortsmart_sideBarOptions } from "modules/assortsmart/routes-assortsmart/routes";
import { sideBarOptions as adda_sideBarOptions } from "modules/ada/routes-ada/routes";
import { sideBarOptions as demandsmart_sideBarOptions } from "modules/demandsmart/routes-demandsmart/routes";
import { sideBarOptions as marksmart_sideBarOptions } from "modules/marksmart/routes-marksmart";
import { sideBarOptions as plansmart_sideBarOptions } from "modules/plansmart/routes-plansmart";
import {
  notificationSideBarOptions,
  uamSideBarOptions,
} from "core/commonComponents/core-layout";
export const sideBarDataSet = {
  inventorysmart: inventorysmart_sideBarOptions,
  assortsmart: assortsmart_sideBarOptions,
  ada: adda_sideBarOptions,
  demandsmart: demandsmart_sideBarOptions,
  marksmart: marksmart_sideBarOptions,
  plansmart: plansmart_sideBarOptions,
  notification: notificationSideBarOptions,
  "application access management": uamSideBarOptions,
};
