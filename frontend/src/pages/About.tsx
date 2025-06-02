import { useTranslation } from 'react-i18next';

export default function About() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#44433e] px-6 py-12">
      <div className="max-w-4xl w-full">
        <h2 className="text-5xl font-vt323 text-[#FFFACD] text-center mb-6 drop-shadow-lg">
          {t('aboutTitle')}
        </h2>

        <p className="text-2xl font-vt323 text-[#FFFACD] text-justify leading-relaxed bg-[#3b3a36] p-6 rounded-2xl shadow-md">
          {t('aboutDescription')}
        </p>
      </div>
    </div>
  );
}
