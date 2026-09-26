import firebase from "firebase/app";
import "firebase/auth";
import authConfig from "./config";

const app = firebase.initializeApp({
  apiKey: authConfig.apiKey,
  authDomain: authConfig.authDomain,
});
// firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);

export const auth = app.auth();
export default app;
export const firebaseobj = firebase;