export const navigationOptions = [
  {
    link: "/inventory-smart/decision-dashboard",
    screen_name: "Dashboard",
    flow_type: "navigation",
  },
  {
    link: `/inventory-smart/create-allocation/?step=0`,
    flow_type: "navigation",
    screen_name: "Allocation",
  },
  {
    link: "/inventory-smart/configuration",
    flow_type: "navigation",
    screen_name: "Configurations",
  },
  {
    link: "/inventory-smart/store-eligibility-grouping",
    flow_type: "navigation",
    screen_name: "Grouping",
  },
  {
    link: "/inventory-smart/constraints",
    flow_type: "navigation",
    screen_name: "Constraints",
  },
  {
    link: "/inventory-smart/ada/dashboard",
    flow_type: "navigation",
    screen_name: "ADA Visual",
  },
];

export const insightsOptions = [
  {
    link: "/inventory-smart/decision-dashboard",
    screen_name: "Dashboard",
    flow_type: "insights",
  },
  {
    link: `/inventory-smart/create-allocation/?step=0`,
    flow_type: "insights",
    screen_name: "Allocation",
  },
  {
    link: "/inventory-smart/store-eligibility-grouping",
    flow_type: "insights",
    screen_name: "Configurations",
  },
  {
    link: "/inventory-smart/configuration",
    flow_type: "insights",
    screen_name: "Grouping",
  },
  {
    link: "/inventory-smart/constraints",
    flow_type: "insights",
    screen_name: "Constraints",
  },
  {
    link: "/inventory-smart/ada/dashboard",
    flow_type: "insights",
    screen_name: "ADA Visual",
  },
];

export const screenOptions = [
  {
    link: "/inventory-smart/decision-dashboard",
    screen_name: "InventoryDashboard",
    filterCongfigurationName: "decisionDashboardFilterConfiguration",
  },
  {
    link: "/inventory-smart/product-profile",
    screen_name: "Product Profile",
    filterCongfigurationName: "productProfileDashboardFilterConfig",
  },
  {
    link: `/inventory-smart/create-allocation/?step=0`,
    screen_name: "Allocation",
    filterCongfigurationName: "createAllocationFilterConfiguration",
  },
  {
    link: "/inventory-smart/store-eligibility-grouping",
    screen_name: "Inventorysmart Store Eligibility Group",
    filterCongfigurationName: "storeGroupingFilterConfiguration",
  },
  {
    link: "/inventory-smart/configuration",
    screen_name: "Inventorysmart Configurations",
    filterCongfigurationName: "productStatusFilterConfiguration",
  },
  {
    link: "/inventory-smart/constraints",
    screen_name: "Inventorysmart Constraints",
    filterCongfigurationName: "rulesConstraintsFilterConfig",
  },
  {
    link: "/inventory-smart/allocation-reports",
    screen_name: "Inventorysmart Reportings",
    filterCongfigurationName: "lostSalesFilterConfiguration",
  },
  {
    link: "/inventory-smart/ada/dashboard",
    screen_name: "Inventorysmart ADA Dashboard",
    filterCongfigurationName: "adaVisualFilterConfiguration",
  },
];

export const toBoldUnicode = (text) => {
  const boldLetters = {
    A: "𝐀",
    B: "𝐁",
    C: "𝐂",
    D: "𝐃",
    E: "𝐄",
    F: "𝐅",
    G: "𝐆",
    H: "𝐇",
    I: "𝐈",
    J: "𝐉",
    K: "𝐊",
    L: "𝐋",
    M: "𝐌",
    N: "𝐍",
    O: "𝐎",
    P: "𝐏",
    Q: "𝐐",
    R: "𝐑",
    S: "𝐒",
    T: "𝐓",
    U: "𝐔",
    V: "𝐕",
    W: "𝐖",
    X: "𝐗",
    Y: "𝐘",
    Z: "𝐙",
    a: "𝐚",
    b: "𝐛",
    c: "𝐜",
    d: "𝐝",
    e: "𝐞",
    f: "𝐟",
    g: "𝐠",
    h: "𝐡",
    i: "𝐢",
    j: "𝐣",
    k: "𝐤",
    l: "𝐥",
    m: "𝐦",
    n: "𝐧",
    o: "𝐨",
    p: "𝐩",
    q: "𝐪",
    r: "𝐫",
    s: "𝐬",
    t: "𝐭",
    u: "𝐮",
    v: "𝐯",
    w: "𝐰",
    x: "𝐱",
    y: "𝐲",
    z: "𝐳",
  };
  return text
    .split("")
    .map((c) => boldLetters[c] || c)
    .join("");
};
