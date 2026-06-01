"use server";

import { prisma } from "@/lib/prisma";
import { comparePassword, hashPassword, setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Seed an initial Admin user if the users table is completely empty.
 * Returns the details of the seeded admin or null if users already exist.
 */
export async function seedInitialAdmin() {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return { success: false, message: "Users already exist in the database." };
    }

    const hashedPassword = await hashPassword("Admin@12345");
    const admin = await prisma.user.create({
      data: {
        email: "admin@gcl-kje.com",
        name: "System Admin",
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    console.log("Successfully seeded initial Admin user: admin@gcl-kje.com / Admin@12345");
    return {
      success: true,
      message: "Initial Admin user successfully created! Use: admin@gcl-kje.com / Admin@12345 to login.",
      user: { email: admin.email, name: admin.name },
    };
  } catch (error: any) {
    console.error("Failed to seed initial admin:", error);
    return { success: false, error: error.message || "Database connection error" };
  }
}

/**
 * Log in an existing user
 */
export async function loginUser(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  try {
    // 1. Automatically attempt seed if database has zero users
    const count = await prisma.user.count().catch(() => 0);
    if (count === 0) {
      await seedInitialAdmin();
    }

    // 2. Fetch the user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return { success: false, error: "Invalid email or password." };
    }

    // 3. Verify password
    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return { success: false, error: "Invalid email or password." };
    }

    // 4. Set session cookie
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
  } catch (error: any) {
    console.error("Login action error:", error);
    return { success: false, error: "An unexpected error occurred. Please check your database connection." };
  }

  // Redirect to dashboard/home on success
  redirect("/");
}

/**
 * Log out the current user
 */
export async function logoutUser() {
  await clearSessionCookie();
  redirect("/login");
}

/**
 * Admin-only action to create a new user
 */
export async function registerNewUser(prevState: any, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string; // 'ADMIN' | 'EDITOR' | 'VIEWER'

  if (!name || !email || !password || !role) {
    return { success: false, error: "All fields are required." };
  }

  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return { success: false, error: "A user with this email already exists." };
    }

    const hashedPassword = await hashPassword(password);
    await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role as any,
      },
    });

    revalidatePath("/users");
    return { success: true, message: `Successfully registered user ${name} as ${role}!` };
  } catch (error: any) {
    console.error("Register action error:", error);
    return { success: false, error: error.message || "Failed to create user." };
  }
}
