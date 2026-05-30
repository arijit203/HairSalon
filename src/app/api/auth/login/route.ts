import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signJWT } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const { email, password, roleType } = await req.json();

    if (!email || !password || !roleType) {
      return NextResponse.json(
        { success: false, error: "Email, password, and role type are required" },
        { status: 400 }
      );
    }

    if (roleType !== "staff" && roleType !== "client") {
      return NextResponse.json(
        { success: false, error: "Invalid role type. Must be 'staff' or 'client'" },
        { status: 400 }
      );
    }

    let user = null;
    let isValidPassword = false;

    if (roleType === "staff") {
      user = await prisma.staff.findFirst({
        where: {
          email: { equals: email, mode: "insensitive" },
          isActive: true,
        },
      });
      if (user && user.passwordHash) {
        isValidPassword = await bcrypt.compare(password, user.passwordHash);
      }
    } else {
      user = await prisma.client.findFirst({
        where: {
          email: { equals: email, mode: "insensitive" },
          isActive: true,
        },
      });
      if (user && user.passwordHash) {
        isValidPassword = await bcrypt.compare(password, user.passwordHash);
      }
    }

    if (!user || !isValidPassword) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Sign token
    const token = await signJWT({
      userId: user.id,
      email: user.email || "",
      name: user.name,
      roleType: roleType,
      ...(roleType === "staff" && { staffRole: (user as any).role }),
    });

    const response = NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email || "",
        name: user.name,
        roleType,
        ...(roleType === "staff" && { staffRole: (user as any).role }),
      },
    });

    // Set JWT as HttpOnly Cookie
    response.cookies.set({
      name: "wyapar-auth-token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during login" },
      { status: 500 }
    );
  }
}
