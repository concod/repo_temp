import type { McpServerPayload } from '../types/api';

export const MCP_SERVERS_PLACEHOLDER = `{
  "mcpServers": {
    "impact-analytics": {
      "url": "https://mcp.impact-agents.ai/mcp",
      "headers": { "X-API-Key": "YOUR_CLIENT_API_KEY" }
    }
  }
}`;

export type McpServersValidationResult =
  | { valid: true; servers: McpServerPayload[]; formatted: string }
  | { valid: false; error: string };

function toMcpServerPayload(name: string, config: unknown): McpServerPayload | { error: string } {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { error: `Server "${name}" must be a JSON object with a url property.` };
  }

  const { url, headers, enabled } = config as {
    url?: unknown;
    headers?: unknown;
    enabled?: unknown;
  };

  if (typeof url !== 'string' || !url.trim()) {
    return { error: `Server "${name}" must include a non-empty url.` };
  }

  if (headers !== undefined && (typeof headers !== 'object' || headers === null || Array.isArray(headers))) {
    return { error: `Server "${name}" headers must be a JSON object.` };
  }

  if (enabled !== undefined && typeof enabled !== 'boolean') {
    return { error: `Server "${name}" enabled must be a boolean.` };
  }

  return {
    name,
    url: url.trim(),
    headers: headers as Record<string, string> | undefined,
    enabled: enabled ?? true,
  };
}

export function validateMcpServersJson(raw: string): McpServersValidationResult {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { valid: true, servers: [], formatted: '' };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { valid: false, error: 'Invalid JSON. Check syntax and try again.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, error: 'MCP config must be a JSON object with an mcpServers property.' };
  }

  const mcpServers = (parsed as { mcpServers?: unknown }).mcpServers;

  if (mcpServers === undefined) {
    return { valid: false, error: 'JSON must include an mcpServers object.' };
  }

  if (!mcpServers || typeof mcpServers !== 'object' || Array.isArray(mcpServers)) {
    return { valid: false, error: 'mcpServers must be a JSON object.' };
  }

  const servers: McpServerPayload[] = [];

  for (const [name, config] of Object.entries(mcpServers)) {
    const result = toMcpServerPayload(name, config);

    if ('error' in result) {
      return { valid: false, error: result.error };
    }

    servers.push(result);
  }

  const formatted = JSON.stringify({ mcpServers }, null, 2);

  return {
    valid: true,
    servers,
    formatted,
  };
}

export function getMcpServersCount(servers: McpServerPayload[] | null): number {
  return servers?.length ?? 0;
}

export function normalizeMcpServers(servers: McpServerPayload[] | undefined | null): McpServerPayload[] {
  return servers ?? [];
}

export function serializeMcpServersToJson(servers: McpServerPayload[] | undefined | null): string {
  const normalized = normalizeMcpServers(servers);

  if (normalized.length === 0) {
    return '';
  }

  const mcpServers = Object.fromEntries(
    normalized.map((server) => [
      server.name,
      {
        url: server.url,
        ...(server.headers ? { headers: server.headers } : {}),
        enabled: server.enabled,
      },
    ])
  );

  return JSON.stringify({ mcpServers }, null, 2);
}

export function areMcpServersEqual(
  left: McpServerPayload[] | undefined | null,
  right: McpServerPayload[] | undefined | null
): boolean {
  return JSON.stringify(normalizeMcpServers(left)) === JSON.stringify(normalizeMcpServers(right));
}
