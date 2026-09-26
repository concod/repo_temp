/**
 * CustomNoRowOverlay component is the custom
 * component to display a message when no rows
 * are loaded in the table
 * @param {object} props
 * @returns
 */
const CustomNoRowOverlay = (props) => {
    const { noRowsMessageFunc } = props;
    return <div>{noRowsMessageFunc()}</div>;
  };
  export default CustomNoRowOverlay;