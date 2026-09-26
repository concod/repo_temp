import { useCallback, useMemo, useState } from "react";
import { Avatar, Select, Input } from "impact-ui-v3";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import "./ChatSystemRightSideSection.scss";
import { debounce } from "lodash";

const dropdownOptions = [
  {
    label: "Today",
    value: "today",
  },
  {
    label: "Yesterday",
    value: "yesterday",
  },
];

const ChatSystemRightSideSection = (props) => {
  const { handleCommentChanges } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedOption, setSelectedOptions] = useState({
    label: "Today",
    value: "today",
  });

  const search = useCallback(
    (value, selectedOption) => {
      handleCommentChanges("search", {
        selectedOption,
        value,
      });
    },
    [handleCommentChanges]
  );

  const debounceSearch = useMemo(() => {
    return debounce(search, 200);
  }, [search]);

  const handleSearch = (event) => {
    const value = event.target.value;
    setInputValue(value);
    debounceSearch(value, selectedOption);
  };

  return (
    <section className="right-side">
      <div className="event-details">
        <Avatar label="AB" />
        <div className="event-name">Event Name</div>
        <div className="member-count">10 members</div>
      </div>

      <Input
        value={inputValue}
        placeholder="Search"
        onChange={(event) => handleSearch(event)}
        rightIcon={<SearchOutlinedIcon />}
      />

      <Select
        isOpen={isOpen}
        currentOptions={dropdownOptions}
        handleChange={setSelectedOptions}
        // onClearAll={setSelectedOptions}
        isCloseWhenClickOutside
        label="Chat History"
        name="chat-history"
        labelOrientation="top"
        placeholder="select.."
        selectedOptions={selectedOption}
        setCurrentOptions={() => {}}
        setIsOpen={setIsOpen}
        setIsSelectAll={() => {}}
        setSelectedOptions={setSelectedOptions}
      />
    </section>
  );
};

export default ChatSystemRightSideSection;
