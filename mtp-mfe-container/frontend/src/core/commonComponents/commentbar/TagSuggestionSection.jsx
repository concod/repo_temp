import { useState, useEffect } from "react";
import { connect } from "react-redux";
import {
  ClickAwayListener,
  Fade,
  List,
  ListItemButton,
  Paper,
} from "@mui/material";

const TagSuggestionSection = ({
  comment,
  hasSuggestions,
  setHasSuggestions,
  userManagementList,
  classes,
  type,
  setUserMentioned,
  usersMentioned,
}) => {
  const [filteredOptions, setFilteredOptions] = useState(userManagementList);

  useEffect(() => {
    if (hasSuggestions) {
      // Find the user entered in text input field
      let addedUser = comment.substring(comment.lastIndexOf("@") + 1);
      // Filter from all user list based on user entered in text input field
      let filteredOptions = userManagementList.filter((obj) =>
        obj.user_name.includes(addedUser)
      );
      setFilteredOptions(filteredOptions);
      if (!filteredOptions?.length) {
        setHasSuggestions(false);
      }
    }
  }, [comment]);

   /**
   * add user tag
   * @param {string} user - selected user to be tagged
   */

  const handleUsersMentioned = (user) => {
    document.getElementById(`${type}TextBoxField`).innerHTML +=`<span class=${classes.highlight} contenteditable="false">${user.user_name}</span> `;
    usersMentioned.push(user);
    setUserMentioned(usersMentioned);
    setHasSuggestions(false);
  };

  const handleClickAway = () => {
    setHasSuggestions(false);
  };
  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Fade in={hasSuggestions}>
        <List component={Paper} sx={{ mt: 1 }}>
          {filteredOptions?.length &&
            filteredOptions.map((user) => {
              return (
                <ListItemButton
                  onClick={() => handleUsersMentioned(user)}
                >
                  {user.user_name}
                </ListItemButton>
              );
            })}
        </List>
      </Fade>
    </ClickAwayListener>
  );
};

const mapStateToProps = (state) => {
  return {
    userManagementList: state.commentBarReducer.userManagementList,
  };
};

export default connect(mapStateToProps, {})(TagSuggestionSection);
