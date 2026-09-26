import React, { useEffect } from "react";

const AgentWorkflowsPage: React.FC = () => {
  useEffect(() => {
    // Handle iframe loading
    const iframe = document.getElementById('workflowEditorFrame') as HTMLIFrameElement;
    if (iframe) {
      const handleLoad = () => {
        // Remove loading animation when iframe loads
        const container = iframe.parentElement;
        if (container) {
          container.classList.add('loaded');
        }
      };

      iframe.addEventListener('load', handleLoad);

      // Cleanup
      return () => {
        iframe.removeEventListener('load', handleLoad);
      };
    }
  }, []);


  return (
    <div className="workflow-editor">
      <div className={`page-header`} style={{marginBottom: '24px'}}>
      <div className={`page-header__top`}>
        <div className={`page-header__top-content`}>
          <span className="headline-4 page-header__top-content-title">Agent Workflow</span>
          <span className="body-medium--medium page-header__top-content-description">
            Design and manage your AI workflow
          </span>
        </div>
      </div>
      </div>
      
      <div className="workflow-editor-content">
        <div className="iframe-container">
          <iframe 
            id="workflowEditorFrame"
            src="https://workflow.impact-agents.ai"
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen
            title="Agent Workflows"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      </div>
    </div>
  );
};

export default AgentWorkflowsPage;
