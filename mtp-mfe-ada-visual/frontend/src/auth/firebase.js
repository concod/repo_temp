import { TENANT_ENV } from "config/api";
import firebase from "firebase/app";
import "firebase/auth";
import authConfig from "./config";
import authKey from "../api_key.json";

const app = firebase.initializeApp({
  apiKey: authKey?.[TENANT_ENV]?.apiKey || authConfig?.apiKey,
  authDomain: authKey?.[TENANT_ENV]?.authDomain || authConfig?.authDomain,
});
// firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);

export const auth = app.auth();
export default app;
export const firebaseobj = firebase;
