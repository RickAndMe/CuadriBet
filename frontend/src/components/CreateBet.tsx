import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { bets, groups, Group } from '../api/api';
import { format } from 'date-fns';
import EmojiPicker from './EmojiPicker';

const CreateBet: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const groupId = (location.state as any)?.groupId;

  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>(groupId || '');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [stake, setStake] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const response = await groups.getAll();
        setUserGroups(response.data.groups);
      } catch (error) {
        console.error('Error loading groups:', error);
      }
    };
    loadGroups();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !description.trim() || !deadline || !stake.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await bets.create({
        groupId: selectedGroupId as number,
        description,
        deadline,
        stake,
        emoji: selectedEmoji,
      });

      // Redirect to the group detail page
      navigate(`/group/${selectedGroupId}`);

    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al crear la apuesta');
    } finally {
      setIsLoading(false);
    }
  };

  // Set minimum date to tomorrow
  const minDate = format(new Date(Date.now() + 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm");

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Crear Nueva Apuesta</h1>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Grupo selection */}
          <div>
            <label htmlFor="group" className="block text-sm font-medium text-gray-700">
              Grupo
            </label>
            <select
              id="group"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value ? parseInt(e.target.value) : '')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Selecciona un grupo...</option>
              {userGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.member_count} miembros)
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Descripción de la Apuesta
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Luisa se va a casar antes de 2027"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Describe claramente la condición que se debe cumplir.
            </p>
          </div>

          {/* Deadline */}
          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
              Fecha Límite
            </label>
            <input
              type="datetime-local"
              id="deadline"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={minDate}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Fecha y hora en que se determinará si la apuesta se cumplió.
            </p>
          </div>

          {/* Stake */}
          <div>
            <label htmlFor="stake" className="block text-sm font-medium text-gray-700">
              Premio/Condición
            </label>
            <input
              type="text"
              id="stake"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: 3 cervezas, 20€, una cena..."
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              ¿Qué se apuesta? Dinero, cervezas, tareas, etc.
            </p>
          </div>

          {/* Emoji Picker */}
          <EmojiPicker
            selectedEmoji={selectedEmoji}
            onSelect={setSelectedEmoji}
          />

          {/* Submit */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedGroupId || !description.trim() || !deadline || !stake.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Creando...' : 'Crear Apuesta'}
            </button>
          </div>
        </form>

        <div className="mt-8 bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Cómo funciona:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Todos los miembros del grupo podrán votar a favor o en contra</li>
            <li>• Cuando llegue la fecha límite, tú (como creador) marcarás si se cumplió</li>
            <li>• Si se cumplió: ganan quienes votaron "A favor". Pierden quienes votaron "En contra"</li>
            <li>• Si no se cumplió: ocurre lo contrario</li>
            <li>• Los miembros recibirán notificaciones por email automáticamente</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreateBet;
