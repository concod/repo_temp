import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/Header';
import { KnowledgeCard } from '../../components/Card';
import { DeleteModal } from '../../components/Modal';
import { useKnowledgeCards } from '../../hooks/useKnowledgeCards';
import { KnowledgeBaseService } from '../../services';
import { showSuccess, showError } from '../../utils/toast';
import type { KnowledgeCardResponse, KnowledgeCardSource } from '../../types/api';

// Transform API response to KnowledgeCard component props
const transformKnowledgeCardData = (apiCard: KnowledgeCardResponse) => {
  return {
    id: apiCard.id,
    title: apiCard.title,
    description: `${apiCard.sources.length} source${apiCard.sources.length !== 1 ? 's' : ''} available`,
    sources: apiCard.sources.map((source: KnowledgeCardSource) => ({
      id: source.id,
      type: source.type,
      title: source.filename || `${source.type.charAt(0).toUpperCase() + source.type.slice(1)} Source`,
      content: source.content,
      filename: source.filename,
      path: source.path
    }))
  };
};

const KnowledgebasePage: React.FC = () => {
  const navigate = useNavigate();
  const { knowledgeCards, loading, error, refetch } = useKnowledgeCards();

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRetry = () => {
    refetch();
  };

  const handleSearch = (query: string) => {
    // TODO: Implement search functionality
    console.log('Search query:', query);
  };

  const handleResetSearch = () => {
    // TODO: Implement reset search functionality
    console.log('Reset search');
  };

  const handleCreateKnowledgeCard = () => {
    navigate('/knowledge-base/create');
  };

  const handleEditCard = (cardId: string) => {
    // TODO: Implement edit functionality - navigate to edit page
    console.log('Edit card:', cardId);
    navigate(`/knowledge-base/edit/${cardId}`);
  };

  const handleDeleteCard = (cardId: string) => {
    const card = knowledgeCards.find(c => c.id === cardId);
    if (card) {
      setCardToDelete({ id: cardId, title: card.title });
      setShowDeleteModal(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!cardToDelete) return;

    try {
      setIsDeleting(true);
      await KnowledgeBaseService.deleteKnowledgeCard(cardToDelete.id);
      showSuccess(`Knowledge card "${cardToDelete.title}" deleted successfully!`);
      refetch(); // Refresh the list
      setShowDeleteModal(false);
      setCardToDelete(null);
    } catch (error) {
      console.error('Failed to delete knowledge card:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete knowledge card';
      showError(`Error deleting knowledge card: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setCardToDelete(null);
  };

  return (
    <div className="knowledgebase-page">
      {/* Page Header */}
      <div className="knowledgebase-page__header">
        <PageHeader
          title="Knowledge Base"
          description="Manage and explore your knowledge cards and data sources. Organize information for better AI agent performance."
          searchPlaceholder="Search knowledge cards..."
          onSearch={handleSearch}
          onResetSearch={handleResetSearch}
          showResetButton={false}
          showSearchBar={false}
          buttons={[
            {
              id: 'create-knowledge-card',
              label: 'Create Knowledge Card',
              type: 'primary',
              size: 'large',
              onClick: handleCreateKnowledgeCard
            }
          ]}
        />
      </div>

      {/* Main Content */}
      <div className="knowledgebase-page__content">
        {loading && (
          <div className="knowledgebase-page__loading">
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
            <p className="body-medium">Loading knowledge cards...</p>
          </div>
        )}

        {error && !loading && (
          <div className="knowledgebase-page__error">
            <div className="error-content">
              <h3 className="headline-5">Unable to load knowledge cards</h3>
              <p className="body-medium">{error}</p>
              <button 
                className="retry-button"
                onClick={handleRetry}
                type="button"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && knowledgeCards.length === 0 && (
          <div className="knowledgebase-page__empty">
            <div className="empty-content">
              <h3 className="headline-5">No knowledge cards found</h3>
              <p className="body-medium">
                Start building your knowledge base by creating your first knowledge card.
              </p>
              <button 
                className="create-button"
                type="button"
                onClick={handleCreateKnowledgeCard}
              >
                Create Knowledge Card
              </button>
            </div>
          </div>
        )}

        {!loading && !error && knowledgeCards.length > 0 && (
          <div className="knowledgebase-page__cards">
            
            <div className="knowledgebase-page__cards-grid  scrollbar-hidden">
              {knowledgeCards.map((card) => {
                const transformedCard = transformKnowledgeCardData(card);
                return (
                  <KnowledgeCard
                    key={card.id}
                    id={transformedCard.id}
                    title={transformedCard.title}
                    description={transformedCard.description}
                    sources={transformedCard.sources}
                    onEdit={handleEditCard}
                    onDelete={handleDeleteCard}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && cardToDelete && (
        <DeleteModal
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Delete Knowledge Card"
          itemName={cardToDelete.title}
          itemType="knowledge card"
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};

export default KnowledgebasePage;
