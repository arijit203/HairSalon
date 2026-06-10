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
  taxRate: number;
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
  // 1. Character bigram similarity
  const str1 = s1.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/0/g, "o");
  const str2 = s2.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/0/g, "o");
  
  let bigramSim = 0;
  if (str1 === str2) {
    bigramSim = 1.0;
  } else if (str1.length >= 2 && str2.length >= 2) {
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

    bigramSim = (2.0 * intersection) / (bigrams1.size + bigrams2.size);
  }

  // 2. Word overlap similarity
  const stopWords = new Set(["for", "the", "and", "with", "pack", "single", "size", "ml", "gm", "pcs", "free", "off", "new", "kit"]);
  const words1 = s1.toLowerCase().split(/[^a-z0-9+]/).map(w => w.trim()).filter(w => w.length >= 2 && !stopWords.has(w));
  const words2 = s2.toLowerCase().split(/[^a-z0-9+]/).map(w => w.trim()).filter(w => w.length >= 2 && !stopWords.has(w));

  let wordSim = 0;
  if (words1.length > 0 && words2.length > 0) {
    const set2 = new Set(words2);
    const intersect = words1.filter(w => set2.has(w)).length;
    const minLength = Math.min(words1.length, words2.length);
    wordSim = intersect / minLength;
  }

  return Math.max(bigramSim, wordSim);
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

Analyze this invoice/bill/receipt image carefully and extract ALL product items listed, as well as invoice-level totals.

EXISTING CATEGORIES in our system: ${JSON.stringify(allCategories)}

You MUST return a JSON object with the following fields:
1. "items": An array of objects, one for each product item found. For each item, extract:
   - "name": The product name (clean it up, proper casing)
   - "brand": Brand name or brand code if listed under Brand/ID column (empty string "" if not found)
   - "quantity": Number of units purchased (default 1 if unclear)
   - "unitPrice": Rate or price per unit in INR (number, no currency symbol)
   - "discount": Discount percentage on this item (0 if none)
   - "suggestedCategories": Array of 1-3 categories from the EXISTING CATEGORIES list that best match this product. If no existing category fits well, return an empty array [].
   - "itemCode": Item code, SKU, barcode, Brand/ID, HSN code, or article number if listed on the receipt (empty string "" if not found)
   - "taxRate": The tax percentage (GST/VAT) applied to this product line item as a number, e.g. 5, 12, 18, 28 (0 if no tax is listed or if it is tax-exempt)

2. "invoiceSubtotal": Total amount of all items before discount and tax as listed on the receipt (0 if not listed)
3. "invoiceDiscountAmount": Total discount amount listed at the bottom (0 if none)
4. "invoiceDiscountRate": Total discount percentage rate listed at the bottom (0 if none)
5. "invoiceTaxAmount": Total tax amount (CGST + SGST or VAT) listed at the bottom (0 if none)
6. "invoiceTaxRate": Total tax percentage rate listed at the bottom (0 if none)
7. "invoiceGrandTotal": Grand total amount listed at the bottom (0 if not listed)

IMPORTANT RULES:
- Return ONLY a valid JSON object. No markdown, no code fences, no explanation.
- If the image is not an invoice/bill/receipt, return: {"items": [], "invoiceSubtotal": 0, "invoiceDiscountAmount": 0, "invoiceDiscountRate": 0, "invoiceTaxAmount": 0, "invoiceTaxRate": 0, "invoiceGrandTotal": 0}
- Prices and amounts should be numbers (not strings). Remove any currency symbols or commas.
- For quantity, default to 1 if not clearly stated.
- Be thorough — extract EVERY line item from the invoice.
- Clean up product names — remove random codes, fix spelling if obviously wrong.
- CRITICAL for itemCode: Copy the EXACT item/SKU/barcode/article code AS PRINTED on the invoice. If no such code is printed for an item, return "" (empty string). DO NOT invent, generate, or abbreviate codes.

