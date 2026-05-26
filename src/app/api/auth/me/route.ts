import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/jwt";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("wyapar-auth-token")?.value;

    if (!token) {
      const res = NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
      res.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
      return res;
    }

    const payload = await verifyJWT(token);

    if (!payload) {
      const res = NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
      res.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
      return res;
    }

    const res = NextResponse.json({
      success: true,
      data: payload,
    });
    res.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return res;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch user session" },
      { status: 500 }
    );
  }
}
