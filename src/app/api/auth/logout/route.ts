import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  
  response.cookies.set({
    name: "wyapar-auth-token",
    value: "",
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return response;
}

export async function GET(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  
  response.cookies.set({
    name: "wyapar-auth-token",
    value: "",
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return response;
}
