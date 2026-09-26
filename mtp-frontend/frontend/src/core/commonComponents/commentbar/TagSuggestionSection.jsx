import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import {
  ClickAwayListener,
  Fade,
  List,
  ListItemButton,
  Paper,
} from "@mui/material";
import { cloneDeep } from "lodash";

const TagSuggestionSection = ({
  comment,
  hasSuggestions,
  setHasSuggestions,
  userManagementList,
  classes,
  type,
  setUserMentioned,
  usersMentioned,
  currentWordIndex,
}) => {
  const [filteredOptions, setFilteredOptions] = useState(userManagementList);

  useEffect(() => {
    if (hasSuggestions) {
      // Find the user entered in text input field
      let addedUser = comment.substring(comment.lastIndexOf("@") + 1);
      // Filter from all user list based on user entered in text input field
      const userEmail = localStorage.getItem("name");
      let filteredOptions = userManagementList.filter(
        (obj) =>
          obj.user_name?.toLowerCase().includes(addedUser?.toLowerCase()) &&
          obj.email !== userEmail
      );
      setFilteredOptions(filteredOptions);
    }
  }, [comment]);

  /**
   * add user tag
   * @param {string} user - selected user to be tagged
   */

  const handleUsersMentioned = (user) => {
    let wordArray = cloneDeep(
      document.getElementById(`${type}TextBoxField`).value.split(" ")
    );
    // will replace the current typed word with the @user.user_name
    wordArray.splice(currentWordIndex, 1, "@" + user.user_name);
    document.getElementById(`${type}TextBoxField`).value = wordArray.join(" ");
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
          {filteredOptions?.length ? (
            filteredOptions.map((user) => {
              return (
                <ListItemButton onClick={() => handleUsersMentioned(user)}>
                  {user.user_name}
                </ListItemButton>
              );
            })
          ) : (
            <ListItemButton disableRipple>No user found</ListItemButton>
          )}
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
