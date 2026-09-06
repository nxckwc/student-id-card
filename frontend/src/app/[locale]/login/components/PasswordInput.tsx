"use client"

import { Eye, EyeOff } from "lucide-react"

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const PasswordInput = ({
  value,
  onChange,
  show,
  onToggle,
  disabled,
  placeholder = "password",
}: PasswordInputProps) => {
  return (
    <div className="relative">
      <input
        autoComplete="current-password"
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 pr-12 text-sm text-text-primary outline-none transition placeholder:text-text-faint focus:border-danger focus:ring-3 focus:ring-danger-soft"
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        type={show ? "text" : "password"}
        value={value}
      />
      <button
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg px-3 py-2 text-text-faint hover:bg-surface-hover"
        disabled={disabled}
        onClick={onToggle}
        type="button"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};

export default PasswordInput
