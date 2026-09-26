import { httpClient } from './httpClient';
import { MCP_ENDPOINTS } from './endpoints';

export interface McpTestConnectionResult {
  ok: boolean;
  /** Error text when the connection fails. */
  message?: string;
  /** Number of MCP tools discovered when the connection succeeds. */
  toolCount?: number;
}

interface McpTestConnectionResponse {
  success?: boolean;
  error?: string;
  tools?: unknown[];
  server_info?: unknown;
}

/**
 * MCP Service
 * Handles MCP-server related API calls (e.g. connection testing).
 */
export class McpService {
  /**
   * POST /api/mcp/test-connection - Tests reachability of an MCP server.
   * The backend proxies the request (avoids browser CORS).
   */
  static async testConnection(
    url: string,
    headers?: Record<string, string>,
  ): Promise<McpTestConnectionResult> {
    try {
      const response = await httpClient.post<McpTestConnectionResponse>(
        MCP_ENDPOINTS.TEST_CONNECTION,
        { url, headers: headers ?? {} },
      );

      // Backend always returns HTTP 200 with { success, tools, error }.
      const data = response.data ?? {};
      const ok = Boolean(data.success);

      return {
        ok,
        message: typeof data.error === 'string' ? data.error : undefined,
        toolCount:
          ok && Array.isArray(data.tools) ? data.tools.length : undefined,
      };
    } catch (error) {
      // Network / transport failure (the endpoint itself was unreachable).
      let message: string | undefined;
      if (error && typeof error === 'object' && 'response' in error) {
        const resp = (error as { response?: { data?: McpTestConnectionResponse } })
          .response;
        if (resp?.data && typeof resp.data.error === 'string') {
          message = resp.data.error;
        }
      }
      return { ok: false, message };
    }
  }
}

export default McpService;
