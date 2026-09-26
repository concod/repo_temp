import { useState, useEffect } from "react";
import { connect } from "react-redux";
import UserIcon from "assets/impactv3/carbon_events.svg";
import "./ChatSystemUserList.scss";
import { addUsersMentioned } from "../utils";

const ChatSystemUserList = (props) => {
  const {
    classes,
    comment,
    userManagementList,
    hasSuggestions,
    setHasSuggestions,
    usersMentioned,
    setUserMentioned,
    currentWordIndex,
    setInputValue,
    customClass = "",
    id = null,
  } = props;
  const [filteredOptions, setFilteredOptions] = useState(userManagementList);

  useEffect(() => {
    if (hasSuggestions) {
      // Find the user entered in text input field
      const words = comment.split(/\s/);
      let addedUser = words[currentWordIndex]?.substring(1);
      // Filter from all user list based on user entered in text input field
      const userEmail = localStorage.getItem("name");
      let filteredOptions = userManagementList.filter(
        (obj) =>
          obj.user_name?.toLowerCase().includes(addedUser?.toLowerCase()) &&
          obj.email !== userEmail
      );
      setFilteredOptions(filteredOptions);
      setTimeout(()=>{
        if(customClass){
          const portal = document.querySelector(`.${customClass}`);
          const inputPosition = document
            .getElementById("popoverBody")
            ?.getBoundingClientRect();
          portal.style.left = `${inputPosition.x}px`
          portal.style.top = `${
            inputPosition.y - portal.getBoundingClientRect().height - 5
          }px`;
          portal.style.opacity=1
        }
      },100)
    }
  }, [comment]);

  const handleUsersMentioned = (user) => {
    const input = document.getElementById(id || "chat-message-conversation");

    let currentMsg = input.innerText;
    const words = currentMsg.split(/\s/);
    words[currentWordIndex] = `@${user.user_name}`;

    let isUserAlreadyPresent = false;
    usersMentioned.forEach((item) => {
      if (item.user_name === user.user_name) isUserAlreadyPresent = true;
    });
    let newUsersMentioned = usersMentioned;
    if (!isUserAlreadyPresent) newUsersMentioned = [...usersMentioned, user];

    const finalCommentValue = words.join(" ");
    input.innerHTML = addUsersMentioned(
      finalCommentValue,
      newUsersMentioned,
      classes.highlight
    );
    setUserMentioned(newUsersMentioned);
    setHasSuggestions(false);
    setInputValue(finalCommentValue);
  };

  return (
    <section className={`user-list-container ${customClass}`}>
      <ul className="user-list">
        {filteredOptions.length ? (
          filteredOptions.map((user) => (
            <li key={user.user_name} onClick={() => handleUsersMentioned(user)}>
              <span className="user-icon">
                <UserIcon />
              </span>

              {user.user_name}
            </li>
          ))
        ) : (
          <li>No User Found</li>
        )}
      </ul>
    </section>
  );
};

const mapStateToProps = (state) => {
  return {
    userManagementList: state.commentBarReducer.userManagementList,
  };
};

export default connect(mapStateToProps, {})(ChatSystemUserList);
