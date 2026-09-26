import Assort_en from "assets/home/assort.svg";
import Ada_en from "assets/home/ada.svg";
import Attribute_en from "assets/home/attribute.svg";
import Price_en from "assets/home/mark.svg";
import Space_en from "assets/home/space.svg";
import Store_en from "assets/home/store.svg";
import Test_en from "assets/home/test.svg";
import Monday_en from "assets/home/monday.svg";
import Plan_en from "assets/home/plansmart.svg";
import Inventory_en from "assets/home/inventory.svg";
import User_en from "assets/home/users.svg";
import Notification_en from "assets/home/notification.svg";
import MasterData_en from "assets/home/masterData.svg";
import Cluster_en from "assets/home/clustersmart.svg";
import {
  uamSideBarOptions,
  notificationSideBarOptions,
} from "core/commonComponents/core-layout";
// import { sideBarOptions as assortSideBarOptions } from "modules/assortsmart/routes-assortsmart/routes";
// import { sideBarOptions as planSideBarOptions } from "modules/plansmart/routes-plansmart";
// import { sideBarOptions as marksmartSideBarOptions } from "modules/marksmart/routes-marksmart";
// import { sideBarOptions as adaSideBarOptions } from "modules/ada/routes-ada/routes";
// import { sideBarOptions as inventorysmartSideBarOptions } from "modules/inventorysmart/routes-inventorysmart/routes";
// import { sideBarOptions as clusterSmartSideBarOptions } from "modules/clusterSmart/routes-clustersmart/routes";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import React from "react";
import { captializeStringIfCamelCase } from "core/Utils/formatter";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

