import axiosInstance from "core/Utils/axios";
import axios from "axios";
import { isEmpty, isArray } from "lodash";

// Utility: check whether a string is a likely complete JSON value
const isLikelyCompleteJson = (message) => {
  try {
    // Extract the data portion of the message
    let start = message.indexOf(": ", 0) + 2;
    let str = message.slice(start, message.length);
    if (!str) return false;
    const s = String(str).trim();
    // Must start/end with matching braces or brackets
    const startsOk = s.startsWith("{") || s.startsWith("[");
    const endsOk = s.endsWith("}") || s.endsWith("]");
    if (!startsOk || !endsOk) return false;
    // Balance braces/brackets while respecting string literals
    let inString = false;
    let escapeNext = false;
    const stack = [];
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (ch === "\\") {
        if (inString) escapeNext = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "{" || ch === "[") stack.push(ch);
      else if (ch === "}" || ch === "]") {
        const last = stack.pop();
        if ((ch === "}" && last !== "{") || (ch === "]" && last !== "["))
          return false;
      }
    }
    return !inString && stack.length === 0;
  } catch (error) {
    console.error(
      "Failed to check if message is a likely complete JSON:",
      error
    );
    return false;
  }
};

/**
 * Processes a Server-Sent Events (SSE) message and converts it to a MessageEvent
 * @param {string} message - The raw SSE message to process
 * @param {React.MutableRefObject} messageToStoreRef - Reference to store the processed message
 * @returns {MessageEvent} A new MessageEvent containing the processed data
 */
