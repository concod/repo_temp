import { PrimaryLargeButton } from "../../components/Button";
import { AgentCard } from "../../components/Card";
import { AgentTag, getAllAgentTags } from "../../components/Tags";
import { useNavigate } from "react-router-dom";
import { useAgents } from "../../hooks/useAgents";
import type { AgentResponse } from "../../types/api";
import { PageHeader } from "../../components/Header";
import type { HeaderButton } from "../../components/Header";
import Spinner from "../../components/Spinner/Spinner";

// Category mapping based on agent names
const getAgentCategory = (agentName: string): string => {
  const categoryMapping: Record<string, string> = {
    "KVC-KVI Recommendation": "analytics-ml",
    "Basic RAG Agent": "conversational-interactive",
    "MondaySmart-Intake-Agent": "strategic-decisioning",
    "Trend Based Banner Generator": "generative-creative",
    "Data Profiler": "analytics-ml",
    "IA-Website-Chatbot": "conversational-interactive",
    "Store Ops SOP - RAG": "conversational-interactive",
    "Text2SQL Assortment Agent": "analytics-ml",
    "Banner & Video Generator": "generative-creative",
    "Anomaly Detector - Executive Report Agent": "analytics-ml",
    "Label & Compliance Checker": "proactive-monitoring",
    "Knowledge Base RAG Template": "conversational-interactive",
    "File-Analyser": "proactive-monitoring",
    "Smart-Agent Studio Support Specialist": "conversational-interactive",
    "Store Clustering Agent": "analytics-ml",
    "LLM as judge Agent for RAG": "proactive-monitoring",
    "Banner Generator Editor - Agent": "generative-creative",
    "Testing (Ajun's Banner & Video Generator)": "generative-creative",
    "LC (Debug)": "proactive-monitoring",
    "Test Agent (Remove Later)": "generative-creative"
  };

  return categoryMapping[agentName] || "generative-creative";
};

const AgentsPage = () => {
  const navigate = useNavigate();
  const agentTags = getAllAgentTags();
  
  // Use the custom agents hook
  const {
    agents,
    filteredAgents,
    isLoading,
    error,
    refetch,
    searchAgents,
    filterByCategory: _filterByCategory, // TODO: Will be used when category filtering is implemented
    searchQuery,
    clearError
  } = useAgents();

  const handleCreateNewAgent = () => {
    navigate('/agents/create');
  };

  const handleSearch = (searchValue: string) => {
    searchAgents(searchValue);
  };

  const handleLaunchAgent = (agent: AgentResponse) => {
    console.log('Launching agent:', agent.name);
    // Navigate directly to manage agent page
    navigate(`/agents/manage/${agent.id}`);
  };

  const handleResetSearch = () => {
    searchAgents('');
  };

  const handleRetry = () => {
    clearError();
    refetch();
  };

  const buttons: HeaderButton[] = [
    {
      id: 'create-agent',
      label: 'Create new agent',
      type: 'primary',
      size: 'large',
      onClick: handleCreateNewAgent
    }
  ];

  const bottomSectionContent = (
    <div className="agents-header__bottom-text body-medium--medium">
      <span className="body-medium--medium agents-header__bottom-text-category">Category:</span>
      <span className="body-medium--medium agents-header__bottom-text-text">{agentTags.length - 1} results</span>
      <span className="agents-header__bottom-text-seperator"></span>
      <div className="agents-header__bottom-text-tags">
        {agentTags.map((tagConfig) => (
          <AgentTag 
            key={tagConfig.id}
            config={tagConfig}
          />
        ))}
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        title="My Agents"
        description="Create and manage your agents"
        searchPlaceholder="Search agents..."
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onResetSearch={handleResetSearch}
        buttons={buttons}
        showBottomSection={true}
        bottomSection={bottomSectionContent}
        className="agents-page-header"
      />
      <div className="agents-cards">
        {/* Loading State */}
        {isLoading && (
          <div className="loading-overlay">
            <Spinner size={80} />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="agents-error">
            <div className="error-message">
              <p>Failed to load agents: {error}</p>
              <button onClick={handleRetry} className="retry-button">
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredAgents.length === 0 && agents.length === 0 && (
          <div className="agents-empty">
            <p>No agents found. Create your first agent to get started!</p>
            <PrimaryLargeButton onClick={handleCreateNewAgent}>
              Create your first agent
            </PrimaryLargeButton>
          </div>
        )}

        {/* No Search Results */}
        {!isLoading && !error && filteredAgents.length === 0 && agents.length > 0 && searchQuery && (
          <div className="agents-no-results">
            <p>No agents found matching "{searchQuery}"</p>
            <button onClick={handleResetSearch} className="clear-search-button">
              Clear search
            </button>
          </div>
        )}

        {/* Agent Cards */}
        {!isLoading && !error && filteredAgents.map((agent) => (
          <AgentCard 
            key={agent.id}
            id={agent.id}
            title={agent.name}
            description={agent.role}
            categoryId={getAgentCategory(agent.name)}
            onLaunch={() => handleLaunchAgent(agent)}
            onRefreshAgents={refetch}
            model={agent?.llmModel}
            tools={agent.tools?.length || 0}
          />
        ))}
      </div>
      
    </>
  );
};

export default AgentsPage;