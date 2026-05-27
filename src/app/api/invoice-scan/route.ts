import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { handleApiError, errorResponse, successResponse } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for AI processing

interface ParsedItem {
  name: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  suggestedCategories: string[];
  itemCode: string;
}

interface MatchedItem extends ParsedItem {
  action: "update" | "create" | "conflict";
  conflictType?: "price-mismatch";
  productId?: string;
  existingStock?: number;
  existingName?: string;
  existingBrand?: string;
  existingCategory?: string[];
  existingSku?: string;
  existingCostPrice?: number;
  existingPrice?: number;
}

function getStringSimilarity(s1: string, s2: string): number {
  const str1 = s1.toLowerCase().replace(/[^a-z0-9]/g, "");
  const str2 = s2.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  if (str1 === str2) return 1.0;
  if (str1.length < 2 || str2.length < 2) return 0.0;

  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const bigrams1 = getBigrams(str1);
  const bigrams2 = getBigrams(str2);

  let intersection = 0;
  Array.from(bigrams1).forEach((bigram) => {
    if (bigrams2.has(bigram)) {
      intersection++;
    }
  });

  return (2.0 * intersection) / (bigrams1.size + bigrams2.size);
}

function hasWordOverlap(s1: string, s2: string): boolean {
  const stopWords = new Set(["for", "the", "and", "with", "pack", "single", "size", "ml", "gm", "pcs", "free", "off", "new", "kit"]);
  
  const words1 = s1.toLowerCase().split(/[^a-z0-9+]/).map(w => w.trim()).filter(w => w.length >= 3 && !stopWords.has(w));
  const words2 = s2.toLowerCase().split(/[^a-z0-9+]/).map(w => w.trim()).filter(w => w.length >= 3 && !stopWords.has(w));
  
  const set2 = new Set(words2);
  return words1.some(word => set2.has(word));
}

