import Assort_en from "assets/home/assort.svg";
import Ada_en from "assets/home/ada.svg";
import Attribute_en from "assets/home/attribute.svg";
import Price_Promo_en from "assets/home/promo_logo.svg";
import Price_Markdown_en from "assets/home/markdown_logo.svg";
import Space_en from "assets/home/space.svg";
import Store_en from "assets/home/store.svg";
import Test_en from "assets/home/test.svg";
import Monday_en from "assets/home/monday.svg";
import Plan_en from "assets/home/plansmart.svg";
import Inventory_en from "assets/home/inventory.svg";
import User_en from "assets/home/users.svg?url";
import Notification_en from "assets/home/notification.svg?url";
import ModuleConfigurator_en from "assets/home/moduleConfigurator.svg?url";
import Forecast_en from "assets/home/forecastsmart.svg";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import {
  uamSideBarOptions,
  notificationSideBarOptions,
} from "core/commonComponents/core-layout";
import { sideBarOptions as assortSideBarOptions } from "modules/assortsmart/routes-assortsmart/routes";
import { sideBarOptions as planSideBarOptions } from "modules/plansmart/routes-plansmart";
import { sideBarOptions as adaSideBarOptions } from "modules/ada/routes-ada/routes";
import { sideBarOptions as demandSmartSideBarOptions } from "modules/demandsmart/routes-demandsmart/routes";
import { sideBarOptions as inventorysmartSideBarOptions } from "modules/inventorysmart/routes-inventorysmart/routes";
import React from "react";
import { ENV, TENANT } from "config/api";

