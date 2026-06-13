// Single source of truth for the site's absolute origin.
//
// NEXT_PUBLIC_SITE_URL is inlined into both server and client bundles at build time
// (set to https://fanbrainai.com in Vercel Production). When it's absent — local dev and
// preview deploys — we fall back to localhost in development and the vercel.app domain
// otherwise, so absolute URLs (share links, og:url, og:image, canonical) always resolve.
const fallback = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://fanbrainai.vercel.app';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || fallback).replace(/\/+$/, '');
