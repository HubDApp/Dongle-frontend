"use client";

import { ShieldCheck, MessageSquare, Code } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function Features() {
  const { t } = useTranslation();
  const features = [
    {
      title: t("features.onChainVerification.title"),
      description: t("features.onChainVerification.description"),
      icon: <ShieldCheck className="w-6 h-6" />,
    },
    {
      title: t("features.communityReviews.title"),
      description: t("features.communityReviews.description"),
      icon: <MessageSquare className="w-6 h-6" />,
    },
    {
      title: t("features.developerFocused.title"),
      description: t("features.developerFocused.description"),
      icon: <Code className="w-6 h-6" />,
    },
  ];

  return (
    <section className="py-24 bg-white dark:bg-black">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold mb-4">{t("features.sectionTitle")}</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("features.sectionSubtitle")}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className="p-8 rounded-3xl border border-zinc-100 dark:border-zinc-900 hover:border-zinc-200 dark:hover:border-zinc-800 transition-colors bg-zinc-50/50 dark:bg-zinc-900/30"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-6 text-black dark:text-white">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed italic">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
