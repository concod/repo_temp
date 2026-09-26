import { Home } from "@mui/icons-material";
import { CLUSTERING_DASHBOARD } from "./routesConstants";

export const HOME_BREAD_CRUMN = {
  label: "ClusterSmart",
  route: CLUSTERING_DASHBOARD,
  icon: <Home />,
};

export const BREAD_CRUMB_TITLES = {
  0: [HOME_BREAD_CRUMN, { label: "Clustering", route: null }],
  1: [HOME_BREAD_CRUMN, { label: "Intelligent Clustering", route: null }],
};

export const MAP_VIEW_FILTERS = [
  {
    field_type: "dropdown",
    options: [],
    isMulti: true,
    isSearchable: true,
    isClearable: false,
  },
];

export const ATTRIBUTES_CLUSTERING = [
  {
    name: "Performance Attribute",
    value: "performance",
  },
  {
    name: "Product Attributes",
    value: "product",
  },
  {
    name: "Store Attributes",
    value: "store",
  },
];

export const CSV_CONFIG = [
  { label: "Channel", key: "channel" },
  { label: "Cluster Code", key: "cluster_code" },
  { label: "Store Code", key: "store_code" },
];
