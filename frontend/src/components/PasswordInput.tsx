"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

type PasswordInputProps = Omit<
  React.ComponentProps<"input">,
  "type"
> & {
  wrapperClassName?: string;
};

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(function PasswordInput({ className, wrapperClassName, ...props }, ref) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className={cn("relative", wrapperClassName)}>
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("pr-9", className)}
        autoComplete={props.autoComplete ?? "current-password"}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-1/2 right-1 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
});

const RULES = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (v: string) => v.length >= 8,
  },
  {
    id: "upper",
    label: "One uppercase letter (A–Z)",
    test: (v: string) => /[A-Z]/.test(v),
  },
  {
    id: "number",
    label: "One number (0–9)",
    test: (v: string) => /[0-9]/.test(v),
  },
] as const;

export function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="space-y-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs">
      <li className="mb-1 font-medium text-foreground">Password must include:</li>
      {RULES.map((rule) => {
        const ok = rule.test(value || "");
        return (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-2 transition-colors",
              ok ? "text-primary" : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                ok
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted-foreground/20 text-muted-foreground"
              )}
              aria-hidden
            >
              {ok ? "✓" : "·"}
            </span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
