import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#2a2a27] text-white text-center p-8">
      <h1 className="text-9xl font-bold mb-2">404</h1>
      <h2 className="text-3xl font-semibold mb-4">{t('notFound')}</h2>
      <p className="text-lg mb-8">{t('sorryNotFound')}</p>

      <div className="flex gap-6 flex-wrap justify-center">
        <button
          onClick={() => navigate('/')}
          aria-label={t('returnHomeAria')}
          className="font-press text-base bg-white text-[#20201d] px-6 py-3 rounded-lg border-2 border-transparent hover:border-white hover:bg-[#20201d] hover:text-white transition duration-200"
        >
          {t('home')}
        </button>
      </div>
    </div>
  );
}
