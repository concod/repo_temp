import { useState, useEffect } from "react";
import tickIcon from "../../assets/images/blue-tick.svg";
import defaultIllustration from "../../assets/images/illustration-default.svg";
import { PrimaryLargeButton, SecondaryLargeButton, TertiaryLargeButton } from "../../components/Button";
import { useNavigate, useParams } from "react-router-dom";
import { TextInput, TextBox } from "../../components/Input";
import { Dropdown } from "../../components/Dropdown";
import { showSuccess, showError } from "../../utils/toast";
import { KnowledgeBaseService } from "../../services";
import { useKnowledgeCards } from "../../hooks/useKnowledgeCards";

// Types for knowledge base sources (extending API types)
interface KnowledgeSource {
  id: string;
  type: 'url' | 'text' | 'file';
  content: string;
  filename?: string;
  file?: File;
}

const CreateKnowledgeBase = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { knowledgeCards } = useKnowledgeCards();
  
  // Determine if we're in edit mode
  const isEditMode = Boolean(id);
  
  // Form state
  const [title, setTitle] = useState('');
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(isEditMode);
  
  // Source form state
  const [sourceType, setSourceType] = useState<'url' | 'text' | 'file'>('url');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  
  // Editing state
  const [editingSourceIndex, setEditingSourceIndex] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Source type options
  const sourceTypeOptions = [
    { value: 'url', label: 'Remote Webpage Link', disabled: false },
    { value: 'text', label: 'Text Content', disabled: false },
    { value: 'file', label: 'File Upload', disabled: false }
  ];

  // Load existing data when in edit mode
  useEffect(() => {
    if (isEditMode && id && knowledgeCards.length > 0) {
      const existingCard = knowledgeCards.find(card => card.id === id);
      if (existingCard) {
        setTitle(existingCard.title);
        
        // Transform API sources to component sources
        const transformedSources: KnowledgeSource[] = existingCard.sources.map(source => ({
          id: source.id,
          type: source.type,
          content: source.content,
          filename: source.filename || undefined,
        }));
        
        setSources(transformedSources);
        setIsLoadingData(false);
      } else {
        showError('Knowledge base not found');
        navigate('/knowledge-base');
      }
    } else if (isEditMode && knowledgeCards.length === 0) {
      // Still loading knowledge cards
      setIsLoadingData(true);
    } else if (!isEditMode) {
      setIsLoadingData(false);
    }
  }, [isEditMode, id, knowledgeCards, navigate]);

  // Helper functions
  const resetSourceForm = () => {
    setSourceUrl('');
    setSourceText('');
    setSourceFile(null);
    setSourceType('url');
    setEditingSourceIndex(null);
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'url': return 'fa-solid fa-link';
      case 'text': return 'fa-solid fa-file-alt';
      case 'file': return 'fa-solid fa-file-upload';
      default: return 'fa-solid fa-question-circle';
    }
  };

  const renderSourceContent = (source: KnowledgeSource) => {
    switch (source.type) {
      case 'url':
        return (
          <a href={source.content} target="_blank" rel="noopener noreferrer" className="source-link">
            {source.content}
          </a>
        );
      case 'text':
        return <p className="source-text">{source.content.length > 100 ? source.content.substring(0, 100) + '...' : source.content}</p>;
      case 'file':
        return <span className="source-file">File: {source.filename || source.content}</span>;
      default:
        return '';
    }
  };

  // Handlers
  const handleSourceTypeChange = (value: string | number) => {
    setSourceType(value as 'url' | 'text' | 'file');
  };

  const handleAddSource = () => {
    let sourceData: Partial<KnowledgeSource> = {};
    
    if (sourceType === 'url' && sourceUrl.trim()) {
      sourceData = { type: 'url', content: sourceUrl.trim() };
    } else if (sourceType === 'text' && sourceText.trim()) {
      sourceData = { type: 'text', content: sourceText.trim() };
    } else if (sourceType === 'file' && sourceFile) {
      const allowedTypes = ['text/plain', 'application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/json'];
      if (!allowedTypes.includes(sourceFile.type)) {
        showError('Invalid file type. Please select a .txt, .pdf, .csv, .xlsx, or .json file.');
        return;
      }
      sourceData = { 
        type: 'file', 
        file: sourceFile,
        content: sourceFile.name, 
        filename: sourceFile.name 
      };
    } else {
      showError('Please provide content for the source.');
      return;
    }

    if (editingSourceIndex !== null) {
      // Update existing source
      const updatedSources = [...sources];
      updatedSources[editingSourceIndex] = { 
        ...updatedSources[editingSourceIndex], 
        ...sourceData,
        id: updatedSources[editingSourceIndex].id
      };
      setSources(updatedSources);
    } else {
      // Add new source
      const newSource: KnowledgeSource = {
        ...sourceData as KnowledgeSource,
        id: `new_${Date.now()}`
      };
      setSources(prev => [...prev, newSource]);
    }
    
    resetSourceForm();
  };

  const handleEditSource = (index: number) => {
    const source = sources[index];
    setEditingSourceIndex(index);
    setSourceType(source.type);
    
    if (source.type === 'url') {
      setSourceUrl(source.content);
    } else if (source.type === 'text') {
      setSourceText(source.content);
    }
    // Note: File editing would require re-upload
  };

  const handleRemoveSource = (index: number) => {
    setSources(prev => prev.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    navigate('/knowledge-base');
  };

  const handleCreateKnowledgeBase = async () => {
    try {
      setIsCreating(true);

      // Validation
      if (!title.trim()) {
        showError('Knowledge base title is required');
        return;
      }

      if (sources.length === 0) {
        showError('Please add at least one knowledge source');
        return;
      }

      // Collect files from file type sources (only new files for create, or files that have been re-uploaded for edit)
      const files: File[] = [];
      sources.forEach(source => {
        if (source.type === 'file' && source.file) {
          files.push(source.file);
        }
      });

      console.log(`${isEditMode ? 'Updating' : 'Creating'} knowledge card with title:`, title);
      console.log('Sources:', sources);
      console.log('Files:', files);

      let result;
      if (isEditMode && id) {
        // Update existing knowledge card
        result = await KnowledgeBaseService.updateKnowledgeCard(
          id,
          title.trim(),
          sources,
          files
        );
        console.log('Knowledge card updated successfully:', result);
        showSuccess(`Knowledge base "${result.title}" updated successfully!`);
      } else {
        // Create new knowledge card
        result = await KnowledgeBaseService.createKnowledgeCard(
          title.trim(),
          sources,
          files
        );
        console.log('Knowledge card created successfully:', result);
        showSuccess(`Knowledge base "${result.title}" created successfully!`);
      }
      
      // Navigate back to knowledge base page
      navigate('/knowledge-base');
      
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} knowledge base:`, error);
      const errorMessage = error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} knowledge base`;
      showError(`Error ${isEditMode ? 'updating' : 'creating'} knowledge base: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  const items = [
    {
      title: "Add Knowledge Sources",
      description: "Add web links, text content, and files to build your knowledge base.",
    },
    {
      title: "Organize Information",
      description: "Group related information together in a structured way.",
    },
    {
      title: "Enable AI Access",
      description: "Make your knowledge accessible to AI agents and applications.",
    }
  ];

  // Show loading state when loading existing data
  if (isLoadingData) {
    return (
      <div className="create-agent">
        <div className="create-agent__loading">
          <span className="body-medium">Loading knowledge base data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="create-agent">
      <div className="create-agent__left">
        <div className="create-agent__left-title headline-4">
          {isEditMode ? 'Edit Knowledge Base' : 'Create New Knowledge Base'}
        </div>
        <div className="create-agent__left-illustration">
          <img src={defaultIllustration} alt="knowledge base illustration" />
        </div>
        <div className="create-agent__left-footer">
          <div className="create-agent__left-footer-content">
            <div className="create-agent__left-footer-content-title">
              <span className="body-large">Start Building</span>
            </div>
            <div className="create-agent__left-footer-content-items">
              {items.map((item, index) => (
                <div key={index} className="create-agent__left-footer-content-items-item">
                  <div className="create-agent__left-footer-content-items-item-header">
                    <img src={tickIcon} alt="tick" />
                    <div className="create-agent__left-footer-content-items-item-header-title">
                      <span className="body-medium--medium">{item.title}</span>
                    </div>
                  </div>
                  <div className="create-agent__left-footer-content-items-item-description">
                    <span className="body-small">{item.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="create-agent__right">
        <div className="create-agent__right-content">
          <div className="create-agent__right-content-header">
            <div className="create-agent__right-content-header-title">
              <span className="body-medium--medium">Knowledge base details</span>
            </div>
          </div>

          <div className="create-agent__right-content-body">
            <div className="create-agent__right-content-body-section">
              {/* Knowledge Base Title */}
              <div className="create-agent__right-content-body-section-first">
                <TextInput 
                  label="Title" 
                  placeholder="Enter knowledge base title" 
                  value={title}
                  onChange={setTitle}
                  required
                />
              </div>

              {/* Sources Section */}
              <div className="knowledge-base__sources-section">
                <h3 className="knowledge-base__sources-title">Sources</h3>
                
                {/* Display existing sources */}
                {sources.length > 0 && (
                  <div className="knowledge-base__sources-list">
                    {sources.map((source, index) => (
                      <div key={source.id} className="knowledge-base__source-item">
                        <div className="knowledge-base__source-content">
                          <div className="knowledge-base__source-icon">
                            <i className={getSourceIcon(source.type)}></i>
                          </div>
                          <div className="knowledge-base__source-details">
                            <div className="knowledge-base__source-type">{source.type.toUpperCase()}</div>
                            <div className="knowledge-base__source-text">
                              {renderSourceContent(source)}
                            </div>
                          </div>
                        </div>
                        <div className="knowledge-base__source-actions">
                          <button 
                            type="button" 
                            className="knowledge-base__source-action-btn edit"
                            onClick={() => handleEditSource(index)}
                            title="Edit"
                          >
                            <i className="fas fa-pen"></i>
                          </button>
                          <button 
                            type="button" 
                            className="knowledge-base__source-action-btn delete"
                            onClick={() => handleRemoveSource(index)}
                            title="Delete"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Source Form */}
                <div className="knowledge-base__add-source">
                  <div className="knowledge-base__add-source-header">
                    <span className="body-medium--medium">
                      {editingSourceIndex !== null ? 'Edit Source' : 'Add New Source'}
                    </span>
                  </div>

                  <div className="knowledge-base__add-source-form">
                    <Dropdown 
                      label="Source type" 
                      placeholder="Select source type" 
                      options={sourceTypeOptions}
                      value={sourceType}
                      onChange={handleSourceTypeChange}
                    />

                    {sourceType === 'url' && (
                      <TextInput 
                        label="URL" 
                        placeholder="https://example.com" 
                        value={sourceUrl}
                        onChange={setSourceUrl}
                      />
                    )}

                    {sourceType === 'text' && (
                      <TextBox 
                        label="Text Content" 
                        placeholder="Enter your text content here..." 
                        value={sourceText}
                        onChange={setSourceText}
                        rows={5}
                      />
                    )}

                    {sourceType === 'file' && (
                      <div className="knowledge-base__file-input">
                        <label className="knowledge-base__file-label">
                          <span className="body-medium">File</span>
                          <input
                            type="file"
                            accept=".txt,.pdf,.csv,.xlsx,.json"
                            onChange={(e) => setSourceFile(e.target.files?.[0] || null)}
                            className="knowledge-base__file-input-field"
                          />
                        </label>
                        <small className="knowledge-base__file-help">
                          Allowed file types: .txt, .pdf, .csv, .xlsx, .json
                        </small>
                        {sourceFile && (
                          <div className="knowledge-base__file-selected">
                            Selected: {sourceFile.name}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="knowledge-base__add-source-buttons">
                      <SecondaryLargeButton onClick={handleAddSource}>
                        <i className="fas fa-plus"></i>
                        {editingSourceIndex !== null ? 'Update Source' : 'Add Source'}
                      </SecondaryLargeButton>
                      {editingSourceIndex !== null && (
                        <TertiaryLargeButton onClick={resetSourceForm}>
                          Cancel Edit
                        </TertiaryLargeButton>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="create-agent__right-footer">
            <TertiaryLargeButton onClick={handleCancel}>Cancel</TertiaryLargeButton>
            <div className="create-agent__right-footer-buttons">
              <PrimaryLargeButton onClick={handleCreateKnowledgeBase} disabled={isCreating || isLoadingData}>
                {isCreating 
                  ? (isEditMode ? 'Updating...' : 'Creating...') 
                  : (isEditMode ? 'Update' : 'Save')
                }
              </PrimaryLargeButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateKnowledgeBase;
