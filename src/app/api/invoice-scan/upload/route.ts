import { NextRequest, NextResponse } from "next/server";
import { errorResponse, successResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

// In-memory store for upload sessions
// In production, use Redis or a database
const uploadSessions = new Map<
  string,
  { image: string; mimeType: string; uploadedAt: number }
>();

// Clean up expired sessions (older than 10 minutes)
function cleanupSessions() {
  const now = Date.now();
  const TEN_MINUTES = 10 * 60 * 1000;
  const keys = Array.from(uploadSessions.keys());
  for (const key of keys) {
    const value = uploadSessions.get(key);
    if (value && now - value.uploadedAt > TEN_MINUTES) {
      uploadSessions.delete(key);
    }
  }
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

    cleanupSessions();

    uploadSessions.set(sessionId, {
      image: imageBase64,
      mimeType,
      uploadedAt: Date.now(),
    });

    return successResponse({ message: "Image uploaded successfully" });
  } catch (error) {
    console.error("[Upload Error]", error);
    return errorResponse("Failed to process upload", 500);
  }
}

// GET /api/invoice-scan/upload?sessionId=xxx — Poll for upload
export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");

    if (!sessionId) {
      return errorResponse("Missing sessionId", 400);
    }

    cleanupSessions();

    const session = uploadSessions.get(sessionId);

    if (!session) {
      return NextResponse.json({
        success: true,
        data: { uploaded: false },
      });
    }

    // Return the image and remove from store (one-time use)
    uploadSessions.delete(sessionId);

    return NextResponse.json({
      success: true,
      data: {
        uploaded: true,
        image: session.image,
        mimeType: session.mimeType,
      },
    });
  } catch (error) {
    console.error("[Poll Error]", error);
    return errorResponse("Failed to check upload status", 500);
  }
}
