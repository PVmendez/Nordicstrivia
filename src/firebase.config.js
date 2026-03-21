import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, remove, get } from 'firebase/database';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAgyxl9VgqjLHC2kCJInlQuiYPRd1T9skg",
  authDomain: "nordictrivia.firebaseapp.com",
  projectId: "nordictrivia",
  storageBucket: "nordictrivia.appspot.com",
  messagingSenderId: "492853461261",
  databaseURL: "https://nordictrivia-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Funciones auxiliares para Firebase
export const createGame = async (gameId, players, question, quoteIndex = 0, currentZoomLevel = 1, currentImageIndex = 0) => {
  const gameRef = ref(db, `games/${gameId}`);
  const playersList = {};
  
  players.forEach(player => {
    playersList[player.id] = {
      id: player.id,
      name: player.name,
      pressed: false,
      pressedAt: null,
      answered: false,
      correct: null,
      score: player.score || 0
    };
  });

  await set(gameRef, {
    gameId,
    question,
    players: playersList,
    status: 'waiting', // waiting, locked, answered, finished
    winner: null,
    currentQuoteIndex: quoteIndex,
    currentZoomLevel,
    currentImageIndex,
    blockedPlayers: {}, // Jugadores que erraron en esta ronda
    createdAt: new Date().toISOString()
  });
};

export const updateGameQuestion = async (gameId, players, question, quoteIndex, blockedPlayerId = null, currentZoomLevel = null, currentImageIndex = null) => {
  const gameRef = ref(db, `games/${gameId}`);
  const playersList = {};
  const blockedPlayers = {};
  
  // Resetear todos los pressed para la nueva frase
  players.forEach(player => {
    playersList[player.id] = {
      id: player.id,
      name: player.name,
      pressed: false,
      pressedAt: null,
      answered: false,
      correct: null,
      score: player.score || 0
    };
  });

  // Si hay un jugador que bloquear, agregarlos a blockedPlayers
  if (blockedPlayerId) {
    blockedPlayers[blockedPlayerId] = true;
  }

  const updateData = {
    question,
    currentQuoteIndex: quoteIndex,
    players: playersList,
    status: 'waiting',
    winner: null,
    blockedPlayers: blockedPlayers
  };

  // Agregar zoom level e image index si se proporcionan
  if (currentZoomLevel !== null) {
    updateData.currentZoomLevel = currentZoomLevel;
  }
  if (currentImageIndex !== null) {
    updateData.currentImageIndex = currentImageIndex;
  }

  await update(gameRef, updateData);
};

// Actualizar solo el estado del juego sin tocar los scores de los jugadores
export const resetGameStateForNextLevel = async (gameId, currentZoomLevel, currentImageIndex) => {
  const gameRef = ref(db, `games/${gameId}`);
  
  // Obtener estado actual
  const snapshot = await get(gameRef);
  if (!snapshot.exists()) return;
  
  const gameData = snapshot.val();
  const updatedPlayers = {};
  
  // Resetear pressed de todos los jugadores pero mantener sus scores
  Object.values(gameData.players).forEach(player => {
    updatedPlayers[player.id] = {
      ...player,
      pressed: false,
      pressedAt: null,
      answered: false,
      correct: null
      // El score se mantiene intacto
    };
  });

  await update(gameRef, {
    players: updatedPlayers,
    status: 'waiting',
    winner: null,
    currentZoomLevel,
    currentImageIndex
  });
};

export const updatePlayerScore = async (gameId, playerId, score) => {
  const playerRef = ref(db, `games/${gameId}/players/${playerId}`);
  await update(playerRef, {
    score: score
  });
};

export const playerPressed = async (gameId, playerId) => {
  const playerRef = ref(db, `games/${gameId}/players/${playerId}`);
  await update(playerRef, {
    pressed: true,
    pressedAt: Date.now()
  });
};

