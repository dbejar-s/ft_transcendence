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
  showLogoutMsg,
  setShowLogoutMsg,
}: {
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
  showLogoutMsg: boolean;
  setShowLogoutMsg: (value: boolean) => void;
}) {
  const location = useLocation();

  const standardRoutes = [
    { path: '/', element: <Home showLogoutMsg={showLogoutMsg} setShowLogoutMsg={setShowLogoutMsg} /> },
    { path: '/tournament', element: <Tournament /> },
    { path: '/game', element: <Game /> },
    { path: '/score', element: <Score /> },
    { path: '/about', element: <About /> },
    { path: '/register', element: <Register /> },
    { path: '/signup', element: <SignUp /> },
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
                  setShowLogoutMsg={setShowLogoutMsg}
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
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [showLogoutMsg, setShowLogoutMsg] = useState(false);

  return (
    <BrowserRouter>
      <AnimatedRoutes
        isLoggedIn={isLoggedIn}
        setIsLoggedIn={setIsLoggedIn}
        showLogoutMsg={showLogoutMsg}
        setShowLogoutMsg={setShowLogoutMsg}
      />
    </BrowserRouter>
  );
}
