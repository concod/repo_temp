import { useState } from 'react';
import iIcon from '../../assets/images/i-icon.svg';
import { SecondarySmallIconButton, TertiarySmallIconButton } from '../Button';
import {
  MCP_SERVERS_PLACEHOLDER,
  getMcpServersCount,
  validateMcpServersJson,
} from '../../utils/mcpServersJson';
import type { McpServerPayload } from '../../types/api';
import { McpService } from '../../services/mcpService';
import './McpServersField.scss';

interface McpServersFieldProps {
  value: string;
  onChange: (value: string) => void;
  parsedServers: McpServerPayload[];
  onParsedServersChange: (servers: McpServerPayload[]) => void;
  error: string | null;
  onErrorChange: (error: string | null) => void;
  onApplySuccess?: () => void;
  onApplyReset?: () => void;
}

const ParseIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M20.49 6.01V11.01H15.49"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3.51 17.99V12.99H8.51"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.6 9.5C6.44 7.12 8.7 5.42 11.36 5.42C14.05 5.42 16.38 7.17 17.2 9.62"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M18.4 14.5C17.56 16.88 15.3 18.58 12.64 18.58C9.95 18.58 7.62 16.83 6.8 14.38"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const ClearIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2.66675 4.00033H13.3334M6.66675 7.33366V11.3337M9.33341 7.33366V11.3337M3.33341 4.00033L4.00008 12.667C4.00008 13.0352 4.14651 13.3885 4.4046 13.6466C4.66269 13.9047 5.01601 14.0512 5.38416 14.0512H10.6161C10.9842 14.0512 11.3375 13.9047 11.5956 13.6466C11.8537 13.3885 12.0001 13.0352 12.0001 12.667L12.6667 4.00033M6.00008 4.00033V2.66699C6.00008 2.48918 6.07072 2.31861 6.19574 2.19359C6.32077 2.06856 6.49134 1.99792 6.66916 1.99792H9.33582C9.51363 1.99792 9.6842 2.06856 9.80923 2.19359C9.93425 2.31861 10.0049 2.48918 10.0049 2.66699V4.00033" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TestIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M8.667 1.333 2.667 9.333h3.333l-.667 5.334 6-8H8z"
      fill="currentColor"
    />
  </svg>
);

