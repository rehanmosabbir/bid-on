import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email required"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Include an uppercase letter")
    .regex(/[0-9]/, "Include a number"),
  role: z.enum(["buyer", "seller"]),
});

export const verifySchema = z.object({
  token: z.string().min(32, "Invalid verification link"),
});

export const resendVerifySchema = z.object({
  email: z.string().email("Valid email required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email required"),
});

const newPasswordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

export const resetPasswordSchema = z
  .object({
    email: z.string().email("Valid email required"),
    otp: z.string().length(6, "Enter the 6-digit OTP"),
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const bidSchema = z.object({
  amount: z.coerce.number().positive("Enter a valid bid amount"),
});

export const sellSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  categoryId: z.string().min(1, "Category required"),
  startPrice: z.coerce.number().positive("Starting price required"),
  reservePrice: z.string().optional(),
  maxPriceCap: z.string().optional(),
  durationMinutes: z.coerce.number().min(1).max(43200),
  imageUrl: z.string().optional(),
});

export const sellerEditSchema = z.object({
  startPrice: z.coerce.number().positive("Starting price required"),
  durationMinutes: z.coerce
    .number()
    .min(1, "At least 1 minute")
    .max(43200, "Max 30 days"),
});

export const profileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  address: z.string().optional(),
  role: z.enum(["buyer", "seller"]).optional(),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export const searchSchema = z.object({
  q: z.string().optional(),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type VerifyValues = z.infer<typeof verifySchema>;
export type ResendVerifyValues = z.infer<typeof resendVerifySchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type BidValues = z.infer<typeof bidSchema>;
export type SellValues = z.infer<typeof sellSchema>;
export type SellerEditValues = z.infer<typeof sellerEditSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type ReviewValues = z.infer<typeof reviewSchema>;
