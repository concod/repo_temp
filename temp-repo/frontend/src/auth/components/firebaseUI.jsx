import React from "react";
import StyledFirebaseAuth from "react-firebaseui/StyledFirebaseAuth";

const FirebaseLogin = (props) => {
  const { FirebaseUIConfig, firebaseobj } = { ...props };
  return (
    <>
      <StyledFirebaseAuth
        uiConfig={FirebaseUIConfig}
        firebaseAuth={firebaseobj.auth()}
      />
    </>
  );
};

export default FirebaseLogin;
