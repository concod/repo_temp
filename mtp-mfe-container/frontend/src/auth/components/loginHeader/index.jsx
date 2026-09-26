import logo from "assets/logo.svg?url";
import { Typography } from "@mui/material";

const LoginHeader = () => {
  return (
    <>
      <header className="signin-form__header">
        <img src={logo} alt="logo" />
        <Typography component="h1" variant="h4" className="brand__title">
          Smart Platform
        </Typography>
      </header>
    </>
  );
};

export default LoginHeader;
