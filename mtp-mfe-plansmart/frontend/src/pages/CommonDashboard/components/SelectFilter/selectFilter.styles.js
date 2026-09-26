import { makeStyles } from "@mui/styles";

/**
 * Generates custom styles for UI components based on a provided theme.
 * @param {Object} theme - Theme object used to customize styles.
 * @returns {Object} Object containing styles for buttons wrapper, flex end, filter buttons, individual buttons, and filter board main.
 * @description
 *   - Uses flexbox for layout alignment and spacing.
 *   - Applies specific margins to the first and last buttons to ensure consistent spacing.
 */
const styles = makeStyles((theme) => ({
  buttonsWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 1rem"
  },
  flexEnd: {
    justifyContent: "end"
  },
  filterButtons: {
    display: "flex",
    alignSelf: "center",
    paddingLeft: "3rem"
  },
  button: {
    margin: "0 5px",

    "&:nth-of-type(1)": {
      marginLeft: 0
    },

    "&:last-child()": {
      marginRight: 0
    }
  },
  filterBoardMain: {
    display: "flex",
    width: "100%"
  }
}));

export default styles;
