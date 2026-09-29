"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function CTA() {
  const { t } = useTranslation();
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="bg-black dark:bg-white text-white dark:text-black rounded-[2.5rem] p-12 md:p-24 text-center relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              {t("cta.title")}
            </h2>
            <p className="text-lg opacity-80 mb-10 leading-relaxed">
              {t("cta.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/projects/new" 
                className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-black text-black dark:text-white font-bold rounded-full hover:scale-105 transition-transform"
              >
                {t("nav.submitProject")}
              </Link>
              <Link 
                href="/verify" 
                className="w-full sm:w-auto px-8 py-4 bg-transparent border border-white/20 dark:border-black/20 font-bold rounded-full hover:bg-white/10 dark:hover:bg-black/5 transition-colors"
              >
                {t("common.learnMore")}
              </Link>
            </div>
          </div>
          
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
          </div>
        </div>
      </div>
    </section>
  );
}
