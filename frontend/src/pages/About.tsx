"use client"

import { useTranslation } from "react-i18next"

export default function About() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#2a2a27] px-6 py-12">
      <div className="max-w-4xl w-full">
        <h2 className="text-xl font-press text-[#FFFACD] text-center mb-6 drop-shadow-lg">{t("aboutTitle")}</h2>

        <p className="text-sm font-press text-[#FFFACD] text-center leading-8 bg-[#20201d] p-8 rounded-2xl shadow-md">
          {t("aboutDescription")}
        </p>
      </div>
    </div>
  )
}
