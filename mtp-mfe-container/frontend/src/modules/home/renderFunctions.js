/**
 * @func
 * @desc Handles ADA Dashboard for clients
 * @param {Array} filteredApp
 */

export const handleAdaDashboard = async (filteredApp, props) => {
  if (
    props.userScreenData?.ada?.screens?.length > 1 &&
    props.userScreenData?.ada?.screens?.includes("MFP ADA Dashboard")
  ) {
    filteredApp[0].url = filteredApp[0]?.layout[0]?.link;
  } else {
    let screen = filteredApp[0]?.layout;
    screen.shift();
    screen[0].order = 1;
    filteredApp[0].layout = screen;
    filteredApp[0].url = screen[0]?.link;
  }
};
