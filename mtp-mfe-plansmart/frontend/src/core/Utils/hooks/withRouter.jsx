import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { useParams } from "react-router-dom";
const withRouter = (Component) => {
  const ComponentWithRouterProp = (props) => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams();
    const history = {
      push: (path) => {
        navigate(path);
      },
    };
    return (
      <Component
        {...props}
        history={history}
        router={{ location, navigate, params }}
      />
    );
  };
  return ComponentWithRouterProp;
};
export default withRouter;