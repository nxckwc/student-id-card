"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import SchoolHeader from "./SchoolHeader";
import LoginForm from "./LoginForm";
import { useLoginForm } from "../hooks/useLoginForm";
import {useEffect} from "react";
import {useParams, useRouter} from "next/navigation";

const LoginCard = () => {
  const t = useTranslations("login");
  const {
    mode,
    username, setUsername,
    password, setPassword,
    rememberMe, setRememberMe,
    showPassword, setShowPassword,
    errorMessage,
    noticeMessage,
    isBusy,
    isSuccess,
    handleSubmit,
    handleToggleMode,
  } = useLoginForm();
  const router = useRouter();
  const { locale } = useParams();
  useEffect(() => {
    if (isSuccess) setTimeout(() => router.push(`/${locale}/dashboard`), 800);
  }, [isSuccess, locale, router]);
  return (
    <motion.section
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="mx-auto flex w-full max-w-md flex-col justify-center"
      initial={{ opacity: 0, scale: 0.98, y: 18 }}
      transition={{ delay: 0.05, duration: 0.55 }}
    >
      <div className="relative w-full">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-[0_24px_70px_rgba(83,68,60,0.10)] sm:p-8">
          <motion.div
            animate={{ height: isSuccess ? 36 : "auto" }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex justify-center items-center"
          >
            <motion.div
              animate={{ opacity: isSuccess ? 1 : 0 }}
              className="absolute text-2xl font-bold text-accent-foreground"
            >
              {t("success")}
            </motion.div>

            <div className={`${isSuccess ? "opacity-0" : ""} w-full h-full`}>
              <SchoolHeader />
              <LoginForm
                mode={mode}
                username={username}
                password={password}
                rememberMe={rememberMe}
                showPassword={showPassword}
                errorMessage={errorMessage}
                noticeMessage={noticeMessage}
                isBusy={isBusy}
                onUsernameChange={setUsername}
                onPasswordChange={setPassword}
                onRememberMeChange={setRememberMe}
                onTogglePassword={() => setShowPassword((prev) => !prev)}
                onToggleMode={handleToggleMode}
                onSubmit={handleSubmit}
              />
            </div>
          </motion.div>

        </div>
      </div>

    </motion.section>
  );
};

export default LoginCard;