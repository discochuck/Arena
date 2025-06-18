import { NextRequest, NextResponse } from 'next/server';

// Helper to fetch from Arena static hosting
async function fetchArenaImage(address: string) {
  const url = `https://static.starsarena.com/uploads/${address}.jpeg`;
  const res = await fetch(url);
  if (res.ok) {
    const buffer = await res.arrayBuffer();
    return { buffer, contentType: 'image/jpeg' };
  }
  return null;
}

// Helper to fetch from Moralis (if API key is set)
async function fetchMoralisImage(address: string) {
  const apiKey = process.env.MORALIS_API_KEY;
  if (!apiKey) return null;
  const url = `https://deep-index.moralis.io/api/v2/erc20/${address}/logo`;
  const res = await fetch(url, { headers: { 'X-API-Key': apiKey } });
  if (res.ok) {
    const buffer = await res.arrayBuffer();
    return { buffer, contentType: res.headers.get('content-type') || 'image/png' };
  }
  return null;
}

// Helper to generate SVG placeholder
function generateSVG(symbol: string) {
  const initials = (symbol || '?').slice(0, 4).toUpperCase();
  return `<svg width='64' height='64' xmlns='http://www.w3.org/2000/svg'><rect width='100%' height='100%' fill='#222'/><text x='50%' y='50%' font-size='24' fill='#fff' font-family='monospace' text-anchor='middle' alignment-baseline='central' dominant-baseline='central'>${initials}</text></svg>`;
}

export async function GET(req: NextRequest, { params }: { params: { address: string } }) {
  const address = params.address.toLowerCase();
  // Try Arena static hosting
  let result = await fetchArenaImage(address);
  if (result) {
    return new Response(result.buffer, { headers: { 'Content-Type': result.contentType } });
  }
  // Try Moralis
  result = await fetchMoralisImage(address);
  if (result) {
    return new Response(result.buffer, { headers: { 'Content-Type': result.contentType } });
  }
  // Fallback: SVG placeholder
  // Try to get symbol from query param (for better SVGs)
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || address.slice(2, 6);
  const svg = generateSVG(symbol);
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
} 