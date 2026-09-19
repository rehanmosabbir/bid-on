import { toast } from "sonner";

export function toastSuccess(message: string) {
  toast.success(message);
}

export function toastError(message: string) {
  toast.error(message);
}

export function toastInfo(message: string) {
  toast.message(message);
}

export function toastFromError(err: unknown, fallback = "Something went wrong") {
  const message = err instanceof Error ? err.message : fallback;
  toast.error(message);
  return message;
}

export function toastValidationErrors(
  errors: Record<string, { message?: string } | undefined>
) {
  const first = Object.values(errors).find((e) => e?.message)?.message;
  toast.error(first || "Please fix the form errors");
}
