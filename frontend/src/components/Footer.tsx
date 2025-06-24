import { useTranslation } from "react-i18next"
import { Github } from "lucide-react"

const teamMembers = [
  { name: "David", github: "https://github.com/davidbarren" },
  { name: "David", github: "https://github.com/dbejar-s" },
  { name: "Ilmari", github: "https://github.com/ilmu23" },
  { name: "Juliette", github: "https://github.com/juliettemtte" },
  { name: "Uygar", github: "https://github.com/uygarpolat" },
]

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="bg-[#2a2a27] text-[#FFFACD] py-8 mt-auto">
      <h3 className="text-sm font-press mb-4 text-center">{t("projectBy")}</h3>
      <ul className="flex flex-wrap justify-center gap-6 text-sm font-press">
        {teamMembers.map((member, index) => (
          <li key={index} className="flex items-center space-x-2 hover:scale-105 transition-transform">
            <a
              href={member.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 hover:text-yellow-300 underline"
            >
              <Github className="text-sm" />
              <span>{member.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </footer>
  )
}
