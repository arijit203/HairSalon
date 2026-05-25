import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// POST /api/settings/change-password
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("wyapar-auth-token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: "Missing password fields" }, { status: 400 });
    }

    if (payload.roleType === "staff") {
      const user = await prisma.staff.findUnique({ where: { id: payload.userId } });
      if (!user || !user.passwordHash) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ success: false, error: "Incorrect current password" }, { status: 400 });
      }
      const newHash = await bcrypt.hash(newPassword, 12);
      await prisma.staff.update({
        where: { id: payload.userId },
        data: { passwordHash: newHash },
      });
    } else {
      const user = await prisma.client.findUnique({ where: { id: payload.userId } });
      if (!user || !user.passwordHash) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ success: false, error: "Incorrect current password" }, { status: 400 });
      }
      const newHash = await bcrypt.hash(newPassword, 12);
      await prisma.client.update({
        where: { id: payload.userId },
        data: { passwordHash: newHash },
      });
    }

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
