import { sanitizeHtml } from "core/Utils/functions/utils";

export const getDateWithMonthandYear = (date = new Date()) => {
  const formattedDate = new Date(date).toDateString();
  console.log("date,", date, formattedDate);
  const [_, month, currentDate, year] = formattedDate.split(" ");
  return `${currentDate} ${month} ${year}` || "";
};

export const doesFirstLetterStartsWithASymbol = (
  event,
  symbol,
  setCurrentWordIndex,
  id = null
) => {
  try {
    const value = event.currentTarget.innerText;

    const editableDiv = document.getElementById(
      id || "chat-message-conversation"
    );
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();

    preCaretRange.selectNodeContents(editableDiv);
    preCaretRange.setEnd(range.startContainer, range.startOffset);

    const cursorPosition = preCaretRange.toString().length;

    // Split the input value into words
    const words = value.split(/\s/);

    // Find the current word based on cursor position
    let currentWord = "";
    let currentPosition = 0;
    for (let i = 0; i < words.length; i++) {
      currentPosition += words[i].length;
      if (currentPosition >= cursorPosition) {
        currentWord = words[i];
        setCurrentWordIndex(i);
        break;
      }
      // Add 1 to account for space between words
      currentPosition += 1;
    }

    // Check if the current word starts with current symbol
    if (currentWord && currentWord[0] === symbol) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("doesFirstLetterStartsWithAtTheRateSymbol error", error);
  }
};

const formatDate = (date) => {
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return new Intl.DateTimeFormat("en-US", options).format(date);
};

export const formatRelativeDate = (date) => {
  const actualDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // Check if the message date is today or yesterday
  if (actualDate.toDateString() === today.toDateString()) {
    return "Today";
  } else if (actualDate.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return formatDate(actualDate); // Return the specific date if it's neither today nor yesterday
};

export const getTextFromHTML = (htmlString) => {
  // Create a new HTML document
  const doc = new DOMParser().parseFromString(htmlString, "text/html");

  // Extract and return the text content
  return doc.body.textContent || doc.body.innerText || "";
};

export const arrageChatConversationData = (allEvents) => {
  const chatList = {};
  const starredList = {};
  const resolvedList = {};

  allEvents?.forEach((item) => {
    chatList[item.event_id] = {
      ...item,
      comments: {},
    };
  });

  return {
    chatList,
    starredList,
    resolvedList,
  };
};

// Helper function to parse custom date strings into Date objects
function parseCustomDate(dateString) {
  const today = new Date();

  if (dateString === "Today") {
    // Today's date without time for accurate comparison
    return today.setHours(0, 0, 0, 0);
  } else if (dateString === "Yesterday") {
    // Yesterday's date without time
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    return yesterday;
  } else {
    // Convert string like "Jan 26, 2025" into a Date object
    return new Date(dateString).setHours(0, 0, 0, 0);
  }
}

export const sortChatAccortoDates = (commentsData) => {
  return Object.entries(commentsData)
    .sort(([dateA], [dateB]) => {
      // First, ensure "Today" comes first
      if (dateA === "Today" && dateB !== "Today") return -1;
      if (dateB === "Today" && dateA !== "Today") return 1;

      // Then, ensure "Yesterday" comes second
      if (dateA === "Yesterday" && dateB !== "Yesterday") return -1;
      if (dateB === "Yesterday" && dateA !== "Yesterday") return 1;

      // Then, sort the rest of the dates chronologically
      // @ts-ignore
      return parseCustomDate(dateA) - parseCustomDate(dateB);
    })
    .reduce((acc, [date, value]) => {
      acc[date] = value;
      return acc;
    }, {});
};

export const arrageChatConversationCommentsData = (allCommentsData) => {
  const commentsData = allCommentsData?.reduce((acc, curr) => {
    const formattedDate = formatRelativeDate(curr.created_at || curr?.updated_at);
    acc[formattedDate] = acc[formattedDate]
      ? [...acc[formattedDate], curr]
      : [curr];
    return acc;
  }, {});

  return sortChatAccortoDates(commentsData);
};

export const arragenChatConversationCommentsStarredData = (allCommentsData) => {
  const chatData = arrageChatConversationCommentsData(allCommentsData);
  const starredData = { comments: [] };
  const resolveData = { comments: [] };

  Object.entries(chatData).map(([chatKey, chatValues]) => {
    starredData.comments = [...starredData.comments, ...chatValues];
    resolveData.comments = [...resolveData.comments, ...chatValues];
  });

  return {
    chatData,
    starredData,
    resolveData,
  };
};

export const addUsersMentioned = (comment, usersMentioned, className) => {
  // Sanitize input comment to prevent XSS attacks
  // Allow only safe tags: span (for highlights and mentions)
  const sanitizedInput = sanitizeHtml(comment || '', {
    ALLOWED_TAGS: ['span'],
    ALLOWED_ATTR: ['class', 'contenteditable'],
    ALLOW_DATA_ATTR: false
  });
  
  let newComment = sanitizedInput;
  if (Array.isArray(usersMentioned)) {
    usersMentioned.forEach((user, index) => {
      const userName = `@${user.user_name}`;
      // Sanitize user name to prevent XSS in user mentions
      const sanitizedUserName = sanitizeHtml(userName, { ALLOWED_TAGS: [] });
      let userMentionedHTML = `<span class=${className} contenteditable="false">${sanitizedUserName}</span>`;

      if (newComment.includes('<span class="highlight">')) {
        const regex = new RegExp(
          `(?<=<span class="highlight">)(.*?)(?=</span>)`,
          "g"
        );
        const matchString = newComment.match(regex)?.[0]?.toLowerCase();
        const matchStringLength = matchString?.length || 0;
        const startIndex = matchStringLength
          ? sanitizedUserName.toLowerCase()?.indexOf(matchString)
          : -1;
        const sanitizedComment = getTextFromHTML(newComment).toLowerCase();
        let isSameStringMatchBeforeName = false;

        if (startIndex !== -1) {
          const beforeUserNameMatchStringIndex = sanitizedComment.indexOf(
            matchString
          );
          const firstUserNameIndex = sanitizedComment.indexOf(
            sanitizedUserName.toLowerCase()
          );
          if (
            beforeUserNameMatchStringIndex !== -1 &&
            beforeUserNameMatchStringIndex < firstUserNameIndex
          ) {
            isSameStringMatchBeforeName = true;
          }
        }

        if (startIndex !== -1 && !isSameStringMatchBeforeName) {
          const newUserName = sanitizedUserName.substring(
            startIndex,
            startIndex + matchStringLength
          );

          const sanitizedNewUserName = sanitizeHtml(newUserName, { ALLOWED_TAGS: [] });
          const userNameWithHighlight = sanitizedUserName.replace(
            sanitizedNewUserName,
            `<span class="highlight">${sanitizedNewUserName}</span>`
          );

          userMentionedHTML = userMentionedHTML.split(sanitizedUserName).join(userNameWithHighlight);
          newComment = sanitizedComment.split(sanitizedUserName.toLowerCase()).join(userMentionedHTML);
        } else {
          newComment = newComment.split(sanitizedUserName).join(userMentionedHTML);
        }
      } else {
        newComment = newComment.split(sanitizedUserName).join(userMentionedHTML);
      }
    });
    // Final sanitization before returning to ensure all HTML is safe
    return sanitizeHtml(newComment, {
      ALLOWED_TAGS: ['span'],
      ALLOWED_ATTR: ['class', 'contenteditable'],
      ALLOW_DATA_ATTR: false
    });
  }
  // Sanitize the comment even if there are no user mentions
  return sanitizeHtml(sanitizedInput, {
    ALLOWED_TAGS: ['span'],
    ALLOWED_ATTR: ['class', 'contenteditable'],
    ALLOW_DATA_ATTR: false
  });
};

export const addHighligher = (realComment, value) => {
  const commentValue = realComment.toLowerCase();
  const valueStartIndex = commentValue.indexOf(value);
  const lastIndex = valueStartIndex + value.length;
  const originalValue = realComment.substring(valueStartIndex, lastIndex);
  return (
    realComment.substring(0, valueStartIndex) +
    `<span class="highlight">${originalValue}</span>` +
    realComment.substring(lastIndex)
  );
};

export const checkCurrentTimeIsGreaterThanSomeTime = (
  previousTime,
  timeInMinute
) => {
  const chatCreatedTime = new Date(previousTime).getTime();
  const currentTime = new Date().getTime();
  const timeDifference = currentTime - chatCreatedTime;
  const FIVE_MINUTE_MILISECOND = timeInMinute * 60 * 1000;
  return timeDifference > FIVE_MINUTE_MILISECOND;
};
