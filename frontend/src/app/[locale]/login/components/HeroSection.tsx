"use client"

import { CheckCircle2, IdCard, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

import { useTranslations} from "next-intl";

const HeroSection = () => {

  const t = useTranslations("login")

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="hidden select-none lg:block"
      initial={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.55 }}
    >
      <div className="inline-flex items-center gap-2 rounded-full border border-danger-border bg-surface px-3 py-1.5 text-sm font-semibold text-danger-hover">
        <IdCard className="size-5" />
        { t("badge") }
      </div>

      <h1 className="mt-6 max-w-xl text-5xl font-bold leading-[1.08] text-text-primary">
        { t("title") }
        <span className="block pt-2 text-4xl font-normal text-text-muted">
          { t("subtitle") }
        </span>
      </h1>

      <p className="mt-6 max-w-lg text-base leading-7 text-text-muted">
        { t("description") }
      </p>

      <div className="mt-8 flex gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-xs font-semibold text-accent-foreground">
          <ShieldCheck className="size-4" /> Secure access
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-info-soft px-3 py-2 text-xs font-semibold text-info">
          <CheckCircle2 className="size-4" /> Live attendance
        </div>
      </div>
    </motion.section>
  );
};

export default HeroSection;