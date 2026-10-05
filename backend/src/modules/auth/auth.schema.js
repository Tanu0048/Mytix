import { z } from "zod";

export const registerSchema = {
  body: z.object({
    email: z.string().email("A valid email address is required."),
    name: z.string().min(2, "Name must be at least 2 characters long.").max(100),
    password: z.string().min(8, "Password must be at least 8 characters long.").max(128),
    phone: z.string().optional()
  })
};

export const loginSchema = {
  body: z.object({
    email: z.string().email("A valid email address is required."),
    password: z.string().min(1, "Password is required.")
  })
};

export const googleAuthSchema = {
  body: z.object({
    idToken: z.string().min(10, "Google ID token is required.")
  })
};

export const forgotPasswordSchema = {
  body: z.object({
    email: z.string().email("A valid email address is required.")
  })
};

export const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(16, "Reset token is required."),
    password: z.string().min(8, "New password must be at least 8 characters long.").max(128)
  })
};

export const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters long.").max(128)
  })
};