type McpTestState = 'idle' | 'testing' | 'success' | 'failed';

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    className={`mcp-servers-field__chevron ${expanded ? 'mcp-servers-field__chevron--expanded' : 'mcp-servers-field__chevron--collapsed'}`}
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const McpServersField = ({
  value,
  onChange,
  parsedServers,
  onParsedServersChange,
  error,
  onErrorChange,
  onApplySuccess,
  onApplyReset,
}: McpServersFieldProps) => {
  const [expanded, setExpanded] = useState(true);
  const [testStatus, setTestStatus] = useState<
    Record<string, { state: McpTestState; message?: string; toolCount?: number }>
  >({});
  const configuredCount = getMcpServersCount(parsedServers);

  // Tests an MCP server via the backend proxy (POST /api/mcp/test-connection),
  // which avoids browser CORS restrictions against external MCP servers.
  const testServer = async (server: McpServerPayload) => {
    setTestStatus((prev) => ({
      ...prev,
      [server.name]: { state: 'testing' },
    }));

    const result = await McpService.testConnection(server.url, server.headers);

    setTestStatus((prev) => ({
      ...prev,
      [server.name]: {
        state: result.ok ? 'success' : 'failed',
        message: result.message,
        toolCount: result.toolCount,
      },
    }));
  };

  const testAllServers = () => {
    parsedServers.forEach((server) => {
      void testServer(server);
    });
  };

  const handleInputChange = (nextValue: string) => {
    onChange(nextValue);
    onApplyReset?.();
    if (error) {
      onErrorChange(null);
    }
  };

  const handleParse = () => {
    const result = validateMcpServersJson(value);

    if (!result.valid) {
      onErrorChange(result.error);
      onParsedServersChange([]);
      onApplyReset?.();
      return;
    }

    onErrorChange(null);
    onChange(result.formatted);
    onParsedServersChange(result.servers);
    setTestStatus({});

    if (value.trim()) {
      onApplySuccess?.();
    } else {
      onApplyReset?.();
    }
  };

  const handleClear = () => {
    onChange('');
    onParsedServersChange([]);
    onErrorChange(null);
    setTestStatus({});
    onApplyReset?.();
  };

  return (
    <div className="mcp-servers-field">
      <div className="mcp-servers-field__header-row">
        <button
          type="button"
          className="mcp-servers-field__header body-medium--medium"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          <ChevronIcon expanded={expanded} />
          <span>MCP Servers (optional)</span>
        </button>
        <span className="mcp-servers-field__info-tooltip">
          <button
            type="button"
            className="mcp-servers-field__info-btn"
            aria-label="MCP servers configuration help"
          >
            <img src={iIcon} alt="" />
          </button>
          <span className="mcp-servers-field__tooltip body-small" role="tooltip">
            Paste a JSON config in the standard <code>mcpServers</code> shape, then click{' '}
            <strong>Parse &amp; Apply</strong>.
          </span>
        </span>
      </div>

      {expanded && (
        <>
          <textarea
            className={`mcp-servers-field__textarea ${error ? 'mcp-servers-field__textarea--error' : ''}`}
            value={value}
            onChange={(event) => handleInputChange(event.target.value)}
            placeholder={MCP_SERVERS_PLACEHOLDER}
            spellCheck={false}
            aria-label="MCP servers JSON configuration"
          />

          {error && <p className="mcp-servers-field__error">{error}</p>}

          <div className="mcp-servers-field__actions">
            <SecondarySmallIconButton icon={<ParseIcon />} onClick={handleParse}>
              Parse &amp; Apply
            </SecondarySmallIconButton>
            <SecondarySmallIconButton
              icon={<TestIcon />}
              onClick={testAllServers}
              disabled={configuredCount === 0}
            >
              Test All
            </SecondarySmallIconButton>
            <TertiarySmallIconButton
              className="mcp-servers-field__clear-btn"
              icon={<ClearIcon />}
              onClick={handleClear}
            >
              Clear
            </TertiarySmallIconButton>
          </div>

          {configuredCount > 0 ? (
            <ul className="mcp-servers-field__list">
              {parsedServers.map((server) => {
                const entry = testStatus[server.name];
                const status = entry?.state ?? 'idle';
                const headerCount = server.headers
                  ? Object.keys(server.headers).length
                  : 0;
                return (
                  <li key={server.name} className="mcp-servers-field__server">
                    <div className="mcp-servers-field__server-info">
                      <span className="mcp-servers-field__server-name">
                        {server.name}
                      </span>
                      <span className="mcp-servers-field__server-url">
                        {server.url}
                      </span>
                      <span className="mcp-servers-field__server-meta body-small">
                        {headerCount} header{headerCount === 1 ? '' : 's'} ·{' '}
                        {server.enabled ? 'enabled' : 'disabled'}
                      </span>
                    </div>
                    <div className="mcp-servers-field__server-actions">
                      {status !== 'idle' && (
                        <span
                          className={`mcp-servers-field__server-status mcp-servers-field__server-status--${status}`}
                          title={entry?.message}
                        >
                          {status === 'testing'
                            ? 'Testing…'
                            : status === 'success'
                              ? entry?.toolCount != null
                                ? `Connected · ${entry.toolCount} tool${entry.toolCount === 1 ? '' : 's'}`
                                : 'Connected'
                              : 'Failed'}
                        </span>
                      )}
                      <SecondarySmallIconButton
                        icon={<TestIcon />}
                        onClick={() => testServer(server)}
                        disabled={status === 'testing'}
                      >
                        Test
                      </SecondarySmallIconButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mcp-servers-field__status body-small">
              No MCP servers configured.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default McpServersField;