export const allPlatformApps = {
  config: [
    {
      label: "Application Access Management",
      desc: "User Management, Access  and Application Configuration",
      url: uamSideBarOptions[0].link,
      logo: <User_en viewBox="0 0 36 36" />,
      type: "config",
      title: "application access management",
      active: false,
    },
    {
      label: "Notification Center",
      desc: "Alerts, Checklists and Warning configuration",
      url: notificationSideBarOptions[0].link,
      logo: <Notification_en viewBox="0 0 24 32" />,
      type: "config",
      title: "notification",
      active: false,
    },
    {
      label: "Workflow Input Center",
      desc: `Store, ${captializeStringIfCamelCase(
        dynamicLabelsBasedOnTenant("product", "core")
      )} and DC Configurations`,
      url: "/product-mapping",
      logo: <MasterData_en viewBox="0 0 36 30" />,
      type: "config",
      title: "workflow input center",
      active: false,
    },
  ],
  featuredApp: [
    {
      label: "Plan Smart",
      desc:
        "PlanSmart leverages ADA powered AI/ML based long range forecasts to generate merchandising financial plans at multiple levels of product hierarchy. Also, generates optimized plans based on key constraints and strategic objectives.",
      url: planSideBarOptions[0].link,
      web:
        "https://www.impactanalytics.co/solutions/merchandise-financial-planning/",
      logo: <Plan_en viewBox="0 0 32 32" />,
      type: "platformApps",
      title: "plansmart",
      category: "core",
      active: false,
      mapped: false,
      layout: planSideBarOptions,
    },
    {
      label: "Assort Smart",
      desc:
        "With easy-to-use and intuitive interfaces and tools, you will get more granular planning solutions that incorporate our intelligent clustering solution. And our built-in AI and machine learning allow your team to be more efficient, turning out better assortment plans with fewer invested hours of your team’s labor. Our intelligent retail assortment planning technology lets you analyze your inventory data to gain actionable insights that allow you to improve your inventory management process.",
      url: assortSideBarOptions[0].link,
      web:
        "https://www.impactanalytics.co/solutions/retail-assortment-planning/",
      logo: <Assort_en viewBox="0 0 30 30" />,
      type: "platformApps",
      title: "assortsmart",
      category: "core",
      active: false,
      mapped: false,
      layout: assortSideBarOptions,
    },
    {
      label: "Inventory Smart",
      desc:
        "Optimize inventories through retail allocation that leverages predictive analytics for the greatest accuracy in even the most complex allocation and replenishment businesses. Our solution is highly automatable and accurate using leading edge machine learning models that allow for rapid “what-if” simulations to ensure the business is making the right decisions.",
      url: inventorysmartSideBarOptions[0].link,
      web: "https://www.impactanalytics.co/solutions/inventory-allocation/",
      logo: <Inventory_en viewBox="0 0 35 35" />,
      type: "platformApps",
      title: "inventorysmart",
      category: "core",
      active: false,
      mapped: false,
      layout: inventorysmartSideBarOptions,
    },
    {
      label: "ADA Visual",
      desc:
        "Leverage the best-in-class retail and CPG forecasting engine for identifying recent trends, seasonality, and other unique demand drivers, all in one place. Push forecasts into any existing planning and pricing systems. For years, the traditional forecasting algorithms have leaned very heavily on historical data. But with rapid changes in product preferences and consumption patterns, businesses need a more robust framework that includes factors other than just historical data.",
      url: adaSideBarOptions[0].link,
      web: "https://www.impactanalytics.co/",
      logo: <Ada_en viewBox="0 0 32 32" />,
      type: "platformApps",
      title: "ada",
      category: "core",
      active: false,
      mapped: false,
      layout: adaSideBarOptions,
    },
    {
      label: "Cluster Smart",
      desc:
        "With easy-to-use and intuitive interfaces and tools, you will get more granular planning solutions that incorporate our intelligent clustering solution. And our built-in AI and machine learning allow your team to be more efficient, turning out better assortment plans with fewer invested hours of your team’s labor. Our intelligent retail assortment planning technology lets you analyze your inventory data to gain actionable insights that allow you to improve your inventory management process.",
      url: clusterSmartSideBarOptions[0]?.link,
      web: "https://www.impactanalytics.co/",
      logo: <Cluster_en viewBox="0 0 1024 1024" />,
      type: "platformApps",
      title: "clustersmart",
      category: "core",
      active: false,
      mapped: false,
      layout: clusterSmartSideBarOptions,
    },
    {
      label: "Mark Smart",
      desc:
        "Drive retail markdown optimization to maximize revenue and margin growth. Streamline markdowns to optimize total return.",
      url: marksmartSideBarOptions[0].link,
      web:
        "https://www.impactanalytics.co/solutions/retail-price-optimization/",
      logo: <Price_en viewBox="0 0 30 30" />,
      type: "platformApps",
      title: "marksmart",
      category: "core",
      active: false,
      mapped: false,
      layout: marksmartSideBarOptions,
    },
    {
      label: "Price Smart",
      desc:
        "PriceSmart leverages AI to drive decisions on initial, promotional, and clearance pricing to achieve your business objectives. A single application to ensure lifecycle pricing, promotions, pre-season pricing, and end-of-life markdown optimization.",
      web:
        "https://www.impactanalytics.co/solutions/retail-price-optimization/",
      logo: <Price_en viewBox="0 0 30 30" />,
      type: "platformApps",
      title: "pricesmart",
      category: "core",
      active: false,
      mapped: false,
    },
    {
      label: "Space Smart",
      desc:
        "Minimize manual effort and ensure high accuracy in retail space planning, and retail floor planning, through automated and localized space plans and planograms. Leverage artificial intelligence and machine learning to deliver better space planning outcomes, and improved top and bottom-line results for your business.",
      web:
        "https://www.impactanalytics.co/solutions/retail-space-and-floor-planning/",
      logo: <Space_en viewBox="0 0 29 29" />,
      type: "platformApps",
      title: "spacesmart",
      category: "core",
      active: false,
      mapped: false,
    },
    {
      label: "Test Smart",
      desc:
        "TestSmart uses artificial intelligence and machine learning to run multiple simultaneous hypothesis-driven tests across stores, merchandising, marketing, promotions, and more. Take the guesswork out of managing your business, and make statistically informed decisions to drive growth in your business. Our test and learn methodology allows you to rapidly create tests using our guided workflows, and rapidly analyze results to drive immediate margin gains and higher conversion rates. Create powerful hypothesis testing campaigns while keeping your costs low with our next-gen patent-pending test and learn platform.",
      url: "/test-smart/dashboard",
      web: "https://www.impactanalytics.co/solutions/test-and-learn-solution/",
      logo: <Test_en viewBox="0 0 32 34" />,
      type: "platformApps",
      title: "testsmart",
      category: "smartBI",
      active: false,
      mapped: false,
    },
    {
      label: "MondaySmart",
      desc:
        "MondaySmart makes Business Intelligence for retail easy through automated insights based on your data sources so you can get instant insight into critical drivers affecting your business.",
      web:
        "https://www.impactanalytics.co/solutions/data-driven-decision-making-reporting/",
      logo: <Monday_en viewBox="0 0 33 33" />,
      type: "platformApps",
      title: "mondaysmart",
      category: "smartBI",
      active: false,
      mapped: false,
    },
    {
      label: "Attribute Smart",
      desc:
        "Minimize costly manual efforts with AttributeSmart and ensure 95%+ accuracy in automated product tagging workflow for higher EBITDA and CSAT scores. Retail winners invariably have the best product attribution - knowing more about each product they sell and who it will sell to. Increasingly, they are automating this process to improve accuracy and team productivity.",
      web:
        "https://www.impactanalytics.co/solutions/automated-product-tagging/",
      logo: <Attribute_en viewBox="0 0 33 33" />,
      type: "platformApps",
      title: "attribute",
      category: "smartBI",
      active: false,
      mapped: false,
    },
    {
      label: "Store Smart",
      desc:
        "StoreSmart optimizes in-store execution using AI powered recommendations to identify issues affecting local product sales. It assists store managers to identify and resolve gaps in store operations at a product level, improving store performance. Available on mobile and desktop, the application is easy to use and can be quickly implemented.",
      web: "https://www.impactanalytics.co/",
      logo: <Store_en viewBox="0 0 30 30" />,
      type: "platformApps",
      title: "storesmart",
      category: "smartBI",
      active: false,
      mapped: false,
    },
  ],
};

