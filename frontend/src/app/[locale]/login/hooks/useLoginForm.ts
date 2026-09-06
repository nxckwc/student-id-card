import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import axios from "axios";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3100").replace(/\/+$/, "");
type AuthMode = "login" | "signup";


const getAuthErrorMessage = (
  rawMessage: string | undefined,
  mode: AuthMode,
  t: ReturnType<typeof useTranslations>
) => {
  const message = (rawMessage ?? "").toLowerCase();

  if (message.includes("already taken")) return t("usernameTaken");
  if (message.includes("at least 6")) return t("passwordTooShort");
  if (message.includes("required")) return t("requiredFields");

  return mode === "login" ? t("invalidCredentials") : t("signupFailed");
};

export function useLoginForm() {
  const tError = useTranslations("login.errors");
  const tForm = useTranslations("login.form");
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isBusy = isSubmitting || isSuccess;

  useEffect(() => {
    let isActive = true;

    const hydrateSession = async () => {
      try {
        await axios.get(`${API_BASE_URL}/auth/session`, {
          withCredentials: true,
        });

        if (isActive) {
          setIsSuccess(true);
        }
      } catch {
        if (isActive) {
          setIsSuccess(false);
        }
      }
    };

    void hydrateSession();

    return () => {
      isActive = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      await axios.post(`${API_BASE_URL}${endpoint}`, {
        username,
        password,
        rememberMe,
      }, {
        withCredentials: true,
      });

      if (mode === "signup") {
        setMode("login");
        setPassword("");
        setNoticeMessage(tForm("signupSuccess"));
        return;
      }

      setIsSuccess(true);
      setPassword("");
    } catch (error) {
      const message =
        axios.isAxiosError(error)
          ? getAuthErrorMessage(error.response?.data?.message, mode, tError)
          : error instanceof Error && error.message
            ? error.message
            : tError("invalidCredentials");
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMode = () => {
    if (isBusy) return;
    setMode((prev) => (prev === "login" ? "signup" : "login"));
    setErrorMessage(null);
    setNoticeMessage(null);
    setPassword("");
  };

  return {
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
  };
}