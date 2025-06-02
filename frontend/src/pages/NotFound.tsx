import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#44433e] text-white text-center p-8">
      <h1 className="text-9xl font-bold mb-2">404</h1>
      <h2 className="text-3xl font-semibold mb-4">{t('notFound')}</h2>
      <p className="text-lg mb-8">{t('sorryNotFound')}</p>

      <div className="flex gap-6 flex-wrap justify-center">
        <button
          onClick={() => navigate('/')}
          aria-label={t('returnHomeAria')}
          className="font-vt323 text-xl bg-[#FFFACD] text-[#3b3a37] px-6 py-3 rounded-lg border-2 border-transparent hover:border-[#FFFACD] hover:bg-[#3b3a37] hover:text-[#FFFACD] transition duration-200"
        >
          {t('home')}
        </button>
      </div>
    </div>
  );
}
