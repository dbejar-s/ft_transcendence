import { FaGithub } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const teamMembers = [
  { name: 'David', github: 'https://github.com/davidbarren' },
  { name: 'David', github: 'https://github.com/dbejar-s' },
  { name: 'Ilmari', github: 'https://github.com/ilmu23' },
  { name: 'Juliette', github: 'https://github.com/juliettemtte' },
  { name: 'Uygar', github: 'https://github.com/uygarpolat' },
];

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-[#44433e] text-[#FFFACD] py-8 mt-auto">
      <h3 className="text-3xl font-vt323 mb-4 text-center">{t('projectBy')}</h3>
      <ul className="flex flex-wrap justify-center gap-6 text-xl font-vt323">
        {teamMembers.map((member, index) => (
          <li
            key={index}
            className="flex items-center space-x-2 hover:scale-105 transition-transform"
          >
            <a
              href={member.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 hover:text-yellow-300 underline"
            >
              <FaGithub className="text-2xl" />
              <span>{member.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </footer>
  );
}
