/**
 * Google Places Autocomplete API Route
 * 
 * Proxies requests to Google Places API to protect API key.
 * Searches for addresses and establishments in Kenya.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const input = searchParams.get("input");
  
  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  // Try multiple env variable names for flexibility
  const GOOGLE_API_KEY = 
    process.env.GOOGLE_PLACES_API_KEY || 
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY;
  
  if (!GOOGLE_API_KEY) {
    console.error("No Google Maps/Places API key configured. Add GOOGLE_PLACES_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local");
    return NextResponse.json({ 
      predictions: [],
      error: "API key not configured" 
    });
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", input);
    url.searchParams.set("key", GOOGLE_API_KEY);
    // Remove types restriction to allow both addresses and establishments (buildings)
    url.searchParams.set("components", "country:ke"); // Restrict to Kenya
    url.searchParams.set("language", "en");
    
    const response = await fetch(url.toString());
    const data = await response.json();
    
    console.log("Google Places API response:", data.status, data.predictions?.length || 0, "results");
    
    if (data.status === "OK" || data.status === "ZERO_RESULTS") {
      return NextResponse.json({
        predictions: data.predictions || [],
      });
    } else {
      console.error("Google Places API error:", data.status, data.error_message);
      return NextResponse.json({ 
        predictions: [],
        error: data.error_message || data.status 
      });
    }
  } catch (error) {
    console.error("Places autocomplete error:", error);
    return NextResponse.json({ predictions: [], error: "Network error" });
  }
}
