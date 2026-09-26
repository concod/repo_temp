import { useEffect } from "react";
import { COMPONENT_CONFIG } from "../components-config/component-config";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createReducerState } from "core/actions/configuratorActions";
import { invokeApi } from "core/actions/jsonParserActions";
import { executeAction, executeReducerAction } from "./json-renderer-helper";

/**
 * JsonRenderer will render a component
 * by traversing through the json
 * @param {object} props
 * @returns the component according to the json
 * which was passed to it
 */
const JsonRenderer = (props) => {
  const [componentState, setComponentState] = useState({
    ComponentToBeRendered: null,
  });
  const [childComponent, setChildComponent] = useState(null);
  const [dynamicProps, setDynamicProps] = useState({});
  const { currentComponent } = props;
  const dispatch = useDispatch();
  const allCurrentReducerStates = useSelector((state) => state);

  /**
   * importComponent is the function which will
   * dynamically import componenets based on the
   * type of the currentComponent. If the component type
   * of the currentComponent matches any of the
   * component from the COMPONENT_CONFIG then that
   * component will be rendered
   */
  const importComponent = async () => {
    if (!currentComponent) {
      // Reset props if no component
      setDynamicProps({});
      return;
    }
    try {
      // Don't reset dynamicProps here - set new props directly to avoid rendering with empty props
      COMPONENT_CONFIG.forEach((component) => {
        if (component.type === currentComponent?.type) {
          // Load the component dynamically
          import(`../../dynamic/parser/${currentComponent?.componentPath}`)
            .then((module) => {
              if (module.default && typeof module.default === "function") {
                setComponentState({ ComponentToBeRendered: module.default });
              }
            })
            .catch((error) =>
              console.error("dynamic component load error", error)
            );
          setChildComponent(currentComponent?.children);
        }
      });
      if (currentComponent?.staticProps?.["reducerKey"]) {
        dispatch(
          createReducerState(currentComponent?.staticProps["reducerKey"], {})
        );
      }
      let currentCompProps = { ...currentComponent?.staticProps };
      if (currentComponent?.functionProps?.length !== 0) {
        currentComponent?.functionProps?.forEach((fn) => {
          let actions = [];
          let onLoad = fn.functionName === "onLoad";
          fn?.actions?.forEach((action) => {
            if (action.type === "api_function") {
              let funcToBeExecuted = (data, allReducerStates) =>
                executeAction({
                  func: invokeApi,
                  data,
                  allReducerStates: allReducerStates || allCurrentReducerStates,
                  dispatch,
                  ...action,
                  allCurrentReducerStates,
                });
              onLoad ? funcToBeExecuted() : actions.push(funcToBeExecuted);
            }
             else if (action.type === "reducer_function") {
              let funcToBeExecuted = (data, allReducerStates) =>
              executeReducerAction({
                  data,
                  allReducerStates,
                  dispatch,
                  ...action,
                  allCurrentReducerStates,
                });
              onLoad ? funcToBeExecuted() : actions.push(funcToBeExecuted);
            }
             else if (action.type === "redirect") {
              actions.push({
                link: action?.link,
                params: action?.params,
              });
            }
          });
          currentCompProps = {
            ...currentCompProps,
            [fn.functionName]: actions,
          };
        });
      }
      setDynamicProps(currentCompProps);
    } catch (error) {
      console.error("importComponent error", error);
    }
  };

  useEffect(() => {
    // Reset component state when currentComponent changes
    setComponentState({ ComponentToBeRendered: null });
    setChildComponent(null);
    // Don't reset dynamicProps immediately - let importComponent set new props first
    // This prevents components from rendering with undefined props
    importComponent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentComponent]);

  const { ComponentToBeRendered } = componentState;

  /**
   * JsonRenderer will be called here again recursively
   * when needed as the there will be a need to render
   * components inside the component
   */
  // Helper function to check if props are valid for rendering
  const arePropsValid = () => {
    if (!currentComponent || !ComponentToBeRendered) {
      return false;
    }
    
    // Hide buttons with saveThroughNav: true (they use sticky footer Save instead)
    if (
      currentComponent?.type === "button" &&
      (currentComponent?.staticProps?.saveThroughNav === true ||
       dynamicProps?.saveThroughNav === true)
    ) {
      return false;
    }
    
    // Check if dynamicProps has any keys
    if (Object.keys(dynamicProps).length === 0) {
      return false;
    }
    
    // For form components, ensure fields array exists
    if (currentComponent?.type === "form" && !Array.isArray(dynamicProps.fields)) {
      return false;
    }
    
    return true;
  };

  return (
    <div>
      {arePropsValid() && (
        <ComponentToBeRendered {...dynamicProps} id={currentComponent?.id}>
          {Array.isArray(childComponent) &&
            childComponent.map((child, index) => (
              <JsonRenderer key={index} currentComponent={child} />
            ))}
        </ComponentToBeRendered>
      )}
    </div>
  );
};

export default JsonRenderer;
