import React, { useState } from "react";
import {
  TextField,
  Button,
  InputLabel,
  IconButton,
  InputAdornment,
} from "@mui/material";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles(() => ({
  loginInputLabel: {
    "@media (max-width:1200px)": {
      fontFamily: "Poppins",
      fontSize: "14px",
      fontStyle: "normal",
      fontWeight: 500,
      lineHeight: "normal"
    }
  }
}));

const LoginForm = (props) => {
  const classes = useStyles();
  const { email, password, onChange, ResetPassword, onSubmit, error } = {
    ...props,
  };
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <form className="form-width signin-form" onSubmit={onSubmit}>
        <div className="input-group">
          <InputLabel margin="dense" htmlFor="loginInputEmail" className={classes.loginInputLabel}>
            Name
          </InputLabel>
          <TextField
            variant="outlined"
            name="email"
            type="email"
            size="small"
            id="loginInputEmail"
            className={
              error.email && error.email.length
                ? "signin-form-input error-border"
                : "signin-form-input"
            }
            aria-describedby="emailHelp"
            placeholder="E-mail"
            required
            value={email}
            onChange={onChange}
            fullWidth
          />
          <p className="error-text">{error.email}</p>
        </div>
        <div className="input-group">
          <InputLabel htmlFor="loginPassword" className={classes.loginInputLabel}>Password</InputLabel>
          <TextField
            variant="outlined"
            name="password"
            type={`${showPassword ? "text" : "password"}`}
            size="small"
            id="loginPassword"
            className={
              error.password && error.password.length
                ? "signin-form-input error-border"
                : "signin-form-input"
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    onMouseDown={() => setShowPassword(!showPassword)}
                    size="small"
                  >
                    {showPassword ? (
                      <VisibilityOutlinedIcon
                        color="default"
                        fontSize="small"
                      />
                    ) : (
                      <VisibilityOffOutlinedIcon
                        color="default"
                        fontSize="small"
                      />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            placeholder="Password"
            required
            fullWidth
            value={password}
            onChange={onChange}
          />
          <p className="error-text">{error.password}</p>
        </div>
        <Button
          id="btnReset"
          variant="text"
          className="btn"
          onClick={ResetPassword}
        >
          Forgot Password?
        </Button>
        <Button
          type="submit"
          fullWidth
          id="btnLogin"
          variant="contained"
          className="btn-signin"
        >
          Sign in
        </Button>
      </form>
    </>
  );
};

export default LoginForm;
