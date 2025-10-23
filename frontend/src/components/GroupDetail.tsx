import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { groups, bets as betsApi, GroupDetail as GroupDetailType, Bet } from '../api/api';

const GroupDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<GroupDetailType | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadGroupData(parseInt(id));
    }
  }, [id]);

  const loadGroupData = async (groupId: number) => {
    try {
      const [groupResponse, betsResponse] = await Promise.all([
        groups.getDetails(groupId),
        betsApi.getForGroup(groupId)
      ]);
      setGroup(groupResponse.data.group);
      setBets(betsResponse.data.bets);
    } catch (error) {
      console.error('Error loading group data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-8"></div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Grupo no encontrado</h1>
        </div>
      </div>
    );
  }

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(group.invite_code);
      alert('Código copiado al portapapeles!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
          <p className="text-gray-600 mt-2">{group.member_count} miembros</p>
        </div>
        <div className="flex gap-4">
          {group.is_owner && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Eres el creador
            </span>
          )}
          <Link
            to="/create-bet"
            state={{ groupId: group.id }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Crear Apuesta
          </Link>
        </div>
      </div>

      {/* Código de Invitación */}
      <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
            <span className="mr-2">📋</span>
            Código de Invitación
          </h3>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={group.invite_code}
                readOnly
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900 font-mono text-center text-lg tracking-wider"
              />
            </div>
            <button
              onClick={copyInviteCode}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Copiar
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Comparte este código con tus amigos para que puedan unirse al grupo.
          </p>
        </div>
      </div>

      {/* Miembros del grupo */}
      <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Miembros
          </h3>
          <div className="space-y-3">
            {group.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{member.username}</p>
                  <p className="text-sm text-gray-600">{member.email}</p>
                </div>
                {/* {member.id === group.created_by && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Creador
                  </span>
                )} */}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Apuestas del grupo */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Apuestas
          </h3>
          {bets.length > 0 ? (
            <div className="space-y-4">
              {bets.map((bet) => (
                <div key={bet.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">

                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {bet.emoji && <span className="mr-2 text-lg">{bet.emoji}</span>}
                        {bet.description}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Creador: {bet.creator_name} • Estado: {bet.stake}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Vence: {new Date(bet.deadline).toLocaleDateString('es-ES')} •
                        {bet.total_votes}/{bet.potential_voters} han votado
                      </p>
                      <div className="mt-2">
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
                        {bet.status === 'completed' && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${
                            bet.result === 'won' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {bet.result === 'won' ? 'Se cumplió' : 'No se cumplió'}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      to={`/bet/${bet.id}`}
                      className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Ver
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No hay apuestas en este grupo aún.</p>
              <Link
                to="/create-bet"
                state={{ groupId: group.id }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Crear la primera apuesta
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupDetail;