// Temporary data till we integrate Client Information using API's
export const clientInfo = {
  assortsmart: {
    clients: [
      {
        clientName: "Vera Bradley",
        start_year: "2021",
        end_year: "-",
      },
      {
        clientName: "Calvin Klien",
        start_year: "2021",
        end_year: "-",
      },
      {
        clientName: "Puma",
        start_year: "2020",
        end_year: "-",
      },
    ],
  },
  marksmart: {
    clients: [
      {
        clientName: "Vera Bradley",
        start_year: "2021",
        end_year: "-",
      },
    ],
  },
  ada: {
    clients: [
      {
        clientName: "Vera Bradley",
        start_year: "2021",
        end_year: "-",
      },
    ],
  },
  plansmart: {
    clients: [
      {
        clientName: "Vera Bradley",
        start_year: "2021",
        end_year: "-",
      },
    ],
  },
  inventorysmart: {
    clients: [
      {
        clientName: "Vera Bradley",
        start_year: "2021",
        end_year: "-",
      },
      {
        clientName: "Signet",
        start_year: "2021",
        end_year: "-",
      },
      {
        clientName: "Puma",
        start_year: "2020",
        end_year: "-",
      },
      {
        clientName: "Ashley Stewart",
        start_year: "2020",
        end_year: "-",
      },
      {
        clientName: "Tapestry",
        start_year: "2020",
        end_year: "-",
      },
    ],
  },
  pricesmart: {
    clients: [
      {
        clientName: "DSG",
        start_year: "2019",
        end_year: "-",
      },
      {
        clientName: "BJ's Wholesale Club",
        start_year: "2019",
        end_year: "-",
      },
      {
        clientName: "PSP",
        start_year: "2017",
        end_year: "-",
      },
    ],
  },
  testsmart: {
    clients: [
      {
        clientName: "Vera Bradley",
        start_year: "2021",
        end_year: "-",
      },
    ],
  },
};
