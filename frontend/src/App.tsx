import AppRouter from './router';
import { PlayerProvider } from './context/PlayerContext';

function App() {
  return (
    <PlayerProvider>
      <AppRouter />
    </PlayerProvider>
  );
}

export default App