Example output format:
{
  "items": [
    {"name":"L'Oreal Professionnel Shampoo 300ml","brand":"L'Oreal","quantity":2,"unitPrice":450,"discount":0,"suggestedCategories":["Hair Care"],"itemCode":"","taxRate":18},
    {"name":"Wella Professionals Hair Mask 150ml","brand":"Wella Professionals","quantity":1,"unitPrice":650,"discount":5,"suggestedCategories":["Hair Care"],"itemCode":"8005610524863","taxRate":12}
  ],
  "invoiceSubtotal": 1550,
  "invoiceDiscountAmount": 32.5,
  "invoiceDiscountRate": 5,
  "invoiceTaxAmount": 148,
  "invoiceTaxRate": 12,
  "invoiceGrandTotal": 1665.5
}`;

    // Call Gemini Vision API — cascade through models with retry on 503
    const genAI = new GoogleGenerativeAI(apiKey);
    let responseText = "";

    const modelCascade = [
      "gemini-3.5-flash",      // Newest flagship fast model
      "gemini-3.1-flash-lite", // High-volume, cost-efficient Gemini 3
      "gemini-2.5-flash",      // Fast Gemini 2 fallback
      "gemini-2.5-pro",        // Most capable, last resort
    ];

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const callModel = async (modelName: string): Promise<string> => {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: mimeType || "image/jpeg", data: image } },
      ]);
      return result.response.text();
    };

    let lastError: any = null;
    for (const modelName of modelCascade) {
      // Try each model once; on 503/overload, retry once after a short delay
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          responseText = await callModel(modelName);
          lastError = null;
          break; // success — stop retrying this model
        } catch (err: any) {
          lastError = err;
          const is503 = err?.status === 503 || String(err?.message || "").includes("503");
          if (is503 && attempt === 1) {
            console.warn(`Model ${modelName} returned 503 on attempt ${attempt}, retrying after 1.5s...`);
            await sleep(1500);
            continue;
          }
          // Non-503 error or second attempt failed — break to next model
          console.warn(`Model ${modelName} failed (attempt ${attempt}):`, err?.message || err);
          break;
        }
      }
      if (!lastError) break; // a model succeeded — exit the cascade
    }

    if (lastError) {
      console.error("All Gemini models failed:", lastError);
      const is503 = lastError?.status === 503 || String(lastError?.message || "").includes("503");
      throw new Error(
        is503
          ? "The AI service is currently experiencing high demand. Please wait a moment and try again."
          : lastError.message || "Failed to process the invoice with AI"
      );
    }

    // Parse the AI response
    let parsedItems: ParsedItem[] = [];
    let calculatedDiscount = 0;
    let calculatedTax = 0;
    let invoiceGrandTotal = 0;

    try {
      // Try to extract JSON from the response (handle cases where AI wraps in code blocks)
      let jsonStr = responseText.trim();
      // Remove markdown code fences if present
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      
      const parsedData = JSON.parse(jsonStr);
      if (parsedData && typeof parsedData === "object" && !Array.isArray(parsedData)) {
        parsedItems = parsedData.items || [];
        
        const subtotal = parsedData.invoiceSubtotal || parsedItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0) || 0;
        
        // Calculate global discount rate
        calculatedDiscount = parsedData.invoiceDiscountRate || 0;
        if (calculatedDiscount === 0 && parsedData.invoiceDiscountAmount && parsedData.invoiceDiscountAmount > 0 && subtotal > 0) {
          calculatedDiscount = (parsedData.invoiceDiscountAmount / subtotal) * 100;
        }
        calculatedDiscount = Math.round(calculatedDiscount * 100) / 100;

        // Calculate global tax rate
        calculatedTax = parsedData.invoiceTaxRate || 0;
        if (calculatedTax === 0 && parsedData.invoiceTaxAmount && parsedData.invoiceTaxAmount > 0) {
          const subtotalAfterDiscount = subtotal - (parsedData.invoiceDiscountAmount || 0);
          if (subtotalAfterDiscount > 0) {
            calculatedTax = (parsedData.invoiceTaxAmount / subtotalAfterDiscount) * 100;
          }
        }
        calculatedTax = Math.round(calculatedTax * 100) / 100;

        // Capture invoice grand total if listed on the receipt
        invoiceGrandTotal = parsedData.invoiceGrandTotal || 0;
      } else if (Array.isArray(parsedData)) {
        parsedItems = parsedData;
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

    // Apply calculated discount/tax to items if they don't have individual ones
    const itemsWithCalculatedRates = parsedItems.map(item => {
      return {
        ...item,
        discount: item.discount > 0 ? item.discount : calculatedDiscount,
        taxRate: item.taxRate > 0 ? item.taxRate : calculatedTax,
      };
    });

    // Match against existing products using best similarity match
    const matchedItems: MatchedItem[] = itemsWithCalculatedRates.map((item) => {
      let bestMatch = null;
      let highestSimilarity = 0.50; // 50% threshold
      let isPartialOverlap = false;

      for (const p of products) {
        // Normalize brands for comparison (strip non-alphanumeric, map 0 to o)
        const pBrandNorm = (p.brand || "").toLowerCase().replace(/[^a-z0-9]/g, "").replace(/0/g, "o").trim();
        const iBrandNorm = (item.brand || "").toLowerCase().replace(/[^a-z0-9]/g, "").replace(/0/g, "o").trim();
        const brandSim = getStringSimilarity(p.brand || "", item.brand || "");
        
        // Brand matches if both are empty, one contains the other, or similarity is >= 50%
        const brandMatches = 
          (pBrandNorm === "" && iBrandNorm === "") || 
          (pBrandNorm !== "" && iBrandNorm !== "" && (pBrandNorm.includes(iBrandNorm) || iBrandNorm.includes(pBrandNorm) || brandSim >= 0.50));
        if (!brandMatches) continue;

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
      invoiceGrandTotal,
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
