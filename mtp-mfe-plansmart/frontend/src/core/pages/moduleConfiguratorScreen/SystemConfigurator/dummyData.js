const dummyData = {
  componentTitle: "Module Configurator",
  details: [
    {
      rowTitle: "Level 1",
      rowData: [
        {
          cardHeader: "SKU",
          cardSubHeader: "view dependency",
          tooltipData: [
            {
              title: "Dependent sub - modules",
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
          cardParagh: `Module details goes here`,
          cardLearnMore: "Look how to use",
          percentage: 45,
        },
        {
          cardHeader: "Store",
          cardSubHeader: "view dependency",
          tooltipData: [
            {
              title: "Dependent sub - modules",
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
          cardParagh: `Module details goes here`,
          cardLearnMore: "Look how to use",
          percentage: 45,
        },
      ],
    },
    {
      rowTitle: "Level 2",
      rowData: [
        {
          cardHeader: "SKU Grouping",
          cardSubHeader: "view dependency",
          tooltipData: [
            {
              title: "Dependent sub - modules",
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
          cardParagh: `Module details goes here`,
          cardLearnMore: "Look how to use",
          percentage: 0,
        },
        {
          cardHeader: "Store Grouping",
          cardSubHeader: "view dependency",
          tooltipData: [
            {
              title: "Dependent sub - modules",
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
          cardParagh: `Module details goes here`,
          cardLearnMore: "Look how to use",
          percentage: 0,
        },
      ],
    },
  ],
};

export default dummyData;

export const convertAPIDataToDummyDataFormat = (data) => {
  return {
    componentTitle: "Module Configurator",
    details: data.map((eachLevelData, idx) => {
      return {
        rowTitle: `Level ${idx + 1}`,
        rowData: eachLevelData.map((module) => {
          return {
            cardHeader: module?.module,
            cardSubHeader: "view dependency",
            cardParagh: `Module details goes here`,
            cardLearnMore: "Look how to use",
            moduleCode: module?.module_code,
            percentage: 0,
            tooltipData: [
              {
                title: "Dependent sub-modules",
                listItems: module.dependant_modules?.map(
                  (dependentModule) => `${dependentModule} (0%)`
                ),
              },
              ,
              {
                title: "Affected modules",
                listItems: module.affected_modules?.map(
                  (affectedModule) => `${affectedModule} (0%)`
                ),
              },
            ],
          };
        }),
      };
    }),
  };
};
