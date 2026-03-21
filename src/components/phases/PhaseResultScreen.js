import React, { useState } from 'react';
import { FaCheckCircle, FaMedal, FaArrowRight, FaEdit } from 'react-icons/fa';
import '../../styles/phases/PhaseResultScreen.css';

const PhaseResultScreen = ({ teamScores, teams, playerScores, players, phase, onContinue, incorrectAnswers = [] }) => {
  const [showCorrections, setShowCorrections] = useState(false);
  const [correctedAnswers, setCorrectedAnswers] = useState(new Set());

  // Determinar si son resultados de equipos o jugadores
  const isTeamsPhase = teams && teams.length > 0;

  // Crear array de resultados ordenado
  const results = isTeamsPhase
    ? teams
        .map(team => ({
          ...team,
          ...teamScores[team.id]
        }))
        .sort((a, b) => b.total - a.total)
        .map((item, index) => ({
          ...item,
          position: index + 1
        }))
    : players
        .map(player => ({
          id: player.id,
          name: player.name,
          ...playerScores[player.id]
        }))
        .sort((a, b) => b.total - a.total)
        .map((item, index) => ({
          ...item,
          position: index + 1
        }));

  const handleMarkAsCorrect = (index) => {
    const newCorrected = new Set(correctedAnswers);
    if (newCorrected.has(index)) {
      newCorrected.delete(index);
    } else {
      newCorrected.add(index);
    }
    setCorrectedAnswers(newCorrected);
  };

  const handleApplyCorrections = () => {
    console.log('Respuestas corregidas:', Array.from(correctedAnswers).length);
    setShowCorrections(false);
    // Las correcciones se han guardado
  };

  return (
    <div className="phase-result-screen">
      <div className="result-card">
        <div className="result-header">
          <h1><FaCheckCircle /> ¡Fase {phase} Completada!</h1>
          <p className="subtitle">
            {isTeamsPhase ? 'Resultados por Equipos' : 'Resultados - Todos Contra Todos'}
          </p>
        </div>

        <div className="result-ranking">
          <h2>{isTeamsPhase ? 'Ranking de Equipos' : 'Ranking de Jugadores'}</h2>
          <div className="ranking-list">
            {results.map((result) => (
              <div key={result.id} className={`ranking-item position-${result.position}`}>
                <div className="position-badge">
                  {result.position === 1 && <FaMedal className="medal gold" title="1er lugar" />}
                  {result.position === 2 && <FaMedal className="medal silver" title="2do lugar" />}
                  {result.position === 3 && <FaMedal className="medal bronze" title="3er lugar" />}
                  {result.position > 3 && result.position}
                </div>
                <div className="player-info">
                  <span className="player-name">{result.name}</span>
                  {isTeamsPhase && result.players && (
                    <div className="team-members-display">
                      {result.players.map((member, idx) => (
                        <span key={member.id} className="member">{member.name}</span>
                      ))}
                    </div>
                  )}
                  {result.correct !== undefined && (
                    <div className="score-details">
                      <span className="correct">✓ {result.correct} correctas</span>
                      <span className="separator">•</span>
                      <span className="incorrect">✗ {result.incorrect} falladas</span>
                    </div>
                  )}
                </div>
                <div className="points">
                  <span className="total-points">{result.total} pts</span>
                  {result.bonus && <span className="bonus">+{result.bonus} bonus</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {incorrectAnswers && incorrectAnswers.length > 0 && !showCorrections && (
          <button
            onClick={() => setShowCorrections(true)}
            className="btn-review-answers"
          >
            <FaEdit /> Revisar Respuestas Incorrectas ({incorrectAnswers.length})
          </button>
        )}

        {showCorrections && incorrectAnswers.length > 0 && (
          <div className="corrections-section">
            <h2>Revisar Respuestas Incorrectas</h2>
            <div className="incorrect-answers-list">
              {incorrectAnswers.map((answer, index) => (
                <div key={index} className={`answer-review ${correctedAnswers.has(index) ? 'marked-correct' : ''}`}>
                  <div className="answer-header">
                    <span className="letter-badge">{answer.letter}</span>
                    <span className="team-badge">{answer.teamName}</span>
                  </div>
                  <div className="answer-content">
                    <p className="question">{answer.question}</p>
                    <div className="answer-comparison">
                      <div className="user-answer">
                        <span className="label">Tu respuesta:</span>
                        <span className="text">{answer.userAnswer}</span>
                      </div>
                      <div className="correct-answer">
                        <span className="label">Respuesta correcta:</span>
                        <span className="text">{answer.correctAnswer}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    className={`btn-mark-correct ${correctedAnswers.has(index) ? 'marked' : ''}`}
                    onClick={() => handleMarkAsCorrect(index)}
                  >
                    {correctedAnswers.has(index) ? '✓ Cuenta como correcta' : 'Marcar como correcta'}
                  </button>
                </div>
              ))}
            </div>
            <div className="corrections-actions">
              <button
                onClick={handleApplyCorrections}
                className="btn-apply-corrections"
              >
                Aplicar Correcciones
              </button>
              <button
                onClick={() => setShowCorrections(false)}
                className="btn-cancel-corrections"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {!showCorrections && (
          <button
            onClick={onContinue}
            className="btn-continue"
          >
            Continuar al Siguiente <FaArrowRight />
          </button>
        )}
      </div>
    </div>
  );
};

export default PhaseResultScreen;
