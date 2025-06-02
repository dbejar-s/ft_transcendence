import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Arcade from '../assets/Home/Arcade.png';

export default function Home({ showLogoutMsg, setShowLogoutMsg }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (showLogoutMsg) {
      setShowLogoutMsg(false);
      alert(t('logoutMessage'));  
    }
  }, [showLogoutMsg, setShowLogoutMsg, t]);

  return (
    <div className="min-h-screen flex flex-col bg-[#44433e]">
      <main className="flex flex-col lg:flex-row justify-center items-center flex-grow px-4 gap-8 py-1">
        {/* Left */}
        <div className="w-full lg:w-2/3 flex justify-center mb-8 lg:mb-0">
          <div
            className="bg-[#3b3a37] p-8 rounded-lg shadow-lg flex flex-col justify-center items-center"
            style={{
              maxWidth: '1300px',
              maxHeight: '900px',
              width: '100%',
              aspectRatio: '1300 / 900',
            }}
          >
            <div className="relative w-full h-full flex flex-col justify-center items-center">
            {/* left paddle */}
			<div
				className="absolute bg-[#FFFACD] bg-opacity-15"
				style={{
				top: '20px',
				left: '3px',
				width: '4px',
				height: '23%',
				}}
			></div>
			{/* right paddle */}
			<div
				className="absolute bg-[#FFFACD] bg-opacity-15"
				style={{
				bottom: '70px',
				right: '4px',
				width: '4px',
				height: '23%',
				}}
			></div>
			{/* dashed center line */}
			<div
				className="absolute border-l-2 border-dashed border-[#FFFACD] opacity-10"
				style={{
					top: '-20px',
					bottom: '-20px',
					left: '50%',
					transform: 'translateX(-1px)',
			}}
			></div>
			{/* ball */}
			<div
				className="absolute bg-[#FFFACD] bg-opacity-15 rounded-full"
				style={{
					width: '5%',
					aspectRatio: '1 / 1',
					right: '50px',
					bottom: '150px',
			}}
			></div>

              <h2 className="text-[#FFFACD] text-5xl font-vt323 mb-8 text-center">
                {t('welcomeTitle')}
              </h2>
              <p className="text-2xl text-center font-vt323 text-[#FFFACD] mb-8 max-w-[800px]">
                {t('welcomeDescription')}
              </p>
              <div className="flex gap-6 flex-wrap justify-center">
                <button
                  onClick={() => navigate('/game')}
                  aria-label={t('playNowAria')}
                  className="font-vt323 text-xl bg-[#FFFACD] text-[#3b3a37] px-6 py-3 rounded-lg border-2 border-transparent hover:border-[#FFFACD] hover:bg-[#3b3a37] hover:text-[#FFFACD] transition duration-200"
                >
                  {t('playNow')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="w-full lg:w-1/3 flex justify-center">
          <img
            src={Arcade}
            alt={t('arcadeAlt')}
            className="max-w-[530px] max-h-[800px] w-full h-auto object-contain"
            style={{ aspectRatio: '530 / 800' }}
          />
        </div>
      </main>
    </div>
  );
}

