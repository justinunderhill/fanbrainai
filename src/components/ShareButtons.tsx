'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Download, Link2, Loader2, Share2 } from 'lucide-react';

/**
 * Shared share-sheet UI: read-only link with inline copy + a uniform social grid
 * (X / Facebook / WhatsApp / native-or-email). Used by the fan profile, a single
 * settled prediction, and the leaderboard. Each caller supplies the relative `path`
 * and the pre-filled `shareText`.
 */
export function ShareButtons({
  path,
  shareText,
  title,
  heading,
  blurb,
  tone = 'emerald',
}: {
  /** Relative path on the canonical site, e.g. `/r/<token>` or `/leaderboard`. */
  path: string;
  /** Pre-filled text for X / WhatsApp / native share. */
  shareText: string;
  /** Title used by the native share sheet and mailto subject. */
  title: string;
  /** Bold label at the top of the card. */
  heading: string;
  /** Supporting line under the heading. */
  blurb: string;
  tone?: 'emerald' | 'amber';
}) {
  const [copied, setCopied] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [client, setClient] = useState<{ base: string; canNativeShare: boolean; canShareImage: boolean }>({
    base: '',
    canNativeShare: false,
    canShareImage: false,
  });
  const { base, canNativeShare, canShareImage } = client;

  // Prefer the configured site URL (NEXT_PUBLIC_SITE_URL, e.g. https://fanbrainai.com in
  // prod) so share links use the canonical domain. Fall back to the live origin for local
  // dev and preview deploys, where the env var isn't set. Resolved after mount so the
  // displayed URL is correct without a hydration mismatch.
  useEffect(() => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '');
    // Web Share Level 2 (file sharing) is detected separately from Level 1 (link sharing):
    // a browser can expose navigator.share for links yet not accept files. Probe with a
    // dummy PNG so the button label reflects what the click will actually do.
    const canShareImage =
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [new File([], 'card.png', { type: 'image/png' })] });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClient({ base: siteUrl || window.location.origin, canNativeShare: !!navigator.share, canShareImage });
  }, []);

  const shareUrl = `${base}${path}`;

  async function handleNativeShare() {
    try {
      await navigator.share({ title, text: shareText, url: shareUrl });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context) — nothing we can do silently.
    }
  }

  async function shareOrSaveImage() {
    setImageBusy(true);
    try {
      const resolvedBase = base || window.location.origin;
      const imageUrl = `${resolvedBase}${path.replace(/\/+$/, '')}/og`;
      const response = await fetch(imageUrl);
      if (!response.ok) return;

      const blob = await response.blob();
      const file = new File([blob], imageFilename(path), { type: blob.type || 'image/png' });
      const fileShareData: ShareData = { files: [file], title, text: shareText };

      if (navigator.share && navigator.canShare?.(fileShareData)) {
        await navigator.share(fileShareData);
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Defer revoke: some browsers (notably Firefox) cancel the download if the blob URL
      // is revoked synchronously before they've started reading it.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    } catch {
      // Fetch failed, file sharing is unavailable, or the user dismissed the sheet.
    } finally {
      setImageBusy(false);
    }
  }

  // X and WhatsApp accept pre-filled text. Facebook intentionally ignores it and builds the
  // post from the page's Open Graph tags, so we pass the URL only and let the OG card supply
  // the context.
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  const toneCls =
    tone === 'amber'
      ? 'border-amber-300/25 bg-amber-300/[0.06] text-amber-100'
      : 'border-emerald-300/25 bg-emerald-300/[0.06] text-emerald-100';

  return (
    <div className={`rounded-3xl border p-5 ${toneCls}`}>
      <p className="text-sm font-black">{heading}</p>
      <p className="mt-1 text-sm text-gray-300">{blurb}</p>

      {/* Read-only link with inline copy — the clean, expected pattern. */}
      <div className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-gray-950/60 py-1.5 pl-4 pr-1.5">
        <Link2 size={16} className="shrink-0 text-gray-400" />
        <span className="flex-1 truncate text-sm text-gray-300">{base ? shareUrl : path}</span>
        <button onClick={copyLink} className="btn btn-primary shrink-0 px-4 py-2 text-sm">
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <button onClick={shareOrSaveImage} disabled={imageBusy} className="btn btn-primary mt-3 w-full px-4 py-2.5 text-sm">
        {imageBusy ? <Loader2 size={16} className="animate-spin" /> : canShareImage ? <Share2 size={16} /> : <Download size={16} />}
        {imageBusy ? 'Preparing image...' : canShareImage ? 'Share image' : 'Save image'}
      </button>

      {/* Uniform social grid so the buttons line up cleanly. */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ShareLink href={tweetUrl}>X</ShareLink>
        <ShareLink href={facebookUrl}>Facebook</ShareLink>
        <ShareLink href={whatsappUrl}>WhatsApp</ShareLink>
        {canNativeShare ? (
          <button onClick={handleNativeShare} className="btn btn-ghost px-3 py-2.5 text-sm">
            <Share2 size={16} /> More
          </button>
        ) : (
          <ShareLink href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}>
            Email
          </ShareLink>
        )}
      </div>
    </div>
  );
}

function ShareLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-ghost px-3 py-2.5 text-sm">
      {children}
    </a>
  );
}

function imageFilename(path: string) {
  if (path.startsWith('/p/')) return 'fanbrain-profile.png';
  if (path.startsWith('/r/')) return 'fanbrain-prediction.png';
  if (path === '/leaderboard') return 'fanbrain-leaderboard.png';
  return 'fanbrain-card.png';
}
