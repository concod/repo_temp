import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/Header";
import type { HeaderButton } from "../../components/Header";
import { MultiAgentCard } from "../../components/Card";
import type { MultiAgentCardProps } from "../../components/Card";
import Spinner from "../../components/Spinner/Spinner";
import { DeleteModal } from "../../components/Modal";
import { useMultiAgents } from "../../hooks/useMultiAgents";
import { showSuccess, showError } from "../../utils/toast";
import { MultiAgentsService } from "../../services/multiAgentsService";
import { AgentService } from "../../services/agentService";

const MultiAgentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [fetchingAgents, setFetchingAgents] = useState<boolean>(false);
  
  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    multiAgentId: string | null;
    multiAgentName: string | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    multiAgentId: null,
    multiAgentName: null,
    isDeleting: false,
  });
  
  // Use the custom hook to fetch multi-agents data
  const { multiAgents, loading, error, refreshMultiAgents } = useMultiAgents();

  // Fetch all agents once and create a lookup map for names
  useEffect(() => {
    const fetchAgentNames = async () => {
      if (multiAgents.length === 0) return;

      setFetchingAgents(true);
      
      try {
        // Fetch all agents in a single API call instead of individual calls
        const allAgents = await AgentService.getAgents();
        
        // Create a lookup map for agent names
        const namesMap = allAgents.reduce((acc, agent) => {
          acc[agent.id] = agent.name;
          return acc;
        }, {} as Record<string, string>);
        
        setAgentNames(namesMap);
      } catch (error) {
        console.error('Failed to fetch agent names:', error);
        
        // Fallback: create placeholder names for agents we couldn't fetch
        const allAgentIds = [...new Set(multiAgents.flatMap(ma => ma.agent_ids))];
        const fallbackNamesMap = allAgentIds.reduce((acc, agentId) => {
          acc[agentId] = `Agent ${agentId.slice(0, 8)}...`;
          return acc;
        }, {} as Record<string, string>);
        
        setAgentNames(fallbackNamesMap);
      } finally {
        setFetchingAgents(false);
      }
    };

    fetchAgentNames();
  }, [multiAgents]);

  // Transform API data to component props format
  const transformedMultiAgents: MultiAgentCardProps[] = useMemo(() => {
    return multiAgents.map(multiAgent => ({
      id: multiAgent.id,
      title: multiAgent.name,
      description: multiAgent.description,
      connectedAgents: multiAgent.agent_ids.map((agentId) => ({
        id: agentId,
        name: agentNames[agentId] || `Loading...`
      })),
      status: 'active' as const, // Default to active since API doesn't provide status
    }));
  }, [multiAgents, agentNames]);

  // Filter multi-agents based on search query
  const filteredMultiAgents = useMemo(() => {
    if (!searchQuery.trim()) {
      return transformedMultiAgents;
    }

    const query = searchQuery.toLowerCase();
    return transformedMultiAgents.filter(multiAgent =>
      multiAgent.title.toLowerCase().includes(query) ||
      multiAgent.description.toLowerCase().includes(query) ||
      multiAgent.connectedAgents.some(agent => 
        agent.name.toLowerCase().includes(query)
      )
    );
  }, [transformedMultiAgents, searchQuery]);

  // Header buttons
  const headerButtons: HeaderButton[] = [
    {
      id: "create-multi-agent",
      label: "Create Multi-Agent",
      type: "primary",
      size: "medium",
      onClick: () => {
        navigate('/multi-agents/create');
      }
    }
  ];

  // Handle multi-agent actions
  const handleLaunchMultiAgent = async (id: string) => {
    try {
      // Navigate to manage multi-agent page where user can interact with the multi-agent
      navigate(`/multi-agents/manage/${id}`);
      showSuccess(`Multi-Agent launched successfully!`, "Launch Successful");
    } catch (error) {
      console.error('Failed to launch multi-agent:', error);
      showError('Failed to launch multi-agent', 'Launch Failed');
    }
  };

  const handleEditMultiAgent = (id: string) => {
    // Navigate to edit multi-agent page with the ID
    navigate(`/multi-agents/edit/${id}`);
  };

  const handleManageMultiAgent = (id: string) => {
    // Navigate to manage multi-agent page with the ID
    navigate(`/multi-agents/manage/${id}`);
  };

  const handleDeleteMultiAgent = (id: string) => {
    // Find the multi-agent to get its name for the modal
    const multiAgent = multiAgents.find(ma => ma.id === id);
    
    setDeleteModal({
      isOpen: true,
      multiAgentId: id,
      multiAgentName: multiAgent?.name || null,
      isDeleting: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.multiAgentId) return;

    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      await MultiAgentsService.deleteMultiAgent(deleteModal.multiAgentId);
      showSuccess("Multi-Agent deleted successfully!", "Delete Successful");
      await refreshMultiAgents(); // Refresh the list
      
      // Close modal
      setDeleteModal({
        isOpen: false,
        multiAgentId: null,
        multiAgentName: null,
        isDeleting: false,
      });
    } catch (error) {
      console.error('Failed to delete multi-agent:', error);
      showError('Failed to delete multi-agent', 'Delete Failed');
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const handleCancelDelete = () => {
    setDeleteModal({
      isOpen: false,
      multiAgentId: null,
      multiAgentName: null,
      isDeleting: false,
    });
  };

  const handleCloneMultiAgent = async (id: string) => {
    try {
      // Fetch the multi-agent details
      const multiAgentDetails = await MultiAgentsService.getMultiAgent(id);
      
      // Create a copy with "(Copy)" appended to the name
      const clonedData = {
        name: `${multiAgentDetails.name} (Copy)`,
        description: multiAgentDetails.description,
        role: multiAgentDetails.role,
        backstory: multiAgentDetails.backstory,
        expected_output: multiAgentDetails.expected_output,
        goal: multiAgentDetails.goal,
        agent_ids: multiAgentDetails.agent_ids,
      };

      await MultiAgentsService.createMultiAgent(clonedData);
      showSuccess("Multi-Agent cloned successfully!", "Clone Successful");
      await refreshMultiAgents(); // Refresh the list to show the new clone
    } catch (error) {
      console.error('Failed to clone multi-agent:', error);
      showError('Failed to clone multi-agent', 'Clone Failed');
    }
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Render error state
  if (error) {
    return (
      <div className="multi-agents-error">
        <div className="error-message">
          <p>Failed to load multi-agents: {error}</p>
          <button 
            className="retry-button"
            onClick={refreshMultiAgents}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="multi-agents-page">
      <PageHeader 
        title="Multi-agent orchestration"
        description="Coordinate multiple AI agents to work together on complex tasks"
        buttons={headerButtons}
        onSearch={handleSearch}
        onResetSearch={() => setSearchQuery('')}
        searchPlaceholder="Search multi-agents..."
        showResetButton={false}
        showSearchBar={false}
      />
      
      <div className="multi-agents-content">
        {(loading || fetchingAgents) && (
          <div className="loading-overlay">
            <Spinner />
          </div>
        )}
        
        {!loading && (
          <>
            {filteredMultiAgents.length === 0 ? (
              <div className={searchQuery ? "multi-agents-no-results" : "multi-agents-empty"}>
                {searchQuery ? (
                  <>
                    <p>No multi-agents found matching "{searchQuery}"</p>
                    <button 
                      className="clear-search-button"
                      onClick={() => setSearchQuery('')}
                    >
                      Clear Search
                    </button>
                  </>
                ) : (
                  <>
                    <p>No multi-agents created yet</p>
                    <button 
                      className="create-multi-agent-button"
                      onClick={() => navigate('/multi-agents/create')}
                    >
                      Create Your First Multi-Agent
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="multi-agents-cards">
                {filteredMultiAgents.map((multiAgent) => (
                  <MultiAgentCard
                    key={multiAgent.id}
                    id={multiAgent.id}
                    title={multiAgent.title}
                    description={multiAgent.description}
                    connectedAgents={multiAgent.connectedAgents}
                    status={multiAgent.status}
                    onLaunch={handleLaunchMultiAgent}
                    onEdit={handleEditMultiAgent}
                    onManage={handleManageMultiAgent}
                    onDelete={handleDeleteMultiAgent}
                    onClone={handleCloneMultiAgent}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <DeleteModal
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          title="Delete Multi-Agent"
          itemName={deleteModal.multiAgentName || undefined}
          itemType="multi-agent"
          isDeleting={deleteModal.isDeleting}
        />
      )}
    </div>
  );
};

export default MultiAgentsPage;