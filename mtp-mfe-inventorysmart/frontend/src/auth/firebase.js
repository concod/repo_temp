import { TENANT_ENV, ENV } from "config/api";
import firebase from "firebase/app";
import "firebase/auth";
import authConfig from "./config";
import authKey from "../api_key.json";

let app;
try {
  const apiKey = authKey?.[TENANT_ENV]?.apiKey || authConfig?.apiKey;
  const authDomain = authKey?.[TENANT_ENV]?.authDomain || authConfig?.authDomain;

  if (!apiKey || !authDomain) {
    throw new Error(`Firebase configuration missing for tenant ${TENANT_ENV}. ` +
      `Missing: ${!apiKey ? "ApiKey" : ""} ${!authDomain ? "AuthDomain" : ""}`);
  }

  app = firebase.initializeApp({
    apiKey,
    authDomain,
  });
  if(ENV === "devs" || ENV === "test"){
    console.log("IS - Firebase initialized with - ApiKey - ", apiKey, " AuthDomain - ", authDomain)
  }
} catch (error) {
  console.error('IS - Firebase initialization failed:', error.message);
  throw error;
}
// firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);

export const auth = app.auth();
export default app;
export const firebaseobj = firebase;
