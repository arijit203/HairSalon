import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signJWT } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Check if client with email already exists
    const existingClient = await prisma.client.findUnique({
      where: { email },
    });

    if (existingClient) {
      return NextResponse.json(
        { success: false, error: "A user with this email address already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create client
    const newClient = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        tier: "BRONZE",
        loyaltyPoints: 0,
        totalSpent: 0,
        totalVisits: 0,
      },
    });

    // Sign token
    const token = await signJWT({
      userId: newClient.id,
      email: newClient.email || "",
      name: newClient.name,
      roleType: "client",
    });

    const response = NextResponse.json({
      success: true,
      data: {
        userId: newClient.id,
        email: newClient.email || "",
        name: newClient.name,
        roleType: "client",
      },
    });

    // Set JWT cookie
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
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during registration" },
      { status: 500 }
    );
  }
}
