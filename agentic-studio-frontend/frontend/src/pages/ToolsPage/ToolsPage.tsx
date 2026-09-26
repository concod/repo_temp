import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { PageHeader } from "../../components/Header";
import type { HeaderButton } from "../../components/Header";
import { ToolCard } from "../../components/Card";
import { useTools } from "../../hooks/useTools";
import Spinner from "../../components/Spinner/Spinner";
import type { ToolResponse } from "../../types/api";
import { ToolsService } from "../../services/toolsService";
import { showSuccess, showError } from "../../utils/toast";

const ToolsPage = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState<string>('');
    
    // Use the tools hook to get data
    const { tools, loading, error, refetch } = useTools();
    
    // Filter tools based on search query
    const filteredTools = useMemo(() => {
        if (!searchQuery.trim()) {
            return tools;
        }
        
        const query = searchQuery.toLowerCase();
        return tools.filter(tool => 
            tool.name.toLowerCase().includes(query) ||
            tool.description.toLowerCase().includes(query) ||
            tool.tags.some(tag => tag.toLowerCase().includes(query))
        );
    }, [tools, searchQuery]);
    
    const handleSearch = (searchValue: string) => {
        setSearchQuery(searchValue);
    };
    
    const handleResetSearch = () => {
        setSearchQuery('');
    };
    
    const handleRetry = () => {
        refetch();
    };
    
    const handleCreateNewTool = () => {
        navigate('/tools/create');
    };
    
    const handleToolUniverse = () => {
        // TODO: Navigate to tool universe or open modal
        console.log('Tool universe clicked');
    };
    
    const handleLaunchTool = (tool: ToolResponse) => {
        console.log('Launching tool:', tool.name);
        // TODO: Implement tool launch logic
    };
    
    const handleDeleteTool = async (toolId: string) => {
        try {
            console.log('Deleting tool:', toolId);
            
            // Delete the tool using the API
            await ToolsService.deleteTool(toolId);
            
            console.log('Tool deleted successfully:', toolId);
            showSuccess('Tool deleted successfully!', 'Success!');
            
            // Refresh the tools list
            await refetch();
            
        } catch (error) {
            console.error('Failed to delete tool:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete tool';
            showError(`Error deleting tool: ${errorMessage}`, 'Error');
        }
    };

    const buttons: HeaderButton[] = [
        {
            id: 'tool-universe',
            label: 'Tool universe',
            type: 'secondary',
            size: 'large',
            onClick: handleToolUniverse
        },
        {
            id: 'create-tool',
            label: 'Create new tool',
            type: 'primary',
            size: 'large',
            onClick: handleCreateNewTool
        }
    ];

  return (
    <>
        <PageHeader
            title="Tools list"
            description="Configure and manage external tools and integrations for your agents."
            searchPlaceholder="Search tools..."
            searchQuery={searchQuery}
            onSearch={handleSearch}
            onResetSearch={handleResetSearch}
            buttons={buttons}
            showBottomSection={false}
        />
        
        <div className="tools-cards">
            {/* Loading State */}
            {loading && (
                <div className="loading-overlay">
                    <Spinner size={80} />
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className="tools-error">
                    <div className="error-message">
                        <p>Failed to load tools: {error}</p>
                        <button onClick={handleRetry} className="retry-button">
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredTools.length === 0 && tools.length === 0 && (
                <div className="tools-empty">
                    <p>No tools found. Create your first tool to get started!</p>
                    <button onClick={handleCreateNewTool} className="create-tool-button">
                        Create your first tool
                    </button>
                </div>
            )}

            {/* No Search Results */}
            {!loading && !error && filteredTools.length === 0 && tools.length > 0 && searchQuery && (
                <div className="tools-no-results">
                    <p>No tools found matching "{searchQuery}"</p>
                    <button onClick={handleResetSearch} className="clear-search-button">
                        Clear search
                    </button>
                </div>
            )}

            {/* Tool Cards */}
            {!loading && !error && filteredTools.map((tool) => (
                <ToolCard 
                    key={tool.id}
                    id={tool.id}
                    title={tool.name}
                    description={tool.description}
                    tags={tool.tags}
                    isAdded={tool.is_added}
                    isInternal={tool.is_internal}
                    onLaunch={() => handleLaunchTool(tool)}
                    onDelete={handleDeleteTool}
                    onRefreshTools={refetch}
                    categoryId="data-tools" // You can map this based on tool.tags or create a mapping function
                />
            ))}
        </div>
    </>
  );
};

export default ToolsPage;