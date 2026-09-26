import AgGrid from "./agGrid.jsx";
import IATable from "../iaTable/iaTable";

const Index = (props) => {
  const { pathname } = window?.location || {};
  return pathname?.includes("ia-table") ? (
    <IATable {...props} />
  ) : (
    <AgGrid {...props} />
  );
};
export default Index;