export const validateAnswer = async (gameId, playerId, isCorrect) => {
  const playerRef = ref(db, `games/${gameId}/players/${playerId}`);
  const gameRef = ref(db, `games/${gameId}`);
  
  await update(playerRef, {
    answered: true,
    correct: isCorrect
  });

  if (isCorrect) {
    await update(gameRef, {
      status: 'finished',
      winner: playerId
    });
  } else {
    // Rebote a siguiente pregunta o jugador
    await update(gameRef, {
      status: 'waiting'
    });
  }
};

export const resetGame = async (gameId) => {
  const gameRef = ref(db, `games/${gameId}`);
  await remove(gameRef);
};

export const listenToGame = (gameId, callback) => {
  const gameRef = ref(db, `games/${gameId}`);
  const unsubscribe = onValue(gameRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    }
  });
  return unsubscribe;
};

// Funciones para compartir jugadores entre dispositivos
export const uploadPlayersToFirebase = async (players, gameSessionId) => {
  const playersRef = ref(db, `sessions/${gameSessionId}/players`);
  const playersList = {};
  
  players.forEach(player => {
    playersList[player.id] = {
      id: player.id,
      name: player.name
    };
  });

  await set(playersRef, playersList);
  return gameSessionId;
};

export const getPlayersFromFirebase = (gameSessionId, callback) => {
  const playersRef = ref(db, `sessions/${gameSessionId}/players`);
  const unsubscribe = onValue(playersRef, (snapshot) => {
    if (snapshot.exists()) {
      const players = snapshot.val();
      // Convertir objeto a array
      const playersArray = Object.values(players).map(p => ({
        id: p.id,
        name: p.name
      }));
      callback(playersArray);
    } else {
      callback(null);
    }
  });
  return unsubscribe;
};

// ===== FUNCIONES PARA TORNEO COMPLETO =====

export const createTournament = async (tournamentId, players, initialScores = {}) => {
  const tournamentRef = ref(db, `tournaments/${tournamentId}`);
  
  const playersList = {};
  players.forEach(player => {
    playersList[player.id] = {
      id: player.id,
      name: player.name
    };
  });

  await set(tournamentRef, {
    tournamentId,
    players: playersList,
    scores: initialScores, // Usar los scores iniciales en lugar de vacío
    currentPhase: 0,
    tournamentFinished: false,
    playersAdded: true,
    createdAt: new Date().toISOString()
  });
};

export const saveTournamentState = async (tournamentId, state) => {
  const tournamentRef = ref(db, `tournaments/${tournamentId}`);
  
  await update(tournamentRef, {
    scores: state.scores,
    currentPhase: state.currentPhase,
    tournamentFinished: state.tournamentFinished,
    updatedAt: new Date().toISOString()
  });
};

export const listenToTournament = (tournamentId, callback) => {
  const tournamentRef = ref(db, `tournaments/${tournamentId}`);
  
  const unsubscribe = onValue(tournamentRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });
  
  return unsubscribe;
};

export const updateTournamentScores = async (tournamentId, scores) => {
  const tournamentRef = ref(db, `tournaments/${tournamentId}`);
  
  await update(tournamentRef, {
    scores: scores,
    updatedAt: new Date().toISOString()
  });
};

export const updateTournamentPhase = async (tournamentId, phaseNumber) => {
  const tournamentRef = ref(db, `tournaments/${tournamentId}`);
  
  await update(tournamentRef, {
    currentPhase: phaseNumber,
    updatedAt: new Date().toISOString()
  });
};

export const finishTournament = async (tournamentId) => {
  const tournamentRef = ref(db, `tournaments/${tournamentId}`);
  
  await update(tournamentRef, {
    tournamentFinished: true,
    finishedAt: new Date().toISOString()
  });
};

export const resetTournamentFirebase = async (tournamentId) => {
  const tournamentRef = ref(db, `tournaments/${tournamentId}`);
  
  await remove(tournamentRef);
};
