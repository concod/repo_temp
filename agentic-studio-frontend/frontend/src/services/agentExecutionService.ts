import { httpClient } from './httpClient';
import { AGENT_EXECUTION_ENDPOINTS } from './endpoints';
import type { 
  InferenceRequest, 
  MessageResponse,
  StreamingResponse,
  StreamingStatusUpdate,
  StreamingResult,
  StreamingStep
} from '../types/api';

/**
 * Agent Execution Service
 * Handles agent inference, execution, and chatbot interactions
 * 
 * Endpoints:
 * - POST /api/agent/infer - Execute agent with optional file upload
 * - POST /api/agent/infer/stream - Execute agent with streaming response
 * - POST /api/ia_chatbot - Execute IA chatbot
 */
export class AgentExecutionService {

  /**
   * Execute agent inference
   * POST /api/agent/infer
   * 
   * @param request - Inference request with agentId and userInput
   * @param file - Optional file to upload (max 10MB)
   * @returns Promise<MessageResponse> - Agent response
   * @throws Error if execution fails or times out
   */
  static async infer(request: InferenceRequest, file?: File): Promise<MessageResponse> {
    try {
      this.validateInferenceRequest(request);

      let response;

      if (file) {
        // Use multipart/form-data for file upload
        response = await this.inferWithFile(request, file);
      } else {
        // Use JSON for text-only requests
        response = await httpClient.post<MessageResponse>(AGENT_EXECUTION_ENDPOINTS.INFER, request);
      }

      return response.data;
    } catch (error) {
      console.error('[AgentExecutionService] Inference failed:', error);
      throw error;
    }
  }

  /**
   * Execute agent inference with file upload
   * @private
   */
  private static async inferWithFile(request: InferenceRequest, file: File) {
    // Validate file size (10MB limit as per API spec)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxFileSize) {
      throw new Error('File size cannot exceed 10MB');
    }

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('agentId', request.agentId);
    formData.append('userInput', request.userInput);
    formData.append('file', file);

