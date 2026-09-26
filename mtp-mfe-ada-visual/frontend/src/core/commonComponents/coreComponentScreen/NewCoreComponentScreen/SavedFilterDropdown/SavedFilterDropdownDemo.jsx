import { Button } from "impact-ui-v3";
import "./SavedFilterDropdown.scss";

const SavedFilterDropdownDemo = ({
  list,
  chipRef,
  setOpenModal,
  setIsFilterPopoverOpen,
}) => {
  return (
    <>
      <div className="saved-filter">
        <ul className="saved-filter-dashboard">
          {list.map((item) => (
            <li key={item.value}>{item.label}</li>
          ))}
        </ul>

        <div className="view-all-btn">
          <Button
            variant="text"
            onClick={() => {
              setOpenModal(true);
              setIsFilterPopoverOpen(false);
            }}
          >
            View All
          </Button>
        </div>
      </div>
      <div className="overlay" onClick={() => setIsFilterPopoverOpen(false)} />
    </>
  );
};

export default SavedFilterDropdownDemo;
