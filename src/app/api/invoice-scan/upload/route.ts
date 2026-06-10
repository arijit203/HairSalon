import { NextRequest, NextResponse } from "next/server";
import { errorResponse, successResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Prefix to distinguish upload sessions from real settings
const SESSION_PREFIX = "__invoice_sess_";
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Best-effort cleanup of expired sessions (fire-and-forget)
function cleanupSessions() {
  const cutoff = new Date(Date.now() - SESSION_TTL_MS);
  prisma.salonSettings
    .deleteMany({
      where: {
        key: { startsWith: SESSION_PREFIX },
        updatedAt: { lt: cutoff },
      },
    })
    .catch(() => {}); // non-critical
}

// POST /api/invoice-scan/upload — Mobile upload (receives form data)
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let sessionId: string;
    let imageBase64: string;
    let mimeType: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      sessionId = formData.get("sessionId") as string;
      const file = formData.get("file") as File;

      if (!sessionId || !file) {
        return errorResponse("Missing sessionId or file", 400);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      imageBase64 = buffer.toString("base64");
      mimeType = file.type || "image/jpeg";
    } else {
      const body = await req.json();
      sessionId = body.sessionId;
      imageBase64 = body.image;
      mimeType = body.mimeType || "image/jpeg";

      if (!sessionId || !imageBase64) {
        return errorResponse("Missing sessionId or image", 400);
      }
    }

    // Reject images over 8MB base64 (~6MB raw) — phone should compress before upload
    if (imageBase64.length > 8 * 1024 * 1024) {
      return errorResponse("Image is too large. Please compress the image before uploading.", 413);
    }

    cleanupSessions();

    // Persist session to DB so all serverless instances can read it
    await prisma.salonSettings.upsert({
      where: { key: `${SESSION_PREFIX}${sessionId}` },
      create: {
        key: `${SESSION_PREFIX}${sessionId}`,
        value: JSON.stringify({ image: imageBase64, mimeType }),
      },
      update: {
        value: JSON.stringify({ image: imageBase64, mimeType }),
      },
    });

    return successResponse({ message: "Image uploaded successfully" });
  } catch (error) {
    console.error("[Upload Error]", error);
    return errorResponse("Failed to process upload", 500);
  }
}

// GET /api/invoice-scan/upload?sessionId=xxx — Poll for upload status
export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");

    if (!sessionId) {
      return errorResponse("Missing sessionId", 400);
    }

    const session = await prisma.salonSettings.findUnique({
      where: { key: `${SESSION_PREFIX}${sessionId}` },
    });

    if (!session) {
      return NextResponse.json({
        success: true,
        data: { uploaded: false },
      });
    }

    // One-time use — delete after reading
    await prisma.salonSettings.delete({
      where: { key: `${SESSION_PREFIX}${sessionId}` },
    });

    const { image, mimeType } = JSON.parse(session.value);

    return NextResponse.json({
      success: true,
      data: {
        uploaded: true,
        image,
        mimeType,
      },
    });
  } catch (error) {
    console.error("[Poll Error]", error);
    return errorResponse("Failed to check upload status", 500);
  }
}
