import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { groups, bets, Group, Bet } from '../api/api';

const Dashboard: React.FC = () => {
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [pendingBets, setPendingBets] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    console.log('Loading dashboard data...');
    try {
      const groupsResponse = await groups.getAll();
      console.log('Groups API response:', groupsResponse.data);
      setUserGroups(groupsResponse.data.groups || []);

      // Load bets for the first group if any
      if (groupsResponse.data.groups?.length > 0) {
        try {
          const betsResponse = await bets.getForGroup(groupsResponse.data.groups[0].id);
          console.log('Bets API response:', betsResponse.data);
          setPendingBets(betsResponse.data.bets?.filter((bet: Bet) => bet.status === 'pending') || []);
        } catch (betsError) {
          console.error('Error loading pending bets:', betsError);
          setPendingBets([]); // Set empty array on error
        }
      } else {
        console.log('No groups found');
        setPendingBets([]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setUserGroups([]);
      setPendingBets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-8"></div>
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={() => {
            setIsLoading(true);
            loadDashboardData();
          }}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Grupos del usuario */}
      <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Mis Grupos
          </h3>
          {userGroups.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {userGroups.map((group) => (
                <Link
                  key={group.id}
                  to={`/group/${group.id}`}
                  onClick={(e) => {
                    console.log('Clicking group:', group.id, group.name);
                  }}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-colors"
                >
                  <h4 className="font-semibold text-gray-900">{group.name}</h4>
                  <p className="text-sm text-gray-600">{group.member_count} miembros</p>
                  {group.is_owner && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                      Creador
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No tienes grupos aún.</p>
              <Link
                to="/groups"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Crear o unirte a un grupo
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Apuestas pendientes */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Apuestas Pendientes
          </h3>
          {pendingBets.length > 0 ? (
            <div className="space-y-4">
              {pendingBets.slice(0, 5).map((bet) => (
                <div key={bet.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{bet.description}</h4>
                      <p className="text-sm text-gray-600">
                        Creador: {bet.creator_name} • Estado: {bet.stake}
                      </p>
                      <p className="text-sm text-gray-500">
                        Vence: {new Date(bet.deadline).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <Link
                      to={`/bet/${bet.id}`}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Ver
                    </Link>
                  </div>
                  <div className="mt-2">
                    <span className="text-sm text-gray-600">
                      {bet.total_votes}/{bet.potential_voters} han votado
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No hay apuestas pendientes.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
