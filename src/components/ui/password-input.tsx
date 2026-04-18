"use client";

import * as React from "react";
import { Eye, EyeOff, ALargeSmall } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  inputClassName?: string;
}

export function PasswordInput({ className, inputClassName, ...props }: PasswordInputProps) {
  const [show, setShow] = React.useState(false);
  const [capsLock, setCapsLock] = React.useState(false);

  function handleKeyUp(e: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLock(e.getModifierState("CapsLock"));
    props.onKeyUp?.(e);
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    // detecta CapsLock ao focar também
    props.onFocus?.(e);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          data-slot="input"
          suppressHydrationWarning
          className={cn(
            "flex h-11 w-full min-w-0 rounded-xl border border-border/60 bg-background px-3 py-1 pr-10",
            "text-sm text-foreground placeholder:text-muted-foreground",
            "shadow-xs transition-[color,box-shadow] outline-none",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-primary/30",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            inputClassName
          )}
          onKeyUp={handleKeyUp}
          onFocus={handleFocus}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150"
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {capsLock && (
        <p className="flex items-center gap-1.5 text-xs text-amber-500">
          <ALargeSmall size={13} />
          CapsLock ativado
        </p>
      )}
    </div>
  );
}