    return await httpClient.post<MessageResponse>(
      AGENT_EXECUTION_ENDPOINTS.INFER,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // Extended timeout for file processing
      }
    );
  }

  /**
   * Execute agent inference with streaming response
   * POST /api/agent/infer/stream
   * 
   * @param request - Inference request
   * @param file - Optional file upload
   * @param onData - Callback function to handle streaming data
   * @param onComplete - Callback function when streaming completes
   * @param onError - Callback function for errors
   * @returns Promise<void>
   */
  static async inferStream(
    request: InferenceRequest,
    file?: File,
    onData?: (chunk: StreamingResponse) => void,
    onComplete?: (finalResult: MessageResponse) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      this.validateInferenceRequest(request);

      // Create FormData for streaming request
      const formData = new FormData();
      formData.append('agentId', request.agentId);
      formData.append('userInput', request.userInput);
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('File size cannot exceed 10MB');
        }
        formData.append('file', file);
      }

      const axiosInstance = httpClient.getAxiosInstance();
      
      const response = await axiosInstance.post(
        AGENT_EXECUTION_ENDPOINTS.INFER_STREAM,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          responseType: 'stream',
          timeout: 120000, // Extended timeout for streaming
        }
      );

      // Handle streaming response
      this.handleStreamingResponse(response.data, onData, onComplete, onError);
      
    } catch (error) {
      console.error('[AgentExecutionService] Streaming inference failed:', error);
      if (onError) {
        onError(error as Error);
      } else {
        throw error;
      }
    }
  }

  /**
   * Execute IA Chatbot
   * POST /api/ia_chatbot
   * 
   * @param userInput - User message for the chatbot
   * @param sessionId - Optional session ID for conversation continuity
   * @returns Promise<MessageResponse> - Chatbot response
   * @throws Error if execution fails
   */
  static async chatbot(userInput: string, sessionId?: string): Promise<MessageResponse> {
    try {
      if (!userInput?.trim()) {
        throw new Error('User input is required for chatbot');
      }

      const requestData = {
        userInput: userInput.trim(),
        ...(sessionId && { session_id: sessionId }),
      };

      const response = await httpClient.post<MessageResponse>(
        AGENT_EXECUTION_ENDPOINTS.IA_CHATBOT,
        requestData
      );

      return response.data;
    } catch (error) {
      console.error('[AgentExecutionService] Chatbot execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute agent inference with enhanced streaming response using fetch API
   * POST /api/agent/infer/stream
   * 
   * This method uses native fetch API for better streaming support and matches
   * the exact implementation from main_7.js
   * 
   * @param request - Inference request with agentId and userInput
   * @param file - Optional file to upload (max 10MB)
   * @param onStatusUpdate - Callback for streaming status updates
   * @param onStepUpdate - Callback for execution step updates
   * @param onComplete - Callback when streaming completes with final result
   * @param onError - Callback for errors
   * @param signal - AbortSignal for cancellation support
   * @returns Promise<void>
   */
  static async inferStreamEnhanced(
    request: InferenceRequest,
    file?: File,
    guardrailsReq?: boolean,
    onStatusUpdate?: (update: StreamingStatusUpdate) => void,
    onStepUpdate?: (step: StreamingStep) => void,
    onComplete?: (result: StreamingResult) => void,
    onError?: (error: Error) => void,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      this.validateInferenceRequest(request);

      // Create FormData matching the exact format from curl example
      const formData = new FormData();
      formData.append('agentId', request.agentId);
      formData.append('userInput', request.userInput);
      
      if (guardrailsReq !== undefined) {
        formData.append('guardrails_req', String(guardrailsReq));
      }
      
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('File size cannot exceed 10MB');
        }
        formData.append('file', file);
      }

      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type for FormData - let browser set it with boundary
        },
        signal,
      };

      // Use HttpClient for consistent base URL and auth handling
      const response = await httpClient.fetchStream(AGENT_EXECUTION_ENDPOINTS.INFER_STREAM, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Process streaming response
      await this.processStreamingResponse(
        response.body,
        onStatusUpdate,
        onStepUpdate,
        onComplete,
        onError
      );

    } catch (error) {
      // Don't log or propagate AbortError - it's expected when user navigates away
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[AgentExecutionService] Stream request aborted gracefully (user navigation)');
        return; // Silently handle abort
      }
      
      // Only log actual errors, not expected aborts
      console.error('[AgentExecutionService] Enhanced streaming inference failed:', error);
      
      if (onError) {
        onError(error as Error);
      } else {
        throw error;
      }
    }
  }

  /**
   * Cancel ongoing inference (if supported by browser)
   * 
   * Note: Request cancellation not yet implemented
   */
  static cancelInference(): void {
    // Implementation depends on how you want to track ongoing requests
    // You could maintain a map of AbortControllers for each request
    console.warn('[AgentExecutionService] Request cancellation not yet implemented');
  }

  // ==================== Private Helper Methods ====================

  /**
   * Validate inference request data
   * @private
   */
  private static validateInferenceRequest(request: InferenceRequest): void {
    if (!request) {
      throw new Error('Inference request is required');
    }

    if (!request.agentId?.trim()) {
      throw new Error('Agent ID is required');
    }

    if (!request.userInput?.trim()) {
      throw new Error('User input is required');
    }

    // Validate user input length (reasonable limits)
    if (request.userInput.length > 10000) {
      throw new Error('User input is too long (max 10,000 characters)');
    }
  }

  /**
   * Process streaming response using ReadableStream (fetch API)
   * Handles line-delimited JSON parsing matching main_7.js implementation
   * @private
   */
  private static async processStreamingResponse(
    stream: ReadableStream<Uint8Array>,
    onStatusUpdate?: (update: StreamingStatusUpdate) => void,
    onStepUpdate?: (step: StreamingStep) => void,
    onComplete?: (result: StreamingResult) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let stepCounter = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete JSON lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const jsonData = JSON.parse(line) as StreamingStatusUpdate;
              console.log('Streaming message received:', jsonData);
              
              // Call status update callback
              if (onStatusUpdate) {
                onStatusUpdate(jsonData);
              }
              
              if (jsonData.status === 'starting' || jsonData.status === 'processing') {
                // Collect status steps with enhanced details
                if (jsonData.message && jsonData.message !== 'Processing your request..') {
                  stepCounter++;
                  const step: StreamingStep = {
                    id: `step-${stepCounter}`,
                    message: jsonData.message,
                    status: jsonData.status,
                    timestamp: new Date().toLocaleTimeString(),
                    order: stepCounter
                  };
                  
                  if (onStepUpdate) {
                    onStepUpdate(step);
                  }
                }
              } else if (jsonData.status === 'complete') {
                // Extract final result and check for errors
                if (jsonData.result) {
                  if (jsonData.result.type === 'error') {
                    // Handle error result
                    const errorMessage = jsonData.result.content?.message || 'Unknown error';
                    const errorDetails = jsonData.result.content?.details;
                    const fullError = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
                    
                    console.error('[AgentExecutionService] Task execution error:', fullError);
                    
                    if (onError) {
                      onError(new Error(fullError));
                    }
                  } else if (onComplete) {
                    // Handle successful result
                    onComplete(jsonData.result);
                  }
                }
                return;
              } else if (jsonData.status === 'error') {
                // Direct error status (fallback)
                if (onError) {
                  onError(new Error(jsonData.message || 'Streaming error occurred'));
                }
                return;
              }
            } catch {
              console.warn('[AgentExecutionService] Failed to parse streaming JSON line:', line);
            }
          }
        }
      }
    } catch (error) {
      // Don't log or propagate AbortError - it's expected when user navigates away
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[AgentExecutionService] Stream aborted gracefully (user navigation)');
        return; // Silently handle abort
      }
      
      // Only log actual errors, not expected aborts
      console.error('[AgentExecutionService] Streaming processing error:', error);
      
      if (onError) {
        onError(error as Error);
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Handle streaming response data (legacy axios-based method)
   * @private
   */
  private static handleStreamingResponse(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stream: any,
    onData?: (chunk: StreamingResponse) => void,
    onComplete?: (result: MessageResponse) => void,
    onError?: (error: Error) => void
  ): void {
    let buffer = '';

    stream.on('data', (chunk: Uint8Array | string) => {
      try {
        buffer += typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);
        
        // Process complete JSON objects (NDJSON format)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data: StreamingResponse = JSON.parse(line);
              
              if (onData) {
                onData(data);
              }

              // Check if streaming is complete
              if (data.status === 'complete' && data.result && onComplete) {
                onComplete(data.result);
              }

              // Check for errors
              if (data.status === 'error' && onError) {
                onError(new Error(data.message || 'Streaming error occurred'));
              }
            } catch {
              console.warn('[AgentExecutionService] Failed to parse streaming data:', line);
            }
          }
        }
      } catch (error) {
        console.error('[AgentExecutionService] Streaming data processing error:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    });

    stream.on('end', () => {
      console.log('[AgentExecutionService] Streaming completed');
    });

    stream.on('error', (error: Error) => {
      console.error('[AgentExecutionService] Stream error:', error);
      if (onError) {
        onError(error);
      }
    });
  }

  /**
   * Format execution time for display
   * Helper method to format execution time in a human-readable format
   * 
   * @param seconds - Execution time in seconds
   * @returns Formatted time string
   */
  static formatExecutionTime(seconds?: number): string {
    if (!seconds || seconds < 0) return 'N/A';
    
    if (seconds < 1) {
      return `${Math.round(seconds * 1000)}ms`;
    } else if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    }
  }

  /**
   * Get response type icon/indicator
   * Helper method to get appropriate icon or indicator for response types
   * 
   * @param responseType - Type of the response
   * @returns Icon or indicator string
   */
  static getResponseTypeIndicator(responseType: string): string {
    const indicators: Record<string, string> = {
      text: '📝',
      error: '❌',
      table: '📊',
      chart: '📈',
      code: '💻',
      list: '📋',
    };

    return indicators[responseType] || '📄';
  }
}

export default AgentExecutionService;
