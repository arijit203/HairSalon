"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Camera, Upload, CheckCircle2, AlertCircle, Loader2, Smartphone, X, Check } from "lucide-react";

export default function InvoiceUploadPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<"idle" | "selected" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Compress image: resize to max 1600px, convert to JPEG 82%
  const compressImage = (file: File): Promise<{ blob: Blob; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX_PX = 1600;
        let { width, height } = img;
        if (width > MAX_PX || height > MAX_PX) {
          const ratio = Math.min(MAX_PX / width, MAX_PX / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve({ blob, mimeType: "image/jpeg" });
            else reject(new Error("Compression failed"));
          },
          "image/jpeg",
          0.82
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
      img.src = url;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setStatus("selected");
    setErrorMessage("");

    // Show preview immediately from raw file
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setStatus("idle");
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setStatus("uploading");
    setErrorMessage("");

    try {
      // Compress before upload to keep size manageable
      const { blob, mimeType: compressedMime } = await compressImage(selectedFile);
      const compressed = new File([blob], selectedFile.name.replace(/\.[^.]+$/, ".jpg"), { type: compressedMime });

      const formData = new FormData();
      formData.append("sessionId", sessionId);
      formData.append("file", compressed);

      const res = await fetch("/api/invoice-scan/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Failed to upload. Please try again.");
    }
  };


  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0d0608 0%, #1a0a12 50%, #0d0608 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#f5eef0",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #f43f5e, #e11d48)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 8px 32px rgba(244, 63, 94, 0.3)",
          }}
        >
          <Smartphone className="w-6 h-6" style={{ color: "white" }} />
        </div>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 700,
            marginBottom: "8px",
            background: "linear-gradient(135deg, #f5eef0, #b89da8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Upload Invoice
        </h1>
        <p style={{ color: "#7a6070", fontSize: "14px", maxWidth: "280px", margin: "0 auto" }}>
          Take a photo or choose an image of your invoice/bill
        </p>
      </div>

      {/* Content Area */}
      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          borderRadius: "20px",
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.07)",
          padding: "24px",
          backdropFilter: "blur(20px)",
        }}
      >
        {status === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Camera Button */}
            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.setAttribute("capture", "environment");
                  fileInputRef.current.click();
                }
              }}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #f43f5e, #e11d48)",
                border: "none",
                color: "white",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                boxShadow: "0 4px 16px rgba(244, 63, 94, 0.35)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
            >
              <Camera className="w-5 h-5" />
              Take Photo
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "4px 0" }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
              <span style={{ color: "#7a6070", fontSize: "12px", fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
            </div>

            {/* Choose File Button */}
            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute("capture");
                  fileInputRef.current.click();
                }
              }}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#b89da8",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                transition: "background 0.15s",
              }}
            >
              <Upload className="w-4 h-4" />
              Choose from Gallery
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>
        )}

        {status === "selected" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {preview && (
              <div
                style={{
                  width: "100%",
                  maxHeight: "280px",
                  borderRadius: "14px",
                  overflow: "hidden",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  background: "rgba(0, 0, 0, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "inset 0 2px 10px rgba(0, 0, 0, 0.5)",
                }}
              >
                <img
                  src={preview}
                  alt="Invoice Preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "280px",
                    objectFit: "contain",
                  }}
                />
              </div>
            )}

            <div style={{ textAlign: "center", marginBottom: "4px" }}>
              <p style={{ fontSize: "13px", color: "#b89da8", fontWeight: 500 }}>
                Is the photo clear and readable?
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                onClick={handleSubmit}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #f43f5e, #e11d48)",
                  border: "none",
                  color: "white",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  boxShadow: "0 4px 16px rgba(244, 63, 94, 0.35)",
                  transition: "all 0.2s ease",
                }}
              >
                <Check className="w-5 h-5" />
                Submit Invoice
              </button>

              <button
                onClick={handleClear}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "14px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#e2d5da",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  transition: "all 0.2s ease",
                }}
              >
                <X className="w-4 h-4" />
                Clear & Start Over
              </button>
            </div>
          </div>
        )}

        {status === "uploading" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            {preview && (
              <div
                style={{
                  width: "100%",
                  height: "160px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  marginBottom: "20px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <img
                  src={preview}
                  alt="Invoice preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: "#f43f5e", margin: "0 auto 12px" }}
            />
            <p style={{ fontSize: "15px", fontWeight: 600, color: "#f5eef0" }}>Uploading...</p>
            <p style={{ fontSize: "13px", color: "#7a6070", marginTop: "4px" }}>
              Please wait, do not close this page
            </p>
          </div>
        )}

        {status === "success" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            {preview && (
              <div
                style={{
                  width: "100%",
                  height: "120px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  marginBottom: "20px",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                }}
              >
                <img
                  src={preview}
                  alt="Uploaded invoice"
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }}
                />
              </div>
            )}
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <CheckCircle2 className="w-7 h-7" style={{ color: "#10b981" }} />
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f5eef0", marginBottom: "6px" }}>
              Upload Complete!
            </h2>
            <p style={{ fontSize: "13px", color: "#7a6070", lineHeight: 1.5 }}>
              You can now return to your computer.
              <br />
              The invoice is being processed.
            </p>
          </div>
        )}

        {status === "error" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <AlertCircle className="w-7 h-7" style={{ color: "#ef4444" }} />
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f5eef0", marginBottom: "6px" }}>
              Upload Failed
            </h2>
            <p style={{ fontSize: "13px", color: "#ef4444", marginBottom: "16px" }}>
              {errorMessage}
            </p>
            <button
              onClick={() => {
                setStatus("idle");
                setSelectedFile(null);
                setPreview(null);
                setErrorMessage("");
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              style={{
                padding: "12px 24px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#b89da8",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <p style={{ color: "#4a3840", fontSize: "11px", marginTop: "24px", textAlign: "center" }}>
        Session expires in 10 minutes
      </p>
    </div>
  );
}
