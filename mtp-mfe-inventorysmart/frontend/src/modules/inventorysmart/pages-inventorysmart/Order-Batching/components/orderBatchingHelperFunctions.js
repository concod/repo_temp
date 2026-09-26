import colours from "core/Styles/colours";

export const getProgressBarCellStyle = (params) => {
  const { value } = params;
  if (value === 100) {
    return {
      rootElementColor: colours.forestGreen, //show green
      barColor: colours.forestGreen,
      badgeColor: "default",
    };
  } else if (value > 100) {
    return {
      rootElementColor: colours.errorRed, //show red
      barColor: colours.errorRed,
      badgeColor: "error",
    };
  } else
    return {
      rootElementColor: colours.palePurple, //show purple
      barColor: colours.purple,
      badgeColor: "default",
    };
};