export const sseevent = (message, messageToStoreRef) => {
  try {
    // Initialize message type and starting position for parsing
    let type = "message",
      start = 0;

    // Check if the message contains an event type specification
    if (message.startsWith("event: ")) {
      start = message.indexOf("\n");
      type = message.slice(7, start);
    }

    // Extract the data portion of the message
    start = message.indexOf(": ", start) + 2;
    let data = message.slice(start, message.length);
    let parsedData;

    // Generic function to clean and parse JSON string
    const cleanAndParseJSON = (str) => {
      try {
        // Remove any prefix pattern that ends with ": "
        str = str.replace(/^[^:]+:\s*/, "");

        // Handle escaped characters
        str = str
          // Replace escaped newlines with actual newlines
          .replace(/\\n/g, "\n")
          // Replace escaped quotes with regular quotes
          .replace(/\\"/g, '"')
          // Replace escaped forward slashes
          .replace(/\\\//g, "/")
          // Handle any remaining escaped characters
          .replace(/\\([^"\/n])/g, "$1");

        return JSON.parse(str);
      } catch (error) {
        console.error("Failed to parse data:", error, str, data);
        return {
          message: str,
          status: "error",
          error: error.message,
        };
      }
    };

    try {
      // First attempt: direct JSON parse
      parsedData = JSON.parse(data);
    } catch (initialError) {
      try {
        // Second attempt: clean and parse
        parsedData = cleanAndParseJSON(data);
      } catch (finalError) {
        console.error("Failed to parse data:", finalError);
        // Return a basic structure to prevent further errors
        parsedData = {
          message: data,
          status: "error",
          error: finalError.message,
        };
      }
    }

    // Strip large debugging metadata that is never used for rendering.
    // The meta field contains text_chunks, supplemental_chunks, image_ids
    // arrays that accumulate in memory and contribute to OOM crashes.
    if (parsedData?.meta) {
      delete parsedData.meta;
    }

    if (
      messageToStoreRef.current.currentMode === "agent" &&
      (parsedData?.chat_id || parsedData?.session_id)
    ) {
      messageToStoreRef.current.uniqueChatId = parsedData?.chat_id
        ? parsedData.chat_id
        : "";
      messageToStoreRef.current.sessionId = parsedData?.session_id;
      // Sticky copy of the session id this message belongs to. sessionId gets
      // cleared on completed/follow-up so the next user message starts a fresh
      // session, but message level actions (like/dislike) still need to refer
      // to the session that actually produced this response.
      if (parsedData?.session_id) {
        messageToStoreRef.current.chatSessionId = parsedData.session_id;
      }
    }
    if (
      messageToStoreRef.current.currentMode === "navigation" &&
      parsedData?.session_id
    ) {
      messageToStoreRef.current.navSessionId = parsedData.session_id;
    }

    if (parsedData?.is_error) {
      // Only append the error message once, even if multiple is_error chunks arrive.
      // Append as a widget item to appendedData so it renders AFTER any existing
      // widgets (tables, graphs, text widgets) rather than at the top of the response.
      if (!messageToStoreRef.current.hasErrorMessage) {
        messageToStoreRef.current.hasErrorMessage = true;
        const errorMsg = parsedData?.message && parsedData.message !== "[DONE]"
          ? parsedData.message
          : "There is an error, please reach out to IA with this use case.";
        const errorWidget = { type: "text", response: errorMsg };
        const prevAppended = messageToStoreRef.current.appendedData;
        if (Array.isArray(prevAppended) && prevAppended.length > 0) {
          messageToStoreRef.current.appendedData = [...prevAppended, errorWidget];
        } else if (prevAppended && typeof prevAppended === "object" && Object.keys(prevAppended).length > 0) {
          messageToStoreRef.current.appendedData = [prevAppended, errorWidget];
        } else {
          // No existing widgets — put on chatData.response instead
          messageToStoreRef.current.chatData.response =
            messageToStoreRef.current.chatData.response + errorMsg;
        }
      }
      // Still process completed/follow-up status even on error chunks
      // so that initValue is set correctly and dummyButton is suppressed
      if (
        parsedData?.status === "completed" ||
        parsedData?.status === "follow-up"
      ) {
        messageToStoreRef.current.initValue = true;
        messageToStoreRef.current.sessionId = "";
        messageToStoreRef.current.uniqueChatId = parsedData?.chat_id
          ? parsedData.chat_id
          : "";
        messageToStoreRef.current.status = parsedData?.status;
      }
      return new MessageEvent(type, { data: data });
    }
    if (parsedData?.status === "notification") {
      messageToStoreRef.current.notificationData = {
        message: parsedData?.message || "",
        chat_id: parsedData?.chat_id || "",
        session_id: parsedData?.session_id || "",
      };
      // Do NOT append notification messages to chatData.response — return early
      return new MessageEvent(type, { data: data });
    }
    if (parsedData?.status === "thinking") {
      messageToStoreRef.current.chatData.thinkingResponse.thinkingStream =
        messageToStoreRef.current.chatData.thinkingResponse.thinkingStream +
        parsedData.message;
    }
    // Only process new messages that aren't completion markers
    else if (parsedData?.message !== "[DONE]") {
      // Append the new message to the existing response
      messageToStoreRef.current.chatData.response =
        messageToStoreRef.current.chatData.response + parsedData.message;
      messageToStoreRef.current.chatData.response_heading =
        parsedData?.response_heading || "";
    } else if (
      parsedData?.message === "[DONE]" &&
      !isEmpty(parsedData?.widget_data) &&
      parsedData?.status !== "step_form"
    ) {
        let finalWidgetData = isArray(parsedData.widget_data)
          ? parsedData.widget_data
          : [parsedData.widget_data];
        messageToStoreRef.current.appendedDataFromLastChunk = parsedData?.widget_data;
        let previousWidgetData = isArray(messageToStoreRef.current.appendedData)
          ? messageToStoreRef.current.appendedData
          : [messageToStoreRef.current.appendedData];
        messageToStoreRef.current.appendedData = [
          ...previousWidgetData,
          ...finalWidgetData,
        ];
        messageToStoreRef.current.sessionId = parsedData.session_id;
        messageToStoreRef.current.uniqueChatId = parsedData?.chat_id
          ? parsedData.chat_id
          : "";
        messageToStoreRef.current.additionalArgs = parsedData?.additional_args
        ? parsedData.additional_args
        : {};
      }
    if (
      parsedData?.status === "completed" ||
      parsedData?.status === "follow-up"
    ) {
      messageToStoreRef.current.initValue = true;
      messageToStoreRef.current.sessionId = "";
      messageToStoreRef.current.uniqueChatId = parsedData?.chat_id
        ? parsedData.chat_id
        : "";
      messageToStoreRef.current.status = parsedData?.status;
    }
    if (parsedData?.status === "step_form") {
      let formWidgetData = isArray(parsedData.widget_data)
        ? parsedData.widget_data
        : [parsedData.widget_data];
      if (!messageToStoreRef.current.stepFormData) {
        messageToStoreRef.current.stepFormData = {};
      }
      const currentIntent = parsedData.current_intent || formWidgetData?.[0]?.current_intent;
      if (currentIntent) {
        messageToStoreRef.current.stepFormData[currentIntent] = formWidgetData;
      }
      messageToStoreRef.current.additionalArgs = parsedData?.additional_args
        ? parsedData.additional_args
        : {};
    }
    if (parsedData?.status === "widget") {
      let finalWidgetData = isArray(parsedData.widget_data)
        ? parsedData.widget_data
        : [parsedData.widget_data];
      let previousWidgetData = isArray(messageToStoreRef.current.appendedData)
        ? messageToStoreRef.current.appendedData
        : [messageToStoreRef.current.appendedData];
      messageToStoreRef.current.appendedData = [
        ...previousWidgetData,
        ...finalWidgetData,
      ];
      messageToStoreRef.current.additionalArgs = parsedData?.additional_args
        ? parsedData.additional_args
        : {};
    }
    // Handle image chunks for navigation mode
    if (
      parsedData?.response_type === "image" &&
      messageToStoreRef.current.currentMode === "navigation"
    ) {
      let imageData = {
        type: "image",
        image: parsedData.image,
        response_heading: parsedData.response_heading,
      };
      let previousData = isArray(messageToStoreRef.current.appendedData)
        ? messageToStoreRef.current.appendedData
        : isEmpty(messageToStoreRef.current.appendedData)
          ? []
          : [messageToStoreRef.current.appendedData];
      messageToStoreRef.current.appendedData = [...previousData, imageData];
    }
    return new MessageEvent(type, { data: data });
  } catch (error) {
    console.error("Error in sseevent:", error);
    throw error;
  }
};

/**
 * Creates an EventTarget-based SSE client using Axios for streaming responses
 * This implementation provides a custom EventSource-like functionality using Axios
 *
 * @param {string} url - The endpoint URL to connect to
 * @param {Object} opts - Configuration options for the request
 * @param {React.MutableRefObject} messageToStoreRef - Reference to store streaming messages
 * @returns {EventTarget} An EventTarget instance with custom SSE handling
 */
export const AxiosSource = (url, opts, messageToStoreRef) => {
  try {
    // Create event target for handling SSE events
    const eventTarget = new EventTarget();
    // Create abort controller for cancelling the request if needed
    const controller = new AbortController();
    // Track the last processed position in the response
    let lastProcessedLength = 0;
    // Carry-over for partial SSE frames between progress events
    let carryOver = "";


    axiosInstance({
      method: opts.method || "GET",
      url: url,
      headers: opts.headers,
      data: opts.body,
      signal: controller.signal,
      responseType: "text",
      onDownloadProgress: (progressEvent) => {
        const response = progressEvent.currentTarget || progressEvent.target;

        // Emit 'open' event when the connection is first established
        if (!progressEvent.loaded) {
          eventTarget.dispatchEvent(
            new Event("open", {
              status: response.status,
              headers: response.getAllResponseHeaders(),
              url: response.responseURL,
            })
          );
        }

        // Process incoming data chunks
        const chunk = response.responseText;
        if (chunk && chunk.length > lastProcessedLength) {
          // Get only the new part of the chunk
          const newChunk = chunk.slice(lastProcessedLength);
          // Update the last processed position
          lastProcessedLength = chunk.length;

          // Split the new chunk into individual messages
          const combined = carryOver + newChunk;
          const messages = combined.split("\n\n");
          // Keep the last incomplete frame (if any) for the next progress tick
          carryOver = messages.pop() || "";
          messages.forEach((message) => {
            if (message.length && isLikelyCompleteJson(message)) {
              eventTarget.dispatchEvent(sseevent(message, messageToStoreRef));
            }
          });
        }
      },
    })
      .then(() => {
        // Emit close event when the request completes successfully
        eventTarget.dispatchEvent(new CloseEvent("close"));
      })
      .catch((error) => {
        let reason = "Network request failed";
        let statusCode = 0;

        console.error("[AxiosSource] Request failed:", error);

        // Determine specific error reasons
        if (axios.isCancel(error)) {
          reason = "Network request aborted";
        } else if (error.code === "ECONNABORTED") {
          reason = "Network request timed out";
        }

        // Capture HTTP status code from the error response (e.g. 503)
        if (error.response && error.response.status) {
          statusCode = error.response.status;
          reason = `HTTP ${statusCode}: ${reason}`;
        }

        // Emit error event with the specific reason and status code
        const errorEvent = new CloseEvent("error", { reason });
        errorEvent.statusCode = statusCode;
        eventTarget.dispatchEvent(errorEvent);
      });

    // Add method to manually close the connection
    eventTarget.close = () => {
      controller.abort();
    };

    return eventTarget;
  } catch (error) {
    console.error("Error in AxiosSource:", error);
    throw error;
  }
};
