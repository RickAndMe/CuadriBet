import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { groups, Group } from '../api/api';

const Groups: React.FC = () => {
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setIsLoading(true);
    try {
      const response = await groups.create({ name: groupName });
      setUserGroups([...userGroups, response.data.group]);
      setGroupName('');
      // Redirect to the newly created group
      navigate(`/groups/${response.data.group.id}`);
    } catch (error) {
      alert('Error al crear grupo');
    } finally {
      setIsLoading(false);
    }
  };

  const joinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsLoading(true);
    try {
      const response = await groups.join({ code: inviteCode.toUpperCase() });
      setUserGroups([...userGroups, response.data.group]);
      setInviteCode('');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al unirse al grupo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Grupos</h1>

      <div className="grid gap-6 sm:gap-8 sm:grid-cols-1 md:grid-cols-2">
        {/* Crear Grupo */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Crear Nuevo Grupo
            </h3>
            <form onSubmit={createGroup}>
              <div className="mb-4">
                <label htmlFor="groupName" className="block text-sm font-medium text-gray-700">
                  Nombre del Grupo
                </label>
                <input
                  type="text"
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Grupo de Amigos D&D"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !groupName.trim()}
                className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Creando...' : 'Crear Grupo'}
              </button>
            </form>
          </div>
        </div>

        {/* Unirse a Grupo */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Unirse a Grupo Existente
            </h3>
            <form onSubmit={joinGroup}>
              <div className="mb-4">
                <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700">
                  Código de Invitación
                </label>
                <input
                  type="text"
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: ABC123"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !inviteCode.trim()}
                className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isLoading ? 'Uniéndose...' : 'Unirse al Grupo'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Groups;
