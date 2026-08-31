import { z } from "zod";


const usernameRule = z
    .string({ required_error: "Username is required" })
    .trim()
    .toLowerCase()
    .min(3, { message: "Username must be at least 3 characters long" })
    .max(20, { message: "Username cannot exceed 20 characters" });

const emailRule = z
    .string({ required_error: "Email is required" })
    .trim()
    .email({ message: "Invalid email address format" });


const passwordRule = z
    .string({ required_error: "Password is required" })
    .regex(/^\d{8}$/, { message: "Password must be exactly 8 numbers" });



export const registerSchema = z.object({
    username: usernameRule,
    email: emailRule,
    passwordHash: passwordRule,
});

export const loginSchema = z.object({
   
    username: usernameRule.optional(),
    email: emailRule.optional(),
    passwordHash: passwordRule,
}).refine((data) => data.username || data.email, {
    message: "Either username or email is required to login",
    path: ["username"], // Where to display the error
});


export const updateAdminSchema = z.object({
    username: usernameRule,
    email: emailRule,
});


export const changePasswordSchema = z.object({
    oldpassword: passwordRule,
    newpassword: passwordRule,
}).refine((data) => data.oldpassword !== data.newpassword, {
    message: "New password must be different from the old password",
    path: ["newpassword"], 
});