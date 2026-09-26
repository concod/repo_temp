export const getUserName = () => {
  try {
    const userID = localStorage.getItem("name");
    let userName = userID ? userID.split("@")[0] : "User";
    userName = userName
      .split(".")
      .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
      .join(" ");
    return userName;
  } catch (error) {
    console.error("getUserName error", error);
  }
};
