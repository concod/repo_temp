import { pxToRem } from "core/Utils/functions/utils";
import { useNavigate } from "react-router-dom-v5-compat";
import makeStyles from "@mui/styles/makeStyles";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";

const useStyles = makeStyles((theme) => ({
  linkStyling: {
    fontSize: pxToRem(12),
  },
}));

const RedirectLink = ({ to, screenName }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const classes = useStyles();
  const [showLink, setShowLink] = useState(true);

  const handleClick = (event) => {
    // Prevent default navigation behavior
    event.preventDefault();
    let searchParams = window.location.search;
    let currentLink = window.location.pathname + searchParams;
    // Remove the href attribute to prevent further navigation
    event.target.removeAttribute("href");
    // Perform the redirection
    if (currentLink !== to) {
      navigate(to);
    }
  };

  useEffect(() => {
    let searchParams = window.location.search;
    let currentLink = window.location.pathname + searchParams;
    if (currentLink === to) {
      let link = document.getElementById("appNavigationLink");
      link.removeAttribute("href");
      setShowLink(false);
    }
  }, [location]);

  return (
    <>
      {showLink ? (
        <a
          href={to}
          onClick={handleClick}
          className={classes.linkStyling}
          id="appNavigationLink"
        >
          Navigate to the {screenName} screen
        </a>
      ) : (
        ""
      )}
    </>
  );
};

export default RedirectLink;
