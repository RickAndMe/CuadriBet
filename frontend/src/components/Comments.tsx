import React, { useState, useEffect } from 'react';
import { bets, Comment } from '../api/api';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface CommentsProps {
  betId: number;
}

const Comments: React.FC<CommentsProps> = ({ betId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [betId]);

  const loadComments = async () => {
    try {
      const response = await bets.getComments(betId);
      setComments(response.data.comments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await bets.createComment(betId, { comment: newComment.trim() });
      setComments(prev => [response.data.comment, ...prev]);
      setNewComment('');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al crear comentario');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-pulse text-gray-400">Cargando comentarios...</div>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-gray-50 rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        💬 Comentarios <span className="text-sm text-gray-500">({comments.length})</span>
      </h3>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escribe un comentario..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base"
            maxLength={500}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium"
          >
            {isSubmitting ? 'Enviando...' : '💬 Enviar'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {newComment.length}/500 caracteres
        </p>
      </form>

      {/* Comments List */}
      {comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white p-3 rounded-lg shadow-sm border">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{comment.username}</span>
                    <span className="text-xs text-gray-500">
                      hace {formatDistanceToNow(new Date(comment.created_at), { locale: es })}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">💬</div>
          <p className="text-gray-500 text-sm">No hay comentarios aún.</p>
          <p className="text-gray-400 text-xs mt-1">Sé el primero en comentar.</p>
        </div>
      )}
    </div>
  );
};

export default Comments;
