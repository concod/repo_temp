const dummyData = {
  componentTitle: "Module Configurator",
  details: [
    {
      rowTitle: "Level 1",
      rowData: [
        {
          cardHeader: "SKU",
          cardSubHeader: "View dependency",
          tooltipData: [
            {
              title: "Dependent on modules",
              listItems: [
                "SKU status (10%)",
                "SKU grouping (0%)",
                "SKU mapping (0%)",
              ],
            },
            {
              title: "Affected modules",
              listItems: ["Vendor (0%)", "DC (0%)"],
            },
          ],
          percentage: 45,
        },
        {
          cardHeader: "Store",
          cardSubHeader: "View dependency",
          tooltipData: [
            {
              title: "Dependent on modules",
              listItems: [
                "SKU status (10%)",
                "SKU grouping (0%)",
                "SKU mapping (0%)",
              ],
            },
            {
              title: "Affected modules",
              listItems: ["Vendor (0%)", "DC (0%)"],
            },
          ],
          percentage: 45,
        },
      ],
    },
    {
      rowTitle: "Level 2",
      rowData: [
        {
          cardHeader: "SKU Grouping",
          cardSubHeader: "View dependency",
          tooltipData: [
            {
              title: "Dependent on modules",
              listItems: [
                "SKU status (10%)",
                "SKU grouping (0%)",
                "SKU mapping (0%)",
              ],
            },
            {
              title: "Affected modules",
              listItems: ["Vendor (0%)", "DC (0%)"],
            },
          ],
          percentage: 0,
        },
        {
          cardHeader: "Store Grouping",
          cardSubHeader: "View dependency",
          tooltipData: [
            {
              title: "Dependent on modules",
              listItems: [
                "SKU status (10%)",
                "SKU grouping (0%)",
                "SKU mapping (0%)",
              ],
            },
            {
              title: "Affected modules",
              listItems: ["Vendor (0%)", "DC (0%)"],
            },
          ],
          percentage: 0,
        },
      ],
    },
  ],
};

export default dummyData;

const parseModuleDescription = (moduleDescription) => {
  const rawInput = typeof moduleDescription === "string" ? moduleDescription : "";
  const raw = rawInput.trim();
  if (!raw) {
    return { label: "", order: null, tags: [] };
  }

  const looksLikeJsonPrefixed = raw.toUpperCase().startsWith("JSON:");
  const jsonPayload = looksLikeJsonPrefixed ? raw.slice(5).trimStart() : raw;
  const looksLikeRawJson = jsonPayload.startsWith("{") && jsonPayload.endsWith("}");

  if (looksLikeJsonPrefixed || looksLikeRawJson) {
    try {
      const parsed = JSON.parse(jsonPayload);
      const labelValue = parsed?.label ?? parsed?.Label ?? parsed?.LABEL;
      const orderValue = parsed?.order ?? parsed?.Order ?? parsed?.ORDER;
      const label = typeof labelValue === "string" ? labelValue : "";
      const order = Number.isFinite(Number(orderValue)) ? Number(orderValue) : null;

      const rawTags =
        parsed?.tags ??
        parsed?.Tags ??
        parsed?.TAGS ??
        parsed?.tag ??
        parsed?.Tag ??
        parsed?.TAG;
      const tagsArray = Array.isArray(rawTags)
        ? rawTags
        : typeof rawTags === "string"
          ? rawTags.split("|")
          : [];
      const tags = tagsArray
        .filter((t) => typeof t === "string")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      return { label, order, tags };
    } catch (e) {
      return { label: raw, order: null, tags: [] };
    }
  }

  return { label: raw, order: null, tags: [] };
};

export const convertAPIDataToDummyDataFormat = (data) => {
  return {
    componentTitle: "Module Configurator",
    details: data.map((eachLevelData, idx) => {
      const sortedLevelData = (eachLevelData || []).slice().sort((a, b) => {
        const aMeta = parseModuleDescription(a?.module_description);
        const bMeta = parseModuleDescription(b?.module_description);
        const aHasOrder = aMeta.order !== null;
        const bHasOrder = bMeta.order !== null;
        if (aHasOrder !== bHasOrder) {
          return aHasOrder ? -1 : 1;
        }
        if (aHasOrder && bHasOrder && aMeta.order !== bMeta.order) {
          return aMeta.order - bMeta.order;
        }
        const aName = (a?.module || "").toString();
        const bName = (b?.module || "").toString();
        return aName.localeCompare(bName);
      });

      return {
        rowTitle: `Level ${idx + 1}`,
        rowData: sortedLevelData.map((module) => {
          const meta = parseModuleDescription(module?.module_description);
          return {
            description: meta.label || "Description not available", 
            order: meta.order,
            tags: meta.tags,
            cardHeader: module?.module,
            cardSubHeader: "View dependency >",
            moduleCode: module?.module_code,
            screenCode: module?.screen_code,
            percentage: module?.percentage != null ? Number(module.percentage) : 0,
            tooltipData: [
              {
                title: "Dependent on modules",
                listItems: module.dependant_modules?.map(
                  (dependentModule) => `${dependentModule} (0%)`
                ) || [],
              },
              // {
              //   title: "Affected modules",
              //   listItems: module.affected_modules?.map(
              //     (affectedModule) => `${affectedModule} (0%)`
              //   ) || [],
              // },
            ],
          };
        }),
      };
    }),
  };
};
