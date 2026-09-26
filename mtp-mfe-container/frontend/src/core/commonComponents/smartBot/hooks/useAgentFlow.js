import React, { useCallback } from "react";
import { generateConversationId, getCurrentDateTimeString } from "../utlis.js";
// import { tableResponse } from "../components/message-template/components/test";
import isEmpty from "lodash/isEmpty.js";
import isArray from "lodash/isArray.js";
import { parseResponse, getDynamicFunction } from "../utlis.js";
import { initiateAgent } from "../services/chatbot-services.js";
import { generateConversationObject } from "../utlis.js";
import ThinkingIndicator from "../components/message-template/components/message-types/streamed-content/ThinkingIndicator.jsx";
import ThinkinHeaderInfo from "../components/message-template/components/message-types/streamed-content/ThinkinHeaderInfo.jsx";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
// import { exampleGraphData } from "../examples/GraphExample";
// import { stackedBarChartExample } from "../examples/GraphExample";
// import { examplePieChartData } from "../examples/GraphExample";

export const useAgentFlow = (
  dateFormat,
  chatDataRef,
  currentMode,
  setShowChatPlaceholder,
  setLoader,
  baseUrl = "",
  setCurrentSessionId = (params) => {},
  customChatConfig = null,
  chatDataInfoRef = null,
  utilityObjectData = {}
) => {
  const { activeConversationId, setActiveConversationId } = utilityObjectData;

  const setAgentFlow = useCallback(
    async (payload, input = "", baseUrlTemp = "", conversationIdParam = null) => {
      let conversationId = conversationIdParam || activeConversationId;
      try {
        const currentTimeString = getCurrentDateTimeString(dateFormat);
        const currentModeValue =
          localStorage.getItem("currentModeData") || currentMode;
        const showUserChat = payload?.user_input ? true : false;
        const userChat = {
          timeStamp: currentTimeString,
          userType: "user",
          bodyText: payload?.chat_input ? payload?.chat_input : payload?.user_input,
          screen_name: currentModeValue,
          flow_type: currentModeValue,
          hasDirectActionType: false,
        };
        const loaderData = {
          userName: "Iris",
          timeStamp: currentTimeString,
          userType: "loader",
        };
        if (!conversationId || isEmpty(chatDataInfoRef.current[currentModeValue].conversations[conversationId])) {
          conversationId = generateConversationId();
          setActiveConversationId(conversationId);
          chatDataInfoRef.current[
            currentModeValue
          ].conversations[conversationId] = generateConversationObject(conversationId);
        }
        // if (isEmpty(chatDataInfoRef.current[currentModeValue])) {
        //   chatDataInfoRef.current[
        //     currentModeValue
        //   ] = generateConversationObject();
        // }
        if (showUserChat) {
          chatDataRef.current[currentModeValue] = [
            ...chatDataRef.current?.[currentModeValue],
            userChat,
            loaderData,
          ];
          chatDataInfoRef.current[
            currentModeValue
          ].conversations[conversationId].messages = [
            ...chatDataInfoRef.current[currentModeValue].conversations[conversationId]
              .messages,
            userChat,
          ];
        } else {
          chatDataRef.current[currentModeValue] = [
            ...chatDataRef.current?.[currentModeValue],
            loaderData,
          ];
        }
        setShowChatPlaceholder(false);
        if(!utilityObjectData?.runStreaming) {
          setLoader(true);
        }
        let response = {};
        if(utilityObjectData?.runStreaming) {
          let utilityObject = {
            activeConversationId: conversationId,
            currentMode: currentModeValue,
            chatDataRef,
            chatBodyRef: utilityObjectData?.chatBodyRef,
            setChatDataState: utilityObjectData?.setChatDataState,
            chatDataInfoRef,
            method: "POST",
            endpoint: `${baseUrlTemp}/chatbot/agent/init`,
            setLoader,
            processResponse: processResponse,
            setInitValue: utilityObjectData?.setInitValue,
            setSessionId: utilityObjectData?.setSessionId,
            thinkingResponse: {
              thinkingContent: (
                <ThinkingIndicator
                  thinkingContent={utilityObjectData?.thinkingContent}
                />
              ),
              thinkingTime: 0,
              thinkingHeading: (
                <ThinkinHeaderInfo
                  thinkingHeaderMessage={
                    utilityObjectData?.thinkingHeaderMessage
                  }
                />
              ),

              isThinking: utilityObjectData?.isThinking,
            },
            thinkingHeaderMessage: utilityObjectData?.thinkingHeaderMessage,
            thinkingContent: utilityObjectData?.thinkingContent,
            setThinkingContent: utilityObjectData?.setThinkingContent,
            isThinking: true,
            setIsThinking: utilityObjectData?.setIsThinking,
            chatId: utilityObjectData?.chatId,
            setChatId: utilityObjectData?.setChatId,
            isStop: utilityObjectData?.isStop,
            setIsStop: utilityObjectData?.setIsStop,
            functionsRef: utilityObjectData?.functionsRef,
            functionsState: utilityObjectData?.functionsState,
            setFunctionsState: utilityObjectData?.setFunctionsState,
            setThinkingHeaderMessage:
              utilityObjectData?.setThinkingHeaderMessage,
            uniqueChatId: utilityObjectData?.uniqueChatId,
            setUniqueChatId: utilityObjectData?.setUniqueChatId,
            fieldNumber: utilityObjectData?.fieldNumber,
            setFieldNumber: utilityObjectData?.setFieldNumber,
            setAdditionalArgs: utilityObjectData?.setAdditionalArgs,
            baseUrl: baseUrlTemp,
          };
          response = await parseResponse(
            null,
            "stream",
            "",
            currentModeValue,
            false,
            "",
            {},
            payload,
            utilityObject
          );
          {
            let chatDataMessages = chatDataInfoRef.current[currentModeValue].conversations[conversationId].messages;
            chatDataMessages = [...chatDataMessages, response];
            chatDataInfoRef.current[currentModeValue].conversations[conversationId].messages = chatDataMessages;
          }
          
          // Trigger re-render by updating chatDataState
          if (utilityObjectData?.setChatDataState) {
            utilityObjectData.setChatDataState({ ...chatDataRef.current });
          }
          return;
        } else {
          response = await initiateAgent(payload, baseUrlTemp);
          // Example response with all form components
          // response = {
          //   data: {
          //     data: {
          //     data: [
          //       {
          //         type: "slider",
          //         data: {
          //           header: "Slider Example",
          //           headerOrentiation: "left",
          //           inputPosition: "inline",
          //           label: "Select a value",
          //           max: 100,
          //           min: 0,
          //           required: true,
          //           disabled: false
          //         }
          //       },
          //       {
          //         type: "select",
          //         data: {
          //           header: "Select Example",
          //           inputPosition: "inline",
          //           labelOrientation: "top",
          //           label: "Choose options",
          //           isMulti: true,
          //           options: [
          //             {
          //               label: "Option 1",
          //               value: "opt1"
          //             },
          //             {
          //               label: "Option 2",
          //               value: "opt2"
          //             },
          //             {
          //               label: "Option 3",
          //               value: "opt3"
          //             }
          //           ],
          //           isRequired: true,
          //           isDisabled: false
          //         }
          //       },
          //       {
          //         type: "datePicker",
          //         data: {
          //           displayFormat: "DD-MM-YYYY",
          //           label: "Select Date",
          //           isRequired: true,
          //           labelOrientation: "top",
          //           placeholder: "Select Date",
          //           minDate: null,
          //           maxDate: null,
          //           isDisabled: false
          //         }
          //       },
          //       {
          //         type: "checkbox",
          //         data: {
          //           label: "I agree to terms and conditions",
          //           checked: false,
          //           required: true,
          //           disabled: false
          //         }
          //       },
          //       {
          //         type: "radio",
          //         data: {
          //           label: "Select your preference",
          //           isDisabled: false,
          //           orientation: "column",
          //           options: [
          //             {
          //               label: "Option 1",
          //               value: "opt1"
          //             },
          //             {
          //               label: "Option 2",
          //               value: "opt2"
          //             },
          //             {
          //               label: "Option 3",
          //               value: "opt3"
          //             }
          //           ],
          //           param_name: "radio_preference"
          //         }
          //       },
          //       {
          //         type: "input",
          //         data: {
          //           label: "Enter your name",
          //           placeholder: "Type your full name here...",
          //           isRequired: true,
          //           isDisabled: false,
          //           inputType: "text",
          //           labelOrientation: "top",
          //           defaultValue: "",
          //           maxLength: 50,
          //           minLength: 2,
          //           param_name: "user_name"
          //         }
          //       }
          //     ]
          //   }
          // }
          // };
        }






        // API response with image type
        // const response = {
        //   data: {
        //     data: {
        //       data: {
        //         type: "chips",
        //         headerTitle: "Please select for which Modules you want insights for",
        //         isMultiSelect: true,
        //         data: [
        //         {
        //           chip_name: "lost_sales",
        //           agentId: "1",
        //           sessionId: "1",
        //         },
        //         {
        //           chip_name: "inventory_turnover",
        //           agentId: "1",
        //           sessionId: "1",
        //         },
        //         {
        //           chip_name: "inventory",
        //           agentId: "1",
        //           sessionId: "1",
        //         }
        //       ]},
        //     },
        //   },
        // };
        // const response = {
        //   data: {
        //     data: {
        //       data: {
        //         type: "image",
        //         imageUrl: "https://picsum.photos/800/400",
        //         caption: "Inventory Status",
        //       },
        //       hasOwnParserAndRenderer: true,
        //     },
        //   },
        // };
        // const response = {
        //   data: {
        //     data: tableResponse,
        //   },
        // };
        // const response = {
        //   data: {
        //     data: examplePieChartData,
        //   },
        // };
        // const response = {
        //   data: {
        //     data: {
        //       type: "questions",
        //       header:
        //         "Here are few questions that users are typically interested in.",
        //       data: [
        //         {
        //           question: "Can I create product groups based on attributes?",
        //           screen_name: "Grouping",
        //           question_index: 1,
        //           question_description:
        //             "Can I create product groups based on attributes?",
        //           flow_type: "agent",
        //         },
        //         {
        //           question:
        //             "Tell me steps to add one store to multiple existing store groups.",
        //           screen_name: "Grouping",
        //           question_index: 2,
        //           question_description:
        //             "Tell me steps to add one store to multiple existing store groups.",
        //           flow_type: "agent",
        //         },
        //         {
        //           question:
        //             "How can I create a new group by merging multiple existing groups?",
        //           screen_name: "Grouping",
        //           question_index: 3,
        //           question_description:
        //             "How can I create a new group by merging multiple existing groups?",
        //           flow_type: "agent",
        //         },
        //         {
        //           question:
        //             "Give me the quickest way to delete multiple stores across existing store groups?",
        //           screen_name: "Grouping",
        //           question_index: 4,
        //           question_description:
        //             "Give me the quickest way to delete multiple stores across existing store groups?",
        //           flow_type: "agent",
        //         },
        //       ],
        //     },
        //   },
        // };
        // let response = {
        //   data: {
        //     data: {
        //       data:
        //       {
        //         type: "text",
        //         response: "Agent task completed",
        //         response_heading: "Agent task completed",
        //       },
        //     },
        //   },
        // };
        // response = {
        //   data: {
        //     data: {
        //       data: [
        //         {
        //           type: "table",
        //           data: {
        //             display_name: "Sample table title",
        //             table_name: "sample_table",
        //             unique_id: "header_1",
        //             select_all_component: true,
        //             row_data: [
        //               {
        //                 header_1: "Freshness",
        //                 header_2:
        //                   "Stores with decreased Freshness TY vs LY experienced a sharper increase in sales units ty (27.6%) compared to stores with increased Freshness TY (15.8%).",
        //                 header_3: "low positive",
        //               },
        //               {
        //                 header_1: "Overall Discount %",
        //                 header_2:
        //                   "Only stores with increased Overall Discount % TY showed an increase in sales units ty (18.0%).",
        //                 header_3: "low positive",
        //               },
        //             ],
        //             table_config: [
        //               {
        //                 column_header: "header name 1",
        //                 field: "header_1",
        //               },
        //               {
        //                 column_header: "header name 2",
        //                 field: "header_2",
        //               },
        //               {
        //                 column_header: "header name 3",
        //                 field: "header_3",
        //               },
        //             ],
        //           },
        //         },
        //         {
        //           type: "table",
        //           data: {
        //             display_name: "Sample table title 2",
        //             table_name: "sample_table_2",
        //             unique_id: "header_1",
        //             select_all_component: true,
        //             row_data: [
        //               {
        //                 header_1: "Freshness",
        //                 header_2:
        //                   "Stores with decreased Freshness TY vs LY experienced a sharper increase in sales units ty (27.6%) compared to stores with increased Freshness TY (15.8%).",
        //                 header_3: "low positive",
        //               },
        //               {
        //                 header_1: "Overall Discount %",
        //                 header_2:
        //                   "Only stores with increased Overall Discount % TY showed an increase in sales units ty (18.0%).",
        //                 header_3: "low positive",
        //               },
        //             ],
        //             table_config: [
        //               {
        //                 column_header: "header name 1",
        //                 field: "header_1",
        //               },
        //               {
        //                 column_header: "header name 2",
        //                 field: "header_2",
        //               },
        //               {
        //                 column_header: "header name 3",
        //                 field: "header_3",
        //               },
        //             ],
        //           },
        //         },
        //         {
        //           type: "chips",
        //           headerTitle:
        //             "Please select for which Modules you want insights for",
        //           data: [
        //             {
        //               chip_name: "lost_sales",
        //               flow_type: "agent",
        //             },
        //             {
        //               chip_name: "inventory_turnover",
        //               flow_type: "agent",
        //             },
        //             {
        //               chip_name: "inventory",
        //               flow_type: "agent",
        //             },
        //           ],
        //         },
        //       ],
        //     },
        //   },
        // };

        // const response = {
        //   data: {
        //     data: tableResponse,
        //   },
        // };

        processResponse(response, payload, currentModeValue, customChatConfig, {}, conversationId);

        // let parsedResponse = {};
        // let customParseResponse = null;

        // // Check if a custom parser is provided and load it
        // if (
        //   response?.data?.data?.hasOwnParserAndRenderer &&
        //   customChatConfig?.parserPath &&
        //   customChatConfig?.parserFunctionName
        // ) {
        //   try {
        //     customParseResponse = await getDynamicFunction(
        //       customChatConfig.parserPath,
        //       customChatConfig.parserFunctionName
        //     );
        //   } catch (error) {
        //     console.error("Failed to load custom parser:", error);
        //   }
        // }

        // // Process the response
        // if (
        //   !isEmpty(response?.data?.data?.data) &&
        //   !isArray(response?.data?.data?.data)
        // ) {
        //   let tempWaitingText =
        //     "Optimization process has been triggered. Please wait while we complete the process.";
        //   if (
        //     response?.data?.data?.data?.type === "text" &&
        //     response?.data?.data?.data?.response === tempWaitingText
        //   ) {
        //     // Use custom parser if available, otherwise use default
        //     if (customParseResponse) {
        //       parsedResponse = await customParseResponse(
        //         response.data.data.data,
        //         response.data.data.data.type,
        //         payload.agent_id,
        //         currentModeValue,
        //         false,
        //         response?.data?.data?.session_id,
        //         customChatConfig
        //       );
        //     } else {
        //       parsedResponse = parseResponse(
        //         response.data.data.data,
        //         response.data.data.data.type,
        //         payload.agent_id,
        //         currentModeValue,
        //         false,
        //         response?.data?.data?.session_id,
        //         {prepareDataAndSendToAgent, baseUrl},
        //       );
        //     }

        //     chatDataRef.current[currentModeValue] = [
        //       ...chatDataRef.current[currentModeValue]?.filter(
        //         (data) => data?.userType != "loader"
        //       ),
        //       parsedResponse,
        //     ];
        //     chatDataRef.current[currentModeValue] = chatDataRef.current[
        //       currentModeValue
        //     ].flat();
        //     setLoader(false);
        //     return;
        //   }

        //   setCurrentSessionId(response?.data?.data?.session_id);

        //   // Use custom parser if available, otherwise use default
        //   if (customParseResponse) {
        //     parsedResponse = await customParseResponse(
        //       response.data.data.data,
        //       response.data.data.data.type,
        //       payload.agent_id,
        //       currentModeValue,
        //       false,
        //       response?.data?.data?.session_id,
        //       customChatConfig
        //     );
        //   } else {
        //     parsedResponse = parseResponse(
        //       response.data.data.data,
        //       response.data.data.data.type,
        //       payload.agent_id,
        //       currentModeValue,
        //       false,
        //       response?.data?.data?.session_id,
        //       {prepareDataAndSendToAgent, baseUrl}
        //     );
        //   }
        // } else {
        //   setCurrentSessionId(response?.data?.data?.session_id);

        //   // Handle array responses
        //   if (customParseResponse) {
        //     let parsedResponseArray = await Promise.all(
        //       response?.data?.data?.data?.map(async (item, index) => {
        //         let disableTimeAndName = index === 0 ? false : true;
        //         return customParseResponse(
        //           item,
        //           item.type,
        //           payload.agent_id,
        //           currentModeValue,
        //           disableTimeAndName,
        //           response?.data?.data?.session_id,
        //           customChatConfig
        //         );
        //       })
        //     );
        //     parsedResponse = parsedResponseArray;
        //   } else {
        //     let parsedResponseArray = response?.data?.data?.data?.map(
        //       (item, index) => {
        //         let disableTimeAndName = index === 0 ? false : true;
        //         return parseResponse(
        //           item,
        //           item.type,
        //           payload.agent_id,
        //           currentModeValue,
        //           disableTimeAndName,
        //           response?.data?.data?.session_id,
        //           {prepareDataAndSendToAgent, baseUrl}
        //         );
        //       }
        //     );
        //     parsedResponse = parsedResponseArray;
        //   }
        // }

        // chatDataRef.current[currentModeValue] = [
        //   ...chatDataRef.current[currentModeValue]?.filter(
        //     (data) => data?.userType != "loader"
        //   ),
        //   parsedResponse,
        // ];
        // chatDataRef.current[currentModeValue] = chatDataRef.current[
        //   currentModeValue
        // ].flat();
        // let chatDataMessages = chatDataInfoRef.current[
        //   currentModeValue
        // ].conversations[1].messages;
        // let finalParsedResponse = isArray(parsedResponse) ? parsedResponse : [parsedResponse];
        // finalParsedResponse.forEach((message, index) => {
        //   message.firstMessage = index === 0 ? true : false;
        // });
        // chatDataMessages = [...chatDataMessages, ...finalParsedResponse];
        // chatDataInfoRef.current[
        //   currentModeValue
        // ].conversations[1].messages = chatDataMessages;
        
        // // Trigger re-render by updating chatDataState
        // if (utilityObjectData?.setChatDataState) {
        //   utilityObjectData.setChatDataState({ ...chatDataRef.current });
        // }
        
        // setLoader(false);
      } catch (error) {
        console.error("Error in setAgentFlow: ", error);
        const failResponseText = {
          timeStamp: getCurrentDateTimeString(),
          userType: "bot",
          userName: "Iris",
          bodyText: error?.response?.data?.data?.error?.response
            ? error?.response?.data?.data?.error?.response
            : "Sorry, chatbot is not available now",
          headerTitle: "",
          noShowHeaderTitle: true,
          bodyType: "text",
        };
        const currentModeValue =
        localStorage.getItem("currentModeData") || currentMode;
        let chatDataMessages = chatDataInfoRef.current[
          currentModeValue
        ].conversations[conversationId].messages;
        chatDataMessages = [...chatDataMessages, failResponseText];
        chatDataInfoRef.current[
          currentModeValue
        ].conversations[conversationId].messages = chatDataMessages;
        chatDataRef.current[currentMode] = [
          ...chatDataRef.current[currentMode]?.filter(
            (data) => data.userType !== "loader"
          ),
          failResponseText,
        ];
        
        // Trigger re-render by updating chatDataState
        if (utilityObjectData?.setChatDataState) {
          utilityObjectData.setChatDataState({ ...chatDataRef.current });
        }
        
        setLoader(false);
      }
    },
    [currentMode, chatDataRef, baseUrl, customChatConfig, utilityObjectData?.thinkingContent, activeConversationId]
  );

  const prepareDataAndSendToAgent = useCallback((data, init = false, utilityObjectData) => {
    try {
      let payload = {};
      payload = {
        agent_id: data.agentId,
        session_id: data.sessionId ? data.sessionId : utilityObjectData?.sessionId ? utilityObjectData?.sessionId : "",
        user_input:
          data?.actionType !== "direct" || data?.funcCallType === "middleware"
            ? data.userInput
            : data.displayText,
        init: utilityObjectData?.initValue,
        chat_input: data?.chatInput,
        delay: 0.3,
        chat_id: utilityObjectData?.uniqueChatId ? utilityObjectData?.uniqueChatId : utilityObjectData?.currentAgentChatId,
        answer_mode: data?.answerMode || "auto",
        ...(!isEmpty(utilityObjectData?.additionalArgs) ? utilityObjectData.additionalArgs : {}),
      };
      if(!isEmpty(data?.userExplicitInput)) {
        payload.user_explicit_input = data?.userExplicitInput;
        payload.chat_input = data.userInput;
        payload.user_input = data.textWithColumnNames;
      }
      if (!isEmpty(utilityObjectData?.chatbotContext)) {
        const {
          chatbotContext,
          setChatbotContext,
          dispatch,
        } = utilityObjectData;
        payload.user_input = {};
        payload.chat_input = "";
        for (const key in chatbotContext) {
          if (chatbotContext[key]?.updated) {
            let value = chatbotContext[key][key];
            payload.user_input[key] = Array.isArray(value)
              ? value
              : chatbotContext[key]?.type === "number" ? Number(value) : value.toString();
            if(isArray(value)) {
              value = value.map((item) => replaceSpecialCharacter(item.toString()));
            }
            else {
              value = replaceSpecialCharacter(value.toString());
            }
            payload.chat_input =
              payload.chat_input + `${replaceSpecialCharacter(value)},`;
          }
        }
        dispatch(setChatbotContext({}));
      }
      // Get activeConversationId from utilityObjectData if available, otherwise use the one from closure
      const currentConversationId = utilityObjectData?.activeConversationId || activeConversationId;
      setAgentFlow(payload, "", data?.baseUrl, currentConversationId);
    } catch (error) {
      console.error("Error in prepareDataAndSendToAgent: ", error);
    }
  }, [activeConversationId, setAgentFlow]);

  const processResponse = useCallback(
    async (
      response,
      payload,
      currentModeValue,
      customChatConfig,
      utilsObject,
      conversationId
    ) => {
      try {
        let parsedResponse = {};
        let customParseResponse = null;

        // Check if a custom parser is provided and load it
        if (
          response?.data?.data?.hasOwnParserAndRenderer &&
          customChatConfig?.parserPath &&
          customChatConfig?.parserFunctionName
        ) {
          try {
            customParseResponse = await getDynamicFunction(
              customChatConfig.parserPath,
              customChatConfig.parserFunctionName
            );
          } catch (error) {
            console.error("Failed to load custom parser:", error);
          }
        }

        // Process the response
        if (
          !isEmpty(response?.data?.data?.data) &&
          !isArray(response?.data?.data?.data)
        ) {
          let tempWaitingText =
            "Optimization process has been triggered. Please wait while we complete the process.";
          if (
            response?.data?.data?.data?.type === "text" &&
            response?.data?.data?.data?.response === tempWaitingText
          ) {
            // Use custom parser if available, otherwise use default
            if (customParseResponse) {
              parsedResponse = await customParseResponse(
                response.data.data.data,
                response.data.data.data.type,
                payload.agent_id,
                currentModeValue,
                false,
                response?.data?.data?.session_id,
                customChatConfig
              );
            } else {
              parsedResponse = parseResponse(
                response.data.data.data,
                response.data.data.data.type,
                payload.agent_id,
                currentModeValue,
                false,
                response?.data?.data?.session_id,
                { prepareDataAndSendToAgent, baseUrl }
              );
            }

            chatDataRef.current[currentModeValue] = [
              ...chatDataRef.current[currentModeValue]?.filter(
                (data) => data?.userType != "loader"
              ),
              parsedResponse,
            ];
            chatDataRef.current[currentModeValue] = chatDataRef.current[
              currentModeValue
            ].flat();
            setLoader(false);
            return;
          }

          setCurrentSessionId(response?.data?.data?.session_id);

          // Use custom parser if available, otherwise use default
          if (customParseResponse) {
            parsedResponse = await customParseResponse(
              response.data.data.data,
              response.data.data.data.type,
              payload.agent_id,
              currentModeValue,
              false,
              response?.data?.data?.session_id,
              customChatConfig
            );
          } else {
            parsedResponse = parseResponse(
              response.data.data.data,
              response.data.data.data.type,
              payload.agent_id,
              currentModeValue,
              false,
              response?.data?.data?.session_id,
              { prepareDataAndSendToAgent, baseUrl },
            );
          }
        } else if (isArray(response?.data?.data?.data) && response?.data?.data?.data.length >= 1) {
          setCurrentSessionId(response?.data?.data?.session_id);
          let responseData = response?.data?.data?.data;
          let thinkingInfo = {};
          if (
            !isEmpty(responseData?.[0]?.thinkingResponse) &&
            responseData?.[0]?.type === "text"
          ) {
            thinkingInfo = responseData?.[0]?.thinkingResponse;
          }
          
          // Multiple items - create a combined response
          const combinedData = {
            type: "combined",
            data: responseData,
            headerTitle: "",
          };
          
          if (customParseResponse) {
            parsedResponse = await customParseResponse(
              combinedData,
              "combined",
              payload.agent_id,
              currentModeValue,
              false,
              response?.data?.data?.session_id,
              customChatConfig,
              null,
              { thinkingResponse: thinkingInfo }
            );
          } else {
            parsedResponse = parseResponse(
              combinedData,
              "combined",
              payload.agent_id,
              currentModeValue,
              false,
              response?.data?.data?.session_id,
              {
                prepareDataAndSendToAgent,
                baseUrl,
                isTabEnabled: utilsObject?.isTabEnabled,
                steps: utilsObject?.steps,
                currentTabValue: utilsObject?.currentTabValue,
                questions: utilsObject?.questions,
                questionsStepsMap: utilsObject?.questionsStepsMap,
                stepFormDataMap: utilsObject?.stepFormDataMap,
              },
              null,
              { thinkingResponse: thinkingInfo }
            );
          }
        } else {
          setCurrentSessionId(response?.data?.data?.session_id);

          // Handle single item array or other cases
          if (customParseResponse) {
            let parsedResponseArray = await Promise.all(
              response?.data?.data?.data?.map(async (item, index) => {
                let disableTimeAndName = index === 0 ? false : true;
                return customParseResponse(
                  item,
                  item.type,
                  payload.agent_id,
                  currentModeValue,
                  disableTimeAndName,
                  response?.data?.data?.session_id,
                  customChatConfig
                );
              })
            );
            parsedResponse = parsedResponseArray;
          } else {
            let parsedResponseArray = response?.data?.data?.data?.map(
              (item, index) => {
                let disableTimeAndName = index === 0 ? false : true;
                return parseResponse(
                  item,
                  item.type,
                  payload.agent_id,
                  currentModeValue,
                  disableTimeAndName,
                  response?.data?.data?.session_id,
                  { prepareDataAndSendToAgent, baseUrl }
                );
              }
            );
            parsedResponse = parsedResponseArray;
          }
        }
 
        if (currentModeValue === "agent") {
          chatDataRef.current[currentModeValue] = [
            ...chatDataRef.current[currentModeValue]?.filter(
              (data) => data?.userType != "loader"
            ),
            parsedResponse,
          ];
          chatDataRef.current[currentModeValue] = chatDataRef.current[
            currentModeValue
          ].flat();
        }
        if (utilsObject?.newChatData) {
          chatDataInfoRef.current = utilsObject?.newChatData.current;
        }
        let chatDataMessages =
          chatDataInfoRef.current[currentModeValue].conversations[conversationId].messages;
        let finalParsedResponse = isArray(parsedResponse)
          ? parsedResponse
          : [parsedResponse];
        chatDataMessages = [...chatDataMessages, ...(Array.isArray(finalParsedResponse) ? finalParsedResponse : [])];
        chatDataInfoRef.current[
          currentModeValue
        ].conversations[conversationId].messages = chatDataMessages;

        // Trigger re-render by updating chatDataState
        if (utilityObjectData?.setChatDataState) {
          utilityObjectData.setChatDataState({ ...chatDataRef.current });
        }

        setLoader(false);
        return;
      } catch (error) {
        console.error("Error in processResponse: ", error);
        return;
      }
    },
    []
  );

  return {
    setAgentFlow,
    prepareDataAndSendToAgent,
    processResponse
  };
};