// POST /api/invoice-scan — Parse invoice image with Gemini Vision
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return errorResponse(
        "Gemini API key not configured. Please add GEMINI_API_KEY to your .env.local file.",
        500
      );
    }

    const body = await req.json();
    const { image, mimeType } = body;

    if (!image) {
      return errorResponse("No image provided", 400);
    }

    // Fetch existing categories from products and services
    const [products, services] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, brand: true, category: true, stock: true, sku: true, costPrice: true, price: true },
      }),
      prisma.service.findMany({
        where: { isActive: true },
        select: { category: true },
      }),
    ]);

    const productCategories = products.flatMap((p) => p.category);
    const serviceCategories = services.map((s) => s.category);
    const allCategories = Array.from(
      new Set([...productCategories, ...serviceCategories].filter(Boolean))
    ).sort();

    // Build the AI prompt
    const prompt = `You are an expert invoice/bill/receipt parser for a salon & beauty products inventory system.

Analyze this invoice/bill/receipt image carefully and extract ALL product items listed.

EXISTING CATEGORIES in our system: ${JSON.stringify(allCategories)}

For EACH product item found, extract:
1. "name": The product name (clean it up, proper casing)
2. "brand": Brand name if visible (empty string "" if not found)
3. "quantity": Number of units purchased (default 1 if unclear)
4. "unitPrice": Price per unit in INR (number, no currency symbol)
5. "discount": Discount percentage on this item (0 if none)
6. "suggestedCategories": Array of 1-3 categories from the EXISTING CATEGORIES list that best match this product. If no existing category fits well, return an empty array [].
7. "itemCode": Item code, SKU, barcode, HSN code, or article number if listed on the receipt (empty string "" if not found)

IMPORTANT RULES:
- Return ONLY a valid JSON array of objects. No markdown, no code fences, no explanation.
- If the image is not an invoice/bill/receipt, return: []
- If no items can be detected, return: []
- Prices should be numbers (not strings). Remove any currency symbols.
- For quantity, default to 1 if not clearly stated.
- Be thorough — extract EVERY line item from the invoice.
- Clean up product names — remove random codes, fix spelling if obviously wrong.

Example output format:
[{"name":"L'Oreal Paris Shampoo","brand":"L'Oreal","quantity":2,"unitPrice":450,"discount":10,"suggestedCategories":["Hair Care"],"itemCode":"LRP-SH-300"},{"name":"Vitamin E Cream","brand":"","quantity":1,"unitPrice":299,"discount":0,"suggestedCategories":["Skin Care"],"itemCode":""}]`;

    // Call Gemini Vision API
    const genAI = new GoogleGenerativeAI(apiKey);
    let responseText = "";

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: image, // base64 string (no prefix)
          },
        },
      ]);
      responseText = result.response.text();
    } catch (primaryError: any) {
      console.warn("Primary model (gemini-2.5-flash) failed or hit quota limits. Trying fallback model (gemini-1.5-flash)...", primaryError);
      
      try {
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await fallbackModel.generateContent([
          prompt,
          {
            inlineData: {
              mimeType: mimeType || "image/jpeg",
              data: image, // base64 string (no prefix)
            },
          },
        ]);
        responseText = result.response.text();
      } catch (fallbackError: any) {
        console.error("All Gemini models failed:", fallbackError);
        // Throw the original error so it's bubble-up handled with accurate details
        throw primaryError;
      }
    }

    // Parse the AI response
    let parsedItems: ParsedItem[] = [];
    try {
      // Try to extract JSON from the response (handle cases where AI wraps in code blocks)
      let jsonStr = responseText.trim();
      // Remove markdown code fences if present
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      parsedItems = JSON.parse(jsonStr);

      if (!Array.isArray(parsedItems)) {
        parsedItems = [];
      }
    } catch {
      console.error("Failed to parse Gemini response:", responseText);
      return errorResponse(
        "Could not parse items from the invoice. The image may be unclear or not an invoice.",
        422
      );
    }

    if (parsedItems.length === 0) {
      return successResponse({
        items: [],
        message: "No items could be detected from the invoice image.",
      });
    }

    // Match against existing products using best similarity match
    const matchedItems: MatchedItem[] = parsedItems.map((item) => {
      let bestMatch = null;
      let highestSimilarity = 0.50; // 50% threshold
      let isPartialOverlap = false;

      for (const p of products) {
        // Brand must match (case-insensitive)
        const pBrand = (p.brand || "").toLowerCase().trim();
        const iBrand = (item.brand || "").toLowerCase().trim();
        if (pBrand !== iBrand) continue;

        const similarity = getStringSimilarity(p.name, item.name);
        if (similarity >= highestSimilarity) {
          highestSimilarity = similarity;
          bestMatch = p;
          isPartialOverlap = false;
        } else if (hasWordOverlap(p.name, item.name) && !bestMatch) {
          bestMatch = p;
          isPartialOverlap = true;
        }
      }

      if (bestMatch) {
        const existingCost = Number(bestMatch.costPrice || bestMatch.price || 0);
        const newCost = item.unitPrice;
        
        // If price differs by more than 1 unit, or it's a partial match, flag as a conflict
        const priceDiffers = Math.abs(existingCost - newCost) > 1.0;
        const needsResolution = priceDiffers || isPartialOverlap;

        if (needsResolution) {
          return {
            ...item,
            action: "conflict" as const,
            conflictType: "price-mismatch" as const,
            productId: bestMatch.id,
            existingStock: bestMatch.stock,
            existingName: bestMatch.name,
            existingBrand: bestMatch.brand,
            existingCategory: bestMatch.category,
            existingSku: bestMatch.sku,
            existingCostPrice: existingCost,
            existingPrice: Number(bestMatch.price || 0),
          };
        }

        return {
          ...item,
          action: "update" as const,
          productId: bestMatch.id,
          existingStock: bestMatch.stock,
          existingName: bestMatch.name,
          existingBrand: bestMatch.brand,
          existingCategory: bestMatch.category,
          existingSku: bestMatch.sku,
          existingCostPrice: existingCost,
          existingPrice: Number(bestMatch.price || 0),
        };
      }

      return {
        ...item,
        action: "create" as const,
      };
    });

    return successResponse({
      items: matchedItems,
      summary: {
        total: matchedItems.length,
        updates: matchedItems.filter((i) => i.action === "update").length,
        creates: matchedItems.filter((i) => i.action === "create").length,
        conflicts: matchedItems.filter((i) => i.action === "conflict").length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
