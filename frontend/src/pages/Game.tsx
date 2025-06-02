import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Game() {
  const { t } = useTranslation();
  const [showOverlay, setShowOverlay] = useState(true);

  return (
    <div className="min-h-screen flex flex-col bg-[#44433e] relative overflow-hidden">
      {showOverlay && (
        <div className="absolute inset-0 bg-black bg-opacity-70 z-20 flex flex-col justify-center items-center p-8 text-white text-center">
          <div className="max-w-xl bg-[#55534e] bg-opacity-90 p-6 rounded-xl shadow-lg space-y-4 border border-[#FFFACD]">
            <h2 className="text-3xl font-vt323 text-[#FFFACD]">
              {t('howToPlayTitle') || 'Comment jouer'}
            </h2>
            <p className="text-lg">
              {t('howToPlayText') || 'Utilise les touches fléchées ou ZQSD pour déplacer ta raquette. Marque des points pour gagner !'}
            </p>
            <button
              onClick={() => setShowOverlay(false)}
              className="font-vt323 text-xl bg-[#FFFACD] text-[#3b3a37] px-6 py-3 rounded-lg border-2 border-transparent hover:border-[#FFFACD] hover:bg-[#3b3a37] hover:text-[#FFFACD] transition duration-200"
            >
              {t('startGame') || 'Commencer le jeu'}
            </button>
          </div>
        </div>
      )}

      <h2 className="text-3xl font-vt323 text-[#FFFACD] mt-6 px-4 z-10">Game</h2>
      {/* Ton jeu s’affichera ici une fois que showOverlay = false */}
    </div>
  );
}
