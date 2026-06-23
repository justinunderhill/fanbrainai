'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Download, Link2, Loader2, Mail, Share2 } from 'lucide-react';

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
  showImage = true,
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
  /** Whether to offer the "Share/Save image" button — only paths with an `/og` route have one. */
  showImage?: boolean;
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

      {showImage && (
        <button onClick={shareOrSaveImage} disabled={imageBusy} className="btn btn-primary mt-3 w-full px-4 py-2.5 text-sm">
          {imageBusy ? <Loader2 size={16} className="animate-spin" /> : canShareImage ? <Share2 size={16} /> : <Download size={16} />}
          {imageBusy ? 'Preparing image...' : canShareImage ? 'Share image' : 'Save image'}
        </button>
      )}

      {/* Uniform social grid so the buttons line up cleanly. Brand marks (tinted to
          each network's colour) make the targets scannable at a glance. */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ShareLink href={tweetUrl} label="X">
          <XIcon className="text-white" />
        </ShareLink>
        <ShareLink href={facebookUrl} label="Facebook">
          <FacebookIcon className="text-[#1877F2]" />
        </ShareLink>
        <ShareLink href={whatsappUrl} label="WhatsApp">
          <WhatsAppIcon className="text-[#25D366]" />
        </ShareLink>
        {canNativeShare ? (
          <button onClick={handleNativeShare} className="btn btn-ghost gap-2 px-3 py-2.5 text-sm">
            <Share2 size={16} /> More
          </button>
        ) : (
          <ShareLink
            href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
            label="Email"
          >
            <Mail size={16} className="text-gray-300" />
          </ShareLink>
        )}
      </div>
    </div>
  );
}

function ShareLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Share on ${label}`}
      className="btn btn-ghost gap-2 px-3 py-2.5 text-sm"
    >
      {children}
      <span>{label}</span>
    </a>
  );
}

// Brand glyphs (official simple-icons paths). lucide-react drops brand marks for
// trademark reasons, so we inline them rather than add an icon dependency.
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} fill="currentColor" aria-hidden className={className}>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" aria-hidden className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" aria-hidden className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function imageFilename(path: string) {
  if (path.startsWith('/p/')) return 'fanbrain-profile.png';
  if (path.startsWith('/r/')) return 'fanbrain-prediction.png';
  if (path === '/leaderboard') return 'fanbrain-leaderboard.png';
  return 'fanbrain-card.png';
}
