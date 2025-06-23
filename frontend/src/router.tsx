import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Home from './pages/Home';
import Tournament from './pages/Tournament';
import Game from './pages/Game';
import Score from './pages/Score';
import About from './pages/About';
import Register from './pages/Registration';
import NotFound from './pages/NotFound';
import SignUp from './pages/SignUp';
import Header from './components/Header';
import Footer from './components/Footer'
import { useTranslation } from 'react-i18next'; // Import useTranslation for logout message

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.005,
};

function MotionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="flex flex-col min-h-screen"
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes({
  isLoggedIn,
  setIsLoggedIn,
  globalMessage, // Pass globalMessage down
  setGlobalMessage, // Pass setGlobalMessage down
}: {
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
  globalMessage: { type: 'success' | 'error'; text: string } | null;
  setGlobalMessage: (value: { type: 'success' | 'error'; text: string } | null) => void;
}) {
  const location = useLocation();
  const { t } = useTranslation();

  // Debugging: Log the value of setIsLoggedIn received by AnimatedRoutes
  console.log("AnimatedRoutes: setIsLoggedIn prop received:", setIsLoggedIn);

  const standardRoutes = [
    { path: '/', element: <Home globalMessage={globalMessage} setGlobalMessage={setGlobalMessage} /> },
    { path: '/tournament', element: <Tournament /> },
    { path: '/game', element: <Game /> },
    { path: '/score', element: <Score /> },
    { path: '/about', element: <About /> },
    // Pass setIsLoggedIn and setGlobalMessage to Register for authentication flow
    { path: '/register', element: <Register setIsLoggedIn={setIsLoggedIn} setGlobalMessage={setGlobalMessage} /> },
    // Pass setGlobalMessage to SignUp for message display
    { path: '/signup', element: <SignUp setGlobalMessage={setGlobalMessage} /> },
  ];

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {standardRoutes.map(({ path, element }) => (
          <Route
            key={path}
            path={path}
            element={
              <MotionWrapper>
                <Header
                  isLoggedIn={isLoggedIn}
                  setIsLoggedIn={setIsLoggedIn}
                  setGlobalMessage={setGlobalMessage} // Pass setGlobalMessage to Header for logout
                />
                <main className="flex-grow">{element}</main>
                <Footer />
              </MotionWrapper>
            }
          />
        ))}
        {/* NotFound route handled separately without Header/Footer */}
        <Route
          path="*"
          element={
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              className="min-h-screen"
            >
              <NotFound />
            </motion.div>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}


export default function AppRouter() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Default to false, as user needs to log in
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Debugging: Log the value of setIsLoggedIn from AppRouter's state
  console.log("AppRouter: setIsLoggedIn function:", setIsLoggedIn);

  return (
    <BrowserRouter>
      <AnimatedRoutes
        isLoggedIn={isLoggedIn}
        setIsLoggedIn={setIsLoggedIn}
        globalMessage={globalMessage}
        setGlobalMessage={setGlobalMessage}
      />
    </BrowserRouter>
  );
}