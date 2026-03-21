import React from 'react';
import { TournamentProvider } from './context/TournamentContext';
import TournamentApp from './components/TournamentApp';
import './App.css';

function App() {
  return (
    <TournamentProvider>
      <TournamentApp />
    </TournamentProvider>
  );
}

export default App;
