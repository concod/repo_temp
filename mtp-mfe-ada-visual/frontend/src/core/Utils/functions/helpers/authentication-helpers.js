import { firebaseobj } from "auth/firebase";

/**
 * Add authentication related functions here
 */

export const getToken = async () => {
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
