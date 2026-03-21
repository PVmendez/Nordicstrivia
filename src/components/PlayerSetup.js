import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { FaUsers } from 'react-icons/fa';
import '../styles/PlayerSetup.css';

const PlayerSetup = () => {
  const [playerNames, setPlayerNames] = useState(['', '', '', '']);
  const { addPlayers } = useTournament();

  const handleInputChange = (index, value) => {
    const newNames = [...playerNames];
    newNames[index] = value;
    setPlayerNames(newNames);
  };

  const handleAddField = () => {
    setPlayerNames([...playerNames, '']);
  };

  const handleRemoveField = (index) => {
    if (playerNames.length > 2) {
      setPlayerNames(playerNames.filter((_, i) => i !== index));
    }
  };

  const handleStartTournament = async () => {
    const validNames = playerNames.filter(name => name.trim() !== '');
    if (validNames.length < 2) {
      alert('¡Necesitas al menos 2 jugadores para empezar!');
      return;
    }
    await addPlayers(validNames);
  };

  return (
    <div className="player-setup">
      <div className="setup-card">
        <h2><FaUsers /> Configura Los Jugadores</h2>
        <p className="subtitle">Ingresa los nombres de los jugadores que participarán en el torneo</p>

        <div className="players-input-container">
          {playerNames.map((name, index) => (
            <div key={index} className="player-input-wrapper">
              <input
                type="text"
                value={name}
                onChange={(e) => handleInputChange(index, e.target.value)}
                placeholder={`Jugador ${index + 1}`}
                className="player-input"
                onKeyPress={(e) => e.key === 'Enter' && handleStartTournament()}
              />
              {playerNames.length > 2 && (
                <button
                  onClick={() => handleRemoveField(index)}
                  className="btn-remove"
                  title="Eliminar jugador"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleAddField}
          className="btn-add-player"
        >
          + Agregar Jugador
        </button>

        <button
          onClick={handleStartTournament}
          className="btn-start-tournament"
        >
          Iniciar Torneo
        </button>

        <div className="info-box">
          <p>✓ Mínimo 2 jugadores</p>
          <p>✓ {playerNames.filter(n => n.trim()).length} jugador(es) agregado(s)</p>
        </div>
      </div>
    </div>
  );
};

export default PlayerSetup;
