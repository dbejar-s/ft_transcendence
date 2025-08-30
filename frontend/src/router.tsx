import type React from "react"
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
// FIXED: Changed 'Transition' to a type-only import
import { AnimatePresence, motion, type Transition } from "framer-motion"
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
import TwoFactorAuth from "./pages/TwoFactorAuth";
import { usePlayer } from "./context/PlayerContext"
import { auth } from "./firebase"

const pageTransition: Transition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.5,
}

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
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
  const [isLoading, setIsLoading] = useState(true) // Add loading state
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (page: string) => {
    navigate(`/${page === "home" ? "" : page}`);
  }

  // Define all routes statically to avoid dynamic route changes - MOVED BEFORE useEffect
  const allRoutes = [
    { path: "/", element: <Home showLogoutMsg={showLogoutMsg} setShowLogoutMsg={setShowLogoutMsg} onNavigateToGame={() => handleNavigate("game")} />, public: true },
    { path: "/about", element: <About />, public: true },
    { path: "/register", element: <Register />, public: true }, // Changed to public
    { path: "/signup", element: <SignUp />, public: true }, // Changed to public
    { path: "/2fa", element: <TwoFactorAuth />, public: true }, // Changed to public
    { path: "/completeprofile", element: <CompleteProfile />, public: true },
    { path: "/tournament", element: <Tournament />, authRequired: true },
    { path: "/game", element: <Game />, authRequired: true },
    { path: "/profile", element: <Profile />, authRequired: true },
  ]

  useEffect(() => {
    const verifyAuthentication = async () => {
      const hasBackendToken = !!localStorage.getItem('token');
      
      if (hasBackendToken) {
        try {
          // Verify the token is still valid by calling the backend
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://localhost:3001'}/api/users/current`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setIsLoggedIn(true);
            setPlayer({
              id: userData.id,
              username: userData.username,
              email: userData.email,
              avatar: userData.avatar || '/assets/Profile/men1.png',
              language: userData.language || 'en',
              provider: userData.provider  // Add provider field
            });
          } else {
            // Token is invalid, clear it
            localStorage.removeItem('token');
            setIsLoggedIn(false);
            setPlayer(null);
          }
        } catch (error) {
          console.error('Error verifying authentication:', error);
          // On network error, clear auth state to be safe
          localStorage.removeItem('token');
          setIsLoggedIn(false);
          setPlayer(null);
        }
      } else {
        setIsLoggedIn(false);
        setPlayer(null);
      }
      
      setIsLoading(false);
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      // Guard against clearing backend-authenticated sessions
      const hasBackendToken = !!localStorage.getItem('token');
      if (!user && !hasBackendToken) {
        setIsLoggedIn(false);
        setPlayer(null);
        setIsLoading(false);
      } else if (hasBackendToken) {
        // Verify backend authentication
        verifyAuthentication();
      } else {
        setIsLoading(false);
      }
    });
    
    // Also verify on component mount
    verifyAuthentication();
    
    return () => unsubscribe();
  }, [setIsLoggedIn, setPlayer]);

  // Verify authentication on route changes for protected routes
  useEffect(() => {
    if (isLoading) return; // Don't redirect while loading
    
    const currentRoute = allRoutes.find(route => route.path === location.pathname);
    
    if (currentRoute?.authRequired && !isLoggedIn) {
      const hasBackendToken = !!localStorage.getItem('token');
      
      if (!hasBackendToken) {
        // Only redirect if we're not already on home page
        if (location.pathname !== '/') {
          navigate('/', { replace: true });
        }
      } else {
        // Verify token is still valid for protected routes
        const verifyToken = async () => {
          try {
            const response = await fetch('https://localhost:3001/api/users/current', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            
            if (!response.ok) {
              localStorage.removeItem('token');
              setIsLoggedIn(false);
              setPlayer(null);
              if (location.pathname !== '/') {
                navigate('/', { replace: true });
              }
            }
          } catch (error) {
            console.error('Token verification failed:', error);
            localStorage.removeItem('token');
            setIsLoggedIn(false);
            setPlayer(null);
            if (location.pathname !== '/') {
              navigate('/', { replace: true });
            }
          }
        };
        
        verifyToken();
      }
    }
  }, [location.pathname, isLoading, isLoggedIn, setIsLoggedIn, setPlayer, navigate, allRoutes]);

  // Show loading or wait for auth state to be determined
  if (isLoading) {
    return (
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        className="min-h-screen flex items-center justify-center bg-[#2a2a27]"
      >
        <div className="text-[#FFFACD] font-press text-lg">Loading...</div>
      </motion.div>
    );
  }


  // Filter routes based on auth status
  const getRouteElement = (route: any) => {
    // Public routes - always accessible
    if (route.public) {
      return route.element;
    }
    
    // Auth-required routes - show home if not logged in (no redirect here)
    if (route.authRequired && !isLoggedIn) {
      return <Home showLogoutMsg={showLogoutMsg} setShowLogoutMsg={setShowLogoutMsg} onNavigateToGame={() => handleNavigate("game")} />;
    }
    
    return route.element;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {allRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <MotionWrapper>
                <Header
                  isLoggedIn={isLoggedIn}
                  setShowLogoutMsg={setShowLogoutMsg}
                  onNavigate={handleNavigate}
                />
                <main className="flex-grow">{getRouteElement(route)}</main>
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