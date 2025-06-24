import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import React from 'react'; // Import React for React.MouseEvent

export default function Header({ isLoggedIn, setIsLoggedIn, setGlobalMessage }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const guestLinks = [
    { path: '/register', label: t('register') },
    { path: '/about', label: t('about') },
  ];

  // Add the profile link to userLinks
  const userLinks = [
    { path: '/game', label: t('game') },
    { path: '/score', label: t('score') },
    { path: '/tournament', label: t('tournaments') },
    { path: '/profile', label: t('profile') }, // New: Profile link
  ];

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();

    setGlobalMessage({ type: 'success', text: t('logoutMessage') });
    setIsLoggedIn(false);
    navigate('/');
  };

  const changeLanguage = (lng: string) => i18n.changeLanguage(lng);

  return (
    <header className="flex justify-between items-center py-1 px-4 bg-[#44433e]">
      <NavLink to="/" className="no-underline">
        <h1 className="font-vt323 text-[#FFFACD] text-7xl">
          TRANSCENPONG
        </h1>
      </NavLink>

      <nav className="flex items-center gap-4 text-3xl font-vt323 text-[#FFFACD]">
        {(isLoggedIn ? userLinks : guestLinks).map(({ path, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `px-4 py-0.5 transition rounded-lg
               ${isActive
                 ? 'border-2 border-[#FFFACD]'
                 : 'border-2 border-transparent hover:border-[#FFFACD]'}`
            }
            style={{ backgroundColor: 'transparent' }}
          >
            {label}
          </NavLink>
        ))}

        {isLoggedIn && (
          <div
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-0.5 rounded-lg hover:border-[#FFFACD] hover:border-2 transition cursor-pointer"
            style={{ color: '#FFFACD', backgroundColor: 'transparent' }}
            aria-label={t('logout')}
          >
            {t('logout')}
          </div>
        )}

        {/* Language Switcher */}
        <div className="flex items-center gap-2 ml-4 text-xl">
          <button onClick={() => changeLanguage('en')} aria-label="English">🇬🇧</button>
          <button onClick={() => changeLanguage('fr')} aria-label="Français">🇫🇷</button>
          <button onClick={() => changeLanguage('es')} aria-label="Español">🇪🇸</button>
        </div>
      </nav>
    </header>
  );
}
