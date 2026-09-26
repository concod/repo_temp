import { useRef, useState } from "react";
import { Tag, Button, useTranslation } from "impact-ui-v3";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import "./SavedFilterDropdown.scss";
const tags = ["Global", "Personal"];

const SavedFilterDropdown = ({
  savedFilterDataRef,
  savedFilterClickRef,
  selectedFilterValueRef,
}) => {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState("Global");
  const [openDropdown, setOpenDropdown] = useState(false);

  const filterContainerRef = useRef();

  const handleSavedFilterApply = (filter) => {
    savedFilterClickRef?.current(filter.name);
    setOpenDropdown(false);
  };

  const count = {
    Global: 0,
    Personal: 0,
  };

  const updatedTagsData = savedFilterDataRef.current?.filter((item) => {
    item.is_broadcast ? count.Global++ : count.Personal++;

    if (activeFilter === "Global") {
      return item.is_broadcast;
    }
    return !item.is_broadcast;
  });

  return (
    <>
      <div ref={filterContainerRef} className="filter-container">
        <Button
          icon={<KeyboardArrowDownIcon />}
          variant="text"
          onClick={() => setOpenDropdown(!openDropdown)}
        />
        {openDropdown && (
          <>
            <div className="saved-filter">
              <div className="tags">
                {tags.map((item) => (
                  <Tag
                    label={`${item} ${count[item]}`}
                    onClick={() => setActiveFilter(item)}
                    size="small"
                    variant={activeFilter === item ? "filled" : "stroke"}
                  />
                ))}
              </div>
              <ul className="saved-filter-dashboard">
                {updatedTagsData.map((item) => (
                  <li
                    key={item.name}
                    className={`${
                      selectedFilterValueRef.current === item.name
                        ? "active"
                        : ""
                    }`}
                    onClick={() => handleSavedFilterApply(item)}
                  >
                    {item.name}
                  </li>
                ))}
              </ul>
              {updatedTagsData.length === 0 ? (
                <div className="no-data">{t("filters.noDataFoundForSelectedScreen")}</div>
              ) : (
                ""
              )}
            </div>
          </>
        )}
      </div>
      {openDropdown && (
        <div className="overlay" onClick={() => setOpenDropdown(false)} />
      )}
    </>
  );
};

export default SavedFilterDropdown;
