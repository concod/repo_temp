import { sideBarOptions as inventorysmart_sideBarOptions } from "modules/inventorysmart/routes-inventorysmart/routes";
import { sideBarOptions as assortsmart_sideBarOptions } from "modules/assortsmart/routes-assortsmart/routes";
import { sideBarOptions as adda_sideBarOptions } from "modules/ada/routes-ada/routes";
import { sideBarOptions as marksmart_sideBarOptions } from "modules/marksmart/routes-marksmart";
import { sideBarOptions as plansmart_sideBarOptions } from "modules/plansmart/routes-plansmart";
import { ticketingSidebarOptions } from "core/pages/ticketing-system/routes-ticketing-system";
import {
  notificationSideBarOptions,
  uamSideBarOptions,
} from "core/commonComponents/core-layout";
export const sideBarDataSet = {
  inventorysmart: inventorysmart_sideBarOptions,
  assortsmart: assortsmart_sideBarOptions,
  ada: adda_sideBarOptions,
  marksmart: marksmart_sideBarOptions,
  plansmart: plansmart_sideBarOptions,
  notification: notificationSideBarOptions,
  ticketing: ticketingSidebarOptions,
  "application access management": uamSideBarOptions,
};
