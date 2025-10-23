import React, { useState } from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  selectedEmoji?: string;
}

const EMOJIS = [
  '🎯', '🏆', '💰', '🎲', '⚽', '🏃', '💒', '🎓',
  '🚗', '✈️', '🍺', '🍕', '🎉', '🎮', '📱', '💻',
  '🏠', '🌍', '❤️', '⭐', '🏸', '🎳', '🎿', '🏊'
];

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, selectedEmoji }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleEmojiSelect = (emoji: string) => {
    onSelect(emoji);
    setIsOpen(false);
  };

  const handleClearEmoji = () => {
    onSelect('');
    setIsOpen(false);
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Emoji de la apuesta (opcional)
      </label>

      {/* Emoji Placeholder/Button */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-12 h-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
          title="Seleccionar emoji"
        >
          {selectedEmoji ? (
            <span className="text-2xl">{selectedEmoji}</span>
          ) : (
            <span className="text-gray-400 text-lg">+</span>
          )}
        </button>

        <div className="flex items-center space-x-2">
          {selectedEmoji ? (
            <>
              <span className="text-sm text-gray-600">Emoji seleccionado</span>
              <button
                type="button"
                onClick={handleClearEmoji}
                className="text-sm text-red-600 hover:text-red-800"
                title="Quitar emoji"
              >
                ✕
              </button>
            </>
          ) : (
            <span className="text-sm text-gray-500">Haz clic para elegir un emoji</span>
          )}
        </div>
      </div>

      {/* Emoji Selector (se muestra cuando isOpen es true) */}
      {isOpen && (
        <div className="mt-3 bg-gray-50 p-4 rounded-lg border animate-in fade-in duration-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Elige un emoji:</h4>
          <div className="grid grid-cols-6 gap-2">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`text-2xl p-2 rounded transition-colors ${
                  selectedEmoji === emoji
                    ? 'bg-blue-200 ring-2 ring-blue-400'
                    : 'hover:bg-gray-200'
                }`}
                onClick={() => handleEmojiSelect(emoji)}
                title={`Seleccionar ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-1">
        El emoji ayuda a identificar visualmente tu apuesta
      </p>
    </div>
  );
};

export default EmojiPicker;
