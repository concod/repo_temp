import _, { cloneDeep } from "lodash";
import { likeDislikeComment } from "./smartBotservices";

/**
 * Method to like/dislike messages
 * @param {string} question
 * @param {boolean} liked - true if response was liked / false if disliked
 * @param {function} setLoadingState
 * @param {function} displaySnackMessages
 * @param {object} templateData
 * @returns
 */
export const handleMessageLike = async (
  question,
  liked,
  setLoadingState,
  displaySnackMessages,
  templateData
) => {
  const payload = {
    question: question?.split("_")?.[0],
    liked,
  };

  const currentMode = localStorage?.getItem("currentModeData");
  const chats = cloneDeep(templateData);
  const activeMessageIndex = _.findIndex(
    chats?.[currentMode],
    (item) =>
      question ===
      `${item?.response_heading || item?.screen_name}_${item?.timeStamp}`
  );
  const activeMessage = chats?.[currentMode]?.[activeMessageIndex];
  try {
    const request = await likeDislikeComment(payload);
    if (request?.status) {
      let updatedMessage = {
        ...activeMessage,
        extra: {
          status: liked ? "liked" : "disliked",
        },
      };
      const newChats = _.updateWith(
        chats?.[currentMode],
        activeMessageIndex,
        () => updatedMessage
      );
      templateData[currentMode] = newChats;
      localStorage.setItem("chatData", JSON.stringify(templateData));
      displaySnackMessages("Thank you, your feedback is noted", "success");
      return true;
    }
  } catch (error) {
    console.error("likeDislikeComment error", error);
    displaySnackMessages("Something went wrong", "error");
    return false;
  } finally {
    setLoadingState({
      like: null,
      dislike: null,
    });
  }
};
