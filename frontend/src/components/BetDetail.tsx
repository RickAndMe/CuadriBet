import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { bets, BetDetail as BetDetailType } from '../api/api';
import Comments from './Comments';

const BetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [bet, setBet] = useState<BetDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadBetData(parseInt(id));
    }
  }, [id]);

  const loadBetData = async (betId: number) => {
    try {
      const response = await bets.getDetails(betId);
      setBet(response.data.bet);
    } catch (error) {
      console.error('Error loading bet data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (vote: 'favor' | 'contra') => {
    if (!bet) return;
    try {
      await bets.vote(bet.id, { vote });
      // Reload bet data
      loadBetData(bet.id);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al votar');
    }
  };

  const handleResolve = async (result: 'won' | 'lost') => {
    if (!bet) return;
    try {
      await bets.resolve(bet.id, { result });
      // Reload bet data
      loadBetData(bet.id);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al resolver apuesta');
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!bet) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Apuesta no encontrada</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {bet.emoji && <span className="mr-3 text-3xl">{bet.emoji}</span>}
          {bet.description}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Detalles</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Creador</dt>
                <dd className="text-sm text-gray-900">{bet.creator_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Fecha límite</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(bet.deadline).toLocaleDateString('es-ES')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Premio</dt>
                <dd className="text-sm text-gray-900">{bet.stake}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Estado</dt>
                <dd className="text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    bet.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : bet.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {bet.status === 'pending' ? 'Pendiente' :
                     bet.status === 'completed' ? 'Completada' : 'Cancelada'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Votación</h3>
            {bet.status === 'pending' ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  Total votos: {Object.values(bet.voteCounts).reduce((a, b) => a + b, 0)}
                </div>
                {!bet.userHasVoted ? (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleVote('favor')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md text-sm font-medium"
                    >
                      A favor ✓
                    </button>
                    <button
                      onClick={() => handleVote('contra')}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md text-sm font-medium"
                    >
                      En contra ✗
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-green-600">
                    ✅ Ya has votado: {bet.userVote === 'favor' ? 'A favor' : 'En contra'}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-lg font-semibold">
                  {bet.result === 'won' ? '✅ Se cumplió' : '❌ No se cumplió'}
                </div>
              </div>
            )}

            {/* Resolve buttons - only show when creator and pending */}
            {bet.is_creator && bet.status === 'pending' && new Date(bet.deadline) <= new Date() && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Resolver apuesta:</h4>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleResolve('won')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md text-sm font-medium"
                  >
                    Se cumplió ✓
                  </button>
                  <button
                    onClick={() => handleResolve('lost')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md text-sm font-medium"
                  >
                    No se cumplió ✗
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Votos</h3>
          <div className="space-y-2">
            {bet.votes.map((vote, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">{vote.username}</span>
                <span className={`text-sm font-medium ${
                  vote.vote === 'favor' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {vote.vote === 'favor' ? 'A favor ✓' : 'En contra ✗'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <Comments betId={bet.id} />
    </div>
  );
};

export default BetDetail;
