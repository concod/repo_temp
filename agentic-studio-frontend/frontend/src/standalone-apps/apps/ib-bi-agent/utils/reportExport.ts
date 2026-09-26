import type { ChatSession, Message } from "../types/chat.types";

type BuildReportParams = {
  session: ChatSession | null;
  messages: Message[];
  appName?: string;
};

type ExportReportParams = BuildReportParams & {
  filePrefix?: string;
};

const formatDateTime = (value?: Date | string) => {
  const dateValue = value instanceof Date ? value : value ? new Date(value) : new Date();
  return dateValue.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getMessageBodyText = (message: Message): string => {
  if (message.text) return message.text;
  const s = message.structuredData?.summary;
  if (s) return `${s.title}\n\n${s.answer}`;
  return "";
};

export const buildReportHtml = ({
  session,
  messages,
  appName = "Interstate Batteries AI Assistant",
}: BuildReportParams): string => {
  const sessionTitle = session?.title || "Interstate Batteries Chat";
  const exportedAt = formatDateTime(new Date());

  const conversation = messages
    .map((message) => {
      const role = message.isUser ? "User" : "Agent";
      const timestamp = formatDateTime(message.clientTimestamp);
      const body = escapeHtml(getMessageBodyText(message)).replace(/\n/g, "<br />");
      const sources =
        message.sources && message.sources.length > 0
          ? `<div class="report__meta-label">Sources</div>
              <ul class="report__list">
                ${message.sources.map((source) => `<li>${escapeHtml(source)}</li>`).join("")}
              </ul>`
          : "";
      const suggestions =
        message.suggestions && message.suggestions.length > 0
          ? `<div class="report__meta-label">Suggested follow-ups</div>
              <ul class="report__list muted">
                ${message.suggestions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
              </ul>`
          : "";
      const meta: string[] = [];
      if (message.timing) meta.push(`Response time: ${escapeHtml(message.timing)}`);
      if (message.executionId) meta.push(`Execution ID: ${escapeHtml(message.executionId)}`);
      if (message.sessionId) meta.push(`Session ID: ${escapeHtml(message.sessionId)}`);

      const metaBlock =
        meta.length > 0
          ? `<div class="report__meta-line">${meta.join(" • ")}</div>`
          : "";

      return `
        <div class="report__message ${message.isUser ? "user" : "agent"}">
          <div class="report__message-header">
            <span class="report__pill ${message.isUser ? "pill-user" : "pill-agent"}">${role}</span>
            <span class="report__timestamp">${timestamp}</span>
          </div>
          <div class="report__message-body">${body}</div>
          ${metaBlock}
          ${sources}
          ${suggestions}
        </div>
      `;
    })
    .join("");

  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(sessionTitle)} - Chat Report</title>
        <style>
          body {
            font-family: "Inter", "Open Sans", system-ui, -apple-system, sans-serif;
            color: #0d152c;
            background: #f8fafc;
            margin: 0;
            padding: 24px;
          }
          .report {
            max-width: 960px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            box-shadow: 0 12px 30px rgba(0,0,0,0.06);
            padding: 24px;
          }
          .report__header {
            display: flex;
            flex-direction: column;
            gap: 6px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .report__title {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
          }
          .report__subtitle {
            font-size: 14px;
            color: #475467;
            margin: 0;
          }
          .report__meta {
            font-size: 13px;
            color: #667085;
          }
          .report__message {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px 14px;
            margin-bottom: 12px;
            background: #fbfcfd;
          }
          .report__message.agent {
            background: #f4f7fb;
            border-color: #d7e2f3;
          }
          .report__message.user {
            background: #fdf7ec;
            border-color: #f2e3c4;
          }
          .report__message-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 8px;
          }
          .report__pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.01em;
          }
          .pill-user {
            background: #fef3c7;
            color: #92400e;
          }
          .pill-agent {
            background: #dcfce7;
            color: #166534;
          }
          .report__timestamp {
            font-size: 12px;
            color: #667085;
          }
          .report__message-body {
            font-size: 14px;
            line-height: 1.6;
            color: #111827;
            margin-bottom: 8px;
          }
          .report__meta-line {
            font-size: 12px;
            color: #475467;
            margin-bottom: 8px;
          }
          .report__meta-label {
            font-size: 12px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 6px;
          }
          .report__list {
            margin: 0 0 12px 16px;
            padding: 0;
            color: #0f172a;
            font-size: 13px;
            line-height: 1.5;
          }
          .report__list.muted {
            color: #475467;
          }
          .report__list li {
            margin-bottom: 4px;
          }
        </style>
      </head>
      <body>
        <main class="report">
          <header class="report__header">
            <h1 class="report__title">${escapeHtml(sessionTitle)}</h1>
            <p class="report__subtitle">${escapeHtml(appName)}</p>
            <div class="report__meta">Exported at ${exportedAt}</div>
          </header>
          ${conversation || "<p class='report__subtitle'>No messages to export.</p>"}
        </main>
      </body>
    </html>`;
};

export const exportChatReport = ({
  session,
  messages,
  appName,
  filePrefix = "ib-chat-report",
}: ExportReportParams) => {
  const reportHtml = buildReportHtml({ session, messages, appName });
  const blob = new Blob([reportHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  anchor.href = url;
  anchor.download = `${filePrefix}-${timestamp}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

