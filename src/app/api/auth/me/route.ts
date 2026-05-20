import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("wyapar-auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch user session" },
      { status: 500 }
    );
  }
}
