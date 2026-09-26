export const convertAppsConstantFormat = (apps) => {
  return apps.map((app, idx) => {
    return {
      sl: idx + 1,
      client_id: app.title,
      client: "Demo",
      client_url: "demo",
      product_id: app.title,
      product: app.title,
      status: "TRUE",
      hidden: "FALSE",
    };
  });
};

export const convertProductAppsConstantFormat = (apps) => {
  return apps.map((app, idx) => {
    return {
      id: app.title,
      product: app.label,
      url: app.title,
      small_description:
        "Configure Inventory planning for optimised allocation, replenishment & ordering.",
      descriptions: app.desc,
      benefits:
        "Optimized end-to-end Inventory Planning/n\nBusiness friendly defaulting & exception management/n\nAutomated allocation & replenishments/n\nExhaustive reporting & insights/n\nCustomized alerts",
    };
  });
};

export const updateSubscribeStatus = (apps, subscribed_apps = []) => {
  return apps.map((app) => {
    return {
      ...app,
      is_subscribed: subscribed_apps
        .map((app) => app.application.toLowerCase())
        .includes(app.id),
    };
  });
};