export const allPlatformApps = {
  config: [
    {
      label: "Application Access Management",
      desc: "User Management, Access  and Application Configuration",
      url: uamSideBarOptions[0].link,
      logo: User_en,
      type: "config",
      title: "application access management",
      active: false,
    },
    {
      label: "Notification Center",
      desc: "Alerts, Checklists and Warning configuration",
      url: notificationSideBarOptions[0].link,
      logo: Notification_en,
      type: "config",
      title: "notification",
      active: false,
    },
    ...(!ENV || ENV === 'devs' || ENV === 'test' ? [{
      label: "Application Configurator",
      desc: `Module workflow, setup configuration `,
      url: "inventory-smart/configurator/application-configurator",
      logo: ModuleConfigurator_en,
      type: "config",
      title: "module configurator",
      active: false,
      mapped: true,
    }] : []),
  ],
  featuredApp: [
    {
      label: "Plan Smart",
      name: "PlanSmart",
      description: "AI-Native Merchandise Financial Planning Solution",
      details: "PlanSmart is an AI-native merchandise financial planning tool that creates forecast-driven budgets, optimizes open-to-buy spend, and enhances visibility. PlanSmart simplifies workflows, boosts planner productivity, and drives financial precision.",
      folderContent: [
        "Forecast-Driven Budgeting",
        "Scenario-Based Plan Simulations",
        "Hierarchy-Level Planning Flexibility",
      ],
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
      label: "Size Smart",
      name: "SizeSmart",
      description: "AI-Native Size Curve Optimization Solution",
      details: "SizeSmart is an AI-native size curve and pack optimization engine that automates planning, aligns buys and allocations with precise forecasts, and maximizes profitability. It delivers real-time, demand-driven size curves and prepack configurations that adapt across regions, clusters, channels, and categories.",
      folderContent: [
        "Current Size Curve Review",
        "Dynamic Hierarchy Escalations",
        "Auto-Generate Future Curves",
        "Prepack Configuration Recommendations",
        "Pack Quantity Optimization",
      ],
      desc:
        "SizeSmart leverages AI and machine learning to optimize size curves and size planning across your product portfolio. Make data-driven decisions on size distribution, inventory allocation, and product assortment to maximize sales and minimize markdowns.",
      url: "/size-smart/dashboard",
      web: "https://www.impactanalytics.co/",
      logo: <Space_en viewBox="0 0 29 29" />,
      type: "platformApps",
      title: "sizesmart",
      category: "core",
      active: false,
      mapped: true,
      layout: [],
    },
    {
      label: "Assort Smart",
      name: "AssortSmart",
      description: "AI-Native Assortment Planning Solution",
      details: "AssortSmart is an AI-native assortment planning solution that delivers localized assortments through smart clustering, forecasting, and SKU rationalization. It reduces markdowns and increases margins by aligning demand and supply.",
      folderContent: [
        "Smart Clustering by Demand",
        "AI/ML Forecasting Powering Assortment Optimization",
        "Choice Count Rationalization",
        "PLM Integration",
      ],
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
      name: "InventorySmart",
      description: "AI-Native End-to-End Inventory Management & Planning Solution",
      details: "InventorySmart is an AI-native platform that automates allocation and replenishment, delivering precise forecasts and streamlining inventory planning. It reduces manual effort, accelerates execution, and optimizes inventory across the product lifecycle.",
      folderContent: [
        "AI-Native Allocation Engine",
        "Automate DC Replenishment",
        "Dynamic Best-Fit Pre-Pack Optimization",
        "Manage Exceptions Efficiency",
      ],
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
      name: "ADA Visual",
      description: "AI-Native Forecast Visualization Engine",
      details: "ADA Visual is the visual interface of our AI-native forecasting engine that helps users to view and edit forecasts and convert them into intuitive, actionable visuals. It enables users to monitor forecasts, understand drivers of forecasts, compare forecasts for scenarios, and apply business edits seamlessly.",
      folderContent: [
        "Real-Time Forecast Monitoring",
        "Understand Key Drivers of Forecasts",
        "Forecast Comparison for Multiple Scenarios",
        "Easy Human Forecast Overrides",
      ],
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
    // {
    //   label: "Cluster Smart",
    //   name: "ClusterSmart",
    //   description: "AI-Native Intelligent Clustering Solution",
    //   details: "ClusterSmart groups stores and products using AI-driven KPIs to power hyper-localized forecasting, planning, and assortment decisions, driving precision across the network.",
    //   folderContent: [
    //     "KPI-Based Store Clustering",
    //     "Demand Pattern Identification",
    //     "Hyperlocal Forecast Precision",
    //     "Seamless Planning Integration",
    //   ],
    //   desc:
    //     "With easy-to-use and intuitive interfaces and tools, you will get more granular planning solutions that incorporate our intelligent clustering solution. And our built-in AI and machine learning allow your team to be more efficient, turning out better assortment plans with fewer invested hours of your team's labor. Our intelligent retail assortment planning technology lets you analyze your inventory data to gain actionable insights that allow you to improve your inventory management process.",
    //   url: clusterSmartSideBarOptions[0]?.link,
    //   web: "https://www.impactanalytics.co/",
    //   logo: <Cluster_en viewBox="0 0 1024 1024" />,
    //   type: "platformApps",
    //   title: "clustersmart",
    //   category: "core",
    //   active: false,
    //   mapped: false,
    //   layout: clusterSmartSideBarOptions,
    // },
    {
      label: "Item Smart",
      name: "ItemSmart",
      description: "AI-Native Item Planning Solution",
      details: "ItemSmart is an AI-native item planning solution that revolutionizes SKU-level forecasting with unmatched demand accuracy, simplified workflows, and precise inventory alignment. It empowers smarter, faster decisions across SKUs, classes, and channels to boost efficiency.",
      folderContent: ["AI-Powered Demand Accuracy", "Streamlined SKU-Level Planning", "Discount & Promo Planning", "Seamless Approval Workflow"],
      desc:
        "With easy-to-use and intuitive interfaces and tools, you will get more granular planning solutions that incorporate our intelligent clustering solution. And our built-in AI and machine learning allow your team to be more efficient, turning out better assortment plans with fewer invested hours of your team’s labor. Our intelligent retail assortment planning technology lets you analyze your inventory data to gain actionable insights that allow you to improve your inventory management process.",
      url: "/item-smart/item-management",
      web:
        "https://www.impactanalytics.co/solutions/retail-assortment-planning/",
      logo: <Inventory2Icon />,
      type: "platformApps",
      title: "itemsmart",
      category: "core",
      active: false,
      mapped: false,
      layout: [],
    },
    // {
    //   label: "Mark Smart",
    //   desc:
    //     "Drive retail markdown optimization to maximize revenue and margin growth. Streamline markdowns to optimize total return.",
    //   url: marksmartSideBarOptions[0].link,
    //   web:
    //     "https://www.impactanalytics.co/solutions/retail-price-optimization/",
    //   logo: <Price_en viewBox="0 0 30 30" />,
    //   type: "platformApps",
    //   title: "marksmart",
    //   category: "core",
    //   active: false,
    //   mapped: false,
    //   layout: marksmartSideBarOptions,
    // },
    {
      label: "Price Smart: Promo",
      name: "PromoSmart",
      description: "AI-Native Promotion Planning Solution",
      details: "PromoSmart empowers businesses to plan, simulate, and optimize promotions using AI, enabling seamless collaboration across marketing, planning, and execution teams while streamlining approvals for faster decisions.",
      folderContent: [
        "AI-Native Promo Optimization",
        "Product x Store-Level Performance Analytics",
        "Configurable Approval Workflows",
        "Comprehensive Offer Type Support",
      ],
      desc:
        "PriceSmart leverages AI to drive decisions on initial, promotional, and clearance pricing to achieve your business objectives. A single application to ensure lifecycle pricing, promotions, pre-season pricing, and end-of-life markdown optimization.",
      web:
        "https://www.impactanalytics.co/solutions/promosmart",
      logo: <Price_Promo_en viewBox="0 0 30 30" />,
      url: "/pricesmart-promo/decision-dashboard",
      type: "platformApps",
      title: "pricesmart promo",
      category: "core",
      active: false,
      mapped: false,
    },
    {
      label: "Price Smart: Markdown",
      name: "MarkSmart",
      description: "AI-Native Markdown Optimization Solution",
      details: "MarkSmart is an AI-native clearance optimization solution that helps retailers maximize margins while clearing inventory. It leverages data-driven strategies, elasticity models, and business rules to recommend the right timing and depth of markdowns, ensuring higher sell-through with minimal margin loss.",
      folderContent: [
        "AI-Native Markdown Optimization",
        "Scenario Simulation & What-If Analysis",
        "Real-Time Dashboards & Monitoring",
        "Automated Clearance Strategy",
      ],
      desc:
        "PriceSmart leverages AI to drive decisions on initial, promotional, and clearance pricing to achieve your business objectives. A single application to ensure lifecycle pricing, promotions, pre-season pricing, and end-of-life markdown optimization.",
      web:
        "https://www.impactanalytics.co/solutions/marksmart",
      logo: <Price_Markdown_en viewBox="0 0 35 35" />,
      url: "/pricesmart-markdown/decision-dashboard",
      type: "platformApps",
      title: "pricesmart markdown",
      category: "core",
      active: false,
      mapped: false,
    },
    // {
    //   label: "Price Smart: Unified",
    //   name: "Price Smart Unified",
    //   details: "PriceSmart Unified is an AI-native comprehensive pricing solution that combines promotional and markdown capabilities. It helps retailers optimize pricing throughout the product lifecycle—from initial pricing to promotions to clearance—leveraging data-driven strategies, elasticity models, and business rules to maximize margins and achieve business objectives.",
    //   folderContent: [
    //     "Unified Promotional & Markdown Optimization",
    //     "AI-Native Price Elasticity Modeling",
    //     "End-to-End Lifecycle Pricing",
    //     "Scenario Simulation & What-If Analysis",
    //     "Real-Time Dashboards & Monitoring",
    //     "Integrated Clearance & Promo Strategy",
    //   ],
    //   description:
    //     "AI Native to drive decisions on initial, promotional, and clearance pricing to achieve your business objectives.",
    //   web:
    //     "https://www.impactanalytics.co/solutions/retail-price-optimization/",
    //   logo: <Price_Markdown_en viewBox="0 0 35 35" />,
    //   url: "/pricesmart/decision-dashboard",
    //   type: "platformApps",
    //   title: "pricesmart unified",
    //   category: "core",
    //   active: true,
    //   mapped: false,
    // },
    {
      label: "Space Smart",
      name: "SpaceSmart",
      description: "AI-Native Space Planning & Optimization Solution",
      details: "SpaceSmart is an AI-native optimization engine for macro and micro space planning. It uses elasticity models, clustering, and adjacency analytics to maximize ROI per square foot and create layouts that drive store performance.",
      folderContent: [
        "AI-Native Space Elasticity",
        "Macro & Micro Floor Planning",
        "Space-Aware Store Clustering",
      ],
      desc:
        "Minimize manual effort and ensure high accuracy in retail space planning, and retail floor planning, through automated and localized space plans and planograms. Leverage artificial intelligence and machine learning to deliver better space planning outcomes, and improved top and bottom-line results for your business.",
      url: "/space-smart/dashboard",
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
      label: "Forecast Configurator",
      name: "Forecast Configurator",
      description: "AI-Native Forecast Generation Module",
      details: "Forecast Configurator is a forecast generation engine that enables model selection, AI/ML model building, and forecast tuning to suit specific business contexts and improve forecast precision.",
      folderContent: [
        "Custom Forecast Model Selection",
        "Driver-Level Variable Control",
        "Built-In Bias Corrections",
        "Automated Model Refreshes",
      ],
      desc:
        "A Platform which facilitates the configuration of model training, actual training, and the simulation process",
      url: "/forecastconfigurator/dashboard",
      web: "https://www.impactanalytics.co",
      logo: <Forecast_en viewBox="0 0 30 30" />,
      type: "platformApps",
      title: "forecastconfigurator",
      category: "core",
      active: false,
      mapped: false,
    },
    {
      label: "ADA Configurator",
      name: "ADA Configurator",
      description: "Automated Business Intelligence Platform",
      details: "ADA Configurator makes Business Intelligence for retail easy through automated insights based on your data sources. It provides instant insight into critical drivers affecting your business with streamlined configuration and deployment.",
      folderContent: ["Automated Data Insights", "Critical Driver Analysis", "Business Intelligence Automation", "Real-Time Configuration"],
      desc:
        "ADA Configurator makes Business Intelligence for retail easy through automated insights based on your data sources so you can get instant insight into critical drivers affecting your business.",
      web:
        "https://www.impactanalytics.co/solutions/data-driven-decision-making-reporting/",
      logo: <Monday_en viewBox="0 0 33 33" />,
      url: "/adaconfigurator/dashboard",
      type: "platformApps",
      title: "adaconfigurator",
      category: "smartBI",
      active: false,
      mapped: false,
    },
    {
      label: "Test Smart",
      name: "TestSmart",
      description: "AI-Native Hypothesis Testing Platform",
      details: "TestSmart empowers businesses to design, measure, and monitor tests with precision, driving improved margins and optimizing overall performance",
      folderContent: [
        "Rapid Experiment Creation",
        "Parallel Multi-Level Testing",
        "AI Test-Control Matching",
        "Deep Root-Cause Analysis",
      ],
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
      name: TENANT === "inventorysmart" ? "CortexEye" : "MondaySmart", // ToBeRemoved
      description: "GenAI-Driven BI Tool to Diagnose Problem Areas",
      details: "MondaySmart is a GenAI-powered business intelligence tool that automates reporting, analyzes performance drivers, and provides actionable insights. It cuts review prep time, offers natural-language Q&A, and helps teams act faster with data-backed decisions.",
      folderContent: [
        "KPI Decomposition Analysis",
        "Causal AI-Native Insights",
        "Virtual AI Business Analyst",
        "GenAI-Based Business Summaries",
      ],
      desc:
        "MondaySmart makes Business Intelligence for retail easy through automated insights based on your data sources so you can get instant insight into critical drivers affecting your business.",
      web:
        "https://www.impactanalytics.co/solutions/data-driven-decision-making-reporting/",
      logo: <Monday_en viewBox="0 0 33 33" />,
      url: "/monday-smart/overview",
      type: "platformApps",
      title: "mondaysmart",
      category: "smartBI",
      active: false,
      mapped: false,
    },
    {
      label: "MCPHub",
      name: "MCPHub",
      description: "Centralized Hub for MCP Integrations",
      details: "MCPHub is a centralized hub to manage and orchestrate MCP integrations across the platform.",
      folderContent: [
        "MCP Server Management",
        "Integration Orchestration",
        "Unified Configuration",
        "Centralized Access",
      ],
      desc:
        "MCPHub provides a centralized hub to manage and orchestrate MCP integrations across the platform.",
      web:
        "https://www.impactanalytics.co/solutions/data-driven-decision-making-reporting/",
      logo: <Monday_en viewBox="0 0 33 33" />,
      url: "/mcp-hub",
      type: "platformApps",
      title: "mcphub",
      category: "smartBI",
      active: false,
      mapped: false,
    },
    {
      label: "Attribute Smart",
      name: "AttributeSmart",
      description: "AI-Native Attribute Tagging Platform",
      details: "AttributeSmart automates product attribute tagging with AI, enabling precise product classification that fuels better forecasting, assortment, and search relevance.",
      folderContent: [
        "Automated SKU Attribute Tagging",
        "Enhanced Product Classification",
        "Improved Forecast Hierarchies",
        "Better Product Discoverability",
      ],
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
      name: "StoreSmart",
      description: "AI-Native In-Store Execution & Replenishment Optimization",
      details: "StoreSmart unifies real-time product-level execution gap detection with allocation & replenishment workflows. It enables store associates, managers, and executives to collaborate, act quickly, and deliver better product availability, presentation, and sales performance.",
      folderContent: [
        "Product-level Execution Gap & Opportunity Identification",
        "Allocation visibility & replenishment editing capability",
        "Sales & Performance Benchmarking Across Stores",
        "Task Tracking & Compliance Monitoring",
        "Fast Deployment & Actionable Insights",
        "Boost in-store Sales & Operational Efficiency",
      ],
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
    {
      label: "Base Smart",
      name: "BaseSmart",
      description: "AI-Native Base Price Optimization Solution",
      details: "BaseSmart is an AI-native pricing solution that transforms base price management through rules, forecasting, and automation. It empowers pricing teams to drive sales and profit improvement and improve competitive positioning by leveraging AI-driven elasticities and consistent enforcement of granular omnichannel pricing rules.",
      folderContent: [
        "Cross Elasticity and Cannibalization",
        "Configurable Product & Competitor Rules",
        "Automated Updates for Cost & Competition",
        "Dashboards & Alerts-Based Management",
      ],
      desc:
        "Introducing Base Pricing - a smart, rules and target-based optimizer designed to help businesses achieve optimal pricing. It leverages pre-defined templates such as Brand, Size, Cross-Zone, Cross-Channel, and Competitor rules, combining intelligent pricing strategies with ADA forecast simulations. This enables users to optimize prices across multiple targets and scenarios, with built-in alerts for rule violations. Seamless integration with client systems ensures efficient price management and faster execution, keeping businesses agile and competitive in the market.",
      web:
        "https://www.impactanalytics.co/solutions/basesmart",
      logo: <Price_Markdown_en viewBox="0 0 35 35" />,
      url: "/base-pricing/decision-dashboard",
      type: "platformApps",
      title: "base pricing",
      category: "core",
      active: false,
      mapped: true,
    },
    {
      label: "Price Smart",
      name: "PriceSmart",
      description: "AI-Native Unified Life-Cycle Pricing Solution",
      details: "PriceSmart is an AI-native price optimization platform that refines pricing decisions with advanced analytics. It helps businesses adapt to market changes, optimize strategies, and maximize revenue while maintaining competitive pricing.",
      folderContent: [
        "Real-Time AI Price Forecasting",
        "Target-Based Lifecycle Pricing",
        "Exception & Workflow Management",
        "Cross-Channel Strategy Optimization",
      ],
      // desc:
      //   "Introducing Base Pricing - a smart, rules and target-based optimizer designed to help businesses achieve optimal pricing. It leverages pre-defined templates such as Brand, Size, Cross-Zone, Cross-Channel, and Competitor rules, combining intelligent pricing strategies with ADA forecast simulations. This enables users to optimize prices across multiple targets and scenarios, with built-in alerts for rule violations. Seamless integration with client systems ensures efficient price management and faster execution, keeping businesses agile and competitive in the market.",
      web:
        "https://www.impactanalytics.co/solutions/pricesmart-analytics",
      logo: <Price_Markdown_en viewBox="0 0 35 35" />,
      // url: "/base-pricing/workbench",
      type: "platformApps",
      url: "/pricesmart",
      title: "pricesmart",
      category: "core",
      active: false,
      mapped: true,
    },
    {
      label: "Source Smart",
      name: "SourceSmart",
      description: "AI-driven sourcing and supplier allocation optimization platform",
      details: "SourceSmart is an AI-driven sourcing and supplier allocation optimization platform built by Impact Analytics (IA) on the IA Smart ecosystem. It enables global brands to make faster, more efficient, and risk-aware sourcing decisions by integrating forecasts, vendor performance, and dynamic external risk signals into a single, holistic allocation engine. The platform supports allocation planning across vendor, facility, and selling region hierarchies, ensuring strategic alignment across seasonal and re-sourcing flows.",
      folderContent: [
        "Forecast-Integrated Allocation Planning",
        "Vendor/Facility/Region Hierarchy Support",
        "Supplier Performance & Compliance Insights",
        "External Risk Signal Ingestion",
        "Scenario Planning & What-If Analysis",
        "Seasonal and Re-sourcing Flow Management",
      ],
      desc:
        "SourceSmart unifies forecasts, supplier performance, and external risk signals to optimize sourcing and allocation decisions across vendors, facilities, and regions. It delivers faster, risk-aware, and strategically aligned allocations across seasonal and re-sourcing flows.",
      url: "/source-smart/decision-dashboard",
      web: "https://www.impactanalytics.co/",
      logo: <Store_en viewBox="0 0 30 30" />,
      type: "platformApps",
      title: "sourcesmart",
      category: "core",
      active: false,
      mapped: true,
    },
    {
      label: "Base Smart Restaurant",
      name: "BaseSmart Restaurant",
      description: "AI-Native Restaurant Price Optimization Solution",
      details: "BaseSmart Restaurant is an AI-native pricing solution that transforms restaurant price management through rules, forecasting, and automation. It empowers restaurant pricing teams to drive sales and margin improvement and improve competitive positioning by leveraging AI-driven elasticities and consistent enforcement of granular restaurant-level pricing rules.",
      folderContent: [
        "Cross Elasticity and Cannibalization",
        "Configurable Restaurant Item & Competitor Rules",
        "Automated Updates for Cost & Competition",
        "Dashboards & Alerts-Based Management"
      ],
      desc:
        "Introducing Base Pricing - a smart, rules and target-based optimizer designed to help businesses achieve optimal pricing. It leverages pre-defined templates such as Brand, Size, Cross-Zone, Cross-Channel, and Competitor rules, combining intelligent pricing strategies with ADA forecast simulations. This enables users to optimize prices across multiple targets and scenarios, with built-in alerts for rule violations. Seamless integration with client systems ensures efficient price management and faster execution, keeping businesses agile and competitive in the market.",
      web:
        "https://www.impactanalytics.co/solutions/basesmart",
      logo: <Price_Markdown_en viewBox="0 0 35 35" />,
      url: "/base-pricing-rest/workbench",
      type: "platformApps",
      title: "base pricing restaurant",
      category: "core",
      active: false,
      mapped: false,
    },
    {
      label: "Demand Smart",
      name: "Demand Smart",
      description: "AI-Native Forecast Visualization Engine",
      details: "ADA Visual is the visual interface of our AI-native forecasting engine that helps users to view and edit forecasts and convert them into intuitive, actionable visuals. It enables users to monitor forecasts, understand drivers of forecasts, compare forecasts for scenarios, and apply business edits seamlessly.",
      folderContent: [
        "Real-Time Forecast Monitoring",
        "Understand Key Drivers of Forecasts",
        "Forecast Comparison for Multiple Scenarios",
        "Easy Human Forecast Overrides",
      ],
      desc:
        "Leverage the best-in-class retail and CPG forecasting engine for identifying recent trends, seasonality, and other unique demand drivers, all in one place. Push forecasts into any existing planning and pricing systems. For years, the traditional forecasting algorithms have leaned very heavily on historical data. But with rapid changes in product preferences and consumption patterns, businesses need a more robust framework that includes factors other than just historical data.",
      url: demandSmartSideBarOptions[0].link,
      web: "https://www.impactanalytics.co/",
      logo: <Ada_en viewBox="0 0 32 32" />,
      type: "platformApps",
      title: "demand smart",
      category: "core",
      active: false,
      mapped: false,
      layout: demandSmartSideBarOptions,
    },
    {
      label: "AgenticAssort",
      name: "Agentic Assort",
      description: "Agent-Powered Assortment Planning",
      details: "Agentic Assort uses an AI agent to help teams build localized assortments through smart clustering, forecasting, and SKU rationalization. The agent analyzes demand and supply signals, explains assortment decisions, and helps planners execute faster while improving availability, reducing markdown risk, and increasing margin.",
      folderContent: [
        "Agent-Led Assortment Recommendations & Explanations",
        "Smart Clustering & Localization Guidance",
        "Forecast-Driven SKU Rationalization",
        "Alerts, Dashboards & Agent-Assisted Execution"
      ],
      desc:
        "Introducing Agentic Assort - an AI agent experience for assortment planning. Launch the agent to translate your assortment objectives into localized recommendations, powered by smart clustering, demand forecasting, and SKU rationalization. The agent explains the why behind suggested assortment changes, highlights risks and opportunities, and guides execution through alerts and dashboards so teams can plan faster, reduce markdowns, and improve margin with confidence.",
      web:
        "https://www.impactanalytics.co/solutions/basesmart",
      logo: <Assort_en viewBox="0 0 30 30" />,
      url: "/agentic-assort/plans",
      type: "platformApps",
      title: "agenticassort",
      category: "core",
      active: false,
      mapped: false,
    },
    {
      label: "Agentic Plan",
      name: "Agentic Plan",
      description: "Agent-Powered Plan Planning",
      details: "Agentic Plan uses an AI agent to help teams build localized assortments through smart clustering, forecasting, and SKU rationalization. The agent analyzes demand and supply signals, explains assortment decisions, and helps planners execute faster while improving availability, reducing markdown risk, and increasing margin.",
      folderContent: [
        "Agent-Led Assortment Recommendations & Explanations",
        "Smart Clustering & Localization Guidance",
        "Forecast-Driven SKU Rationalization",
        "Alerts, Dashboards & Agent-Assisted Execution"
      ],
      desc:
        "Introducing Agentic Assort - an AI agent experience for assortment planning. Launch the agent to translate your assortment objectives into localized recommendations, powered by smart clustering, demand forecasting, and SKU rationalization. The agent explains the why behind suggested assortment changes, highlights risks and opportunities, and guides execution through alerts and dashboards so teams can plan faster, reduce markdowns, and improve margin with confidence.",
      web:
        "https://www.impactanalytics.co/solutions/basesmart",
      logo: <Plan_en viewBox="0 0 35 35" />,
      url: "/agentic-plan",
      type: "platformApps",
      title: "Agentic Plan",
      category: "core",
      active: false,
      mapped: false,
    }
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
  itemsmart: {
    clients: [
      {
        clientName: "Arhaus",
        start_year: "2024",
        end_year: "-",
      },
    ],
  },
};

export const iconMap = {
  "Forecast Smart": <Forecast_en viewBox="0 0 30 30" />,
};