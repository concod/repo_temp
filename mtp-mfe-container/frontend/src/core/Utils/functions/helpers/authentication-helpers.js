import { firebaseobj } from "auth/firebase";

/**
 * Add authentication related functions here
 */

export const getToken = async () => {
  // Bypassing Firebase token logic in standalone DEV mode
  if (import.meta.env?.DEV) {
    const devToken = localStorage.getItem("DEV_TOKEN");
    if (devToken) {
      return devToken;
    }
    console.warn("DEV MODE: No DEV_TOKEN found in localStorage. Please paste a valid token: localStorage.setItem('DEV_TOKEN', '<token>')");
    return "MOCK_DEV_TOKEN";
  }

  //Returns token of current user
  const user = firebaseobj.auth().currentUser;
  let token = null;
  if (user) {
    try {
      token = await user.getIdToken();
    } catch (error) {
      return;
    }
  }
  return token;
};
