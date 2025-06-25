import type React from "react"
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import Home from "./pages/Home"
import Tournament from "./pages/Tournament"
import Game from "./pages/Game"
import Profile from "./pages/profile/Profile"
import CompleteProfile from "./pages/profile/CompleteProfile"
import About from "./pages/About"
import Register from "./pages/Registration"
import NotFound from "./pages/NotFound"
import SignUp from "./pages/SignUp"
import Header from "./components/Header"
import Footer from "./components/Footer"
import { usePlayer } from "./context/PlayerContext"
import { auth } from "./firebase"

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.5,
}

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
  )
}

function AnimatedRoutes() {
  const { isLoggedIn, setIsLoggedIn, setPlayer } = usePlayer();
  const [showLogoutMsg, setShowLogoutMsg] = useState(false)
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsLoggedIn(true);
        const playerData = {
          id: user.uid,
          username: user.displayName || "Anonymous",
          avatar: user.photoURL || "/src/assets/Profile/men1.png",
          email: user.email || "",
          language: "en",
        };
        setPlayer(playerData);
        // Redirect to home if user is on a guest page
        if (['/register', '/signup'].includes(location.pathname)) {
          navigate('/');
        }
      } else {
        setIsLoggedIn(false);
        setPlayer(null);
      }
    });
    return () => unsubscribe();
  }, [setIsLoggedIn, setPlayer, navigate, location.pathname]);


  const handleNavigate = (page: string) => {
    navigate(`/${page === "home" ? "" : page}`);
  }

  const standardRoutes = [
    { path: "/", element: <Home showLogoutMsg={showLogoutMsg} setShowLogoutMsg={setShowLogoutMsg} onNavigateToGame={() => handleNavigate("game")} /> },
    { path: "/about", element: <About /> },
    // Guest only routes
    ...(!isLoggedIn ? [
      { path: "/register", element: <Register /> },
      { path: "/signup", element: <SignUp /> },
    ] : []),
    // Authenticated only routes
    ...(isLoggedIn ? [
      { path: "/tournament", element: <Tournament /> },
      { path: "/game", element: <Game /> },
      { path: "/profile", element: <Profile /> },
      { path: "/completeprofile", element: <CompleteProfile /> },
    ] : [])
  ]

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
                  onNavigate={handleNavigate}
                />
                <main className="flex-grow">{element}</main>
                <Footer />
              </MotionWrapper>
            }
          />
        ))}
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
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  )
}