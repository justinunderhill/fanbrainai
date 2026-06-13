'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Link2, Share2 } from 'lucide-react';

export function ShareProfileButton({
  token,
  personalityType,
}: {
  token: string;
  personalityType: string;
}) {
  const [copied, setCopied] = useState(false);
  const [client, setClient] = useState<{ base: string; canNativeShare: boolean }>({ base: '', canNativeShare: false });
  const { base, canNativeShare } = client;

  // Prefer the configured site URL (NEXT_PUBLIC_SITE_URL, e.g. https://fanbrainai.com in
  // prod) so share links use the canonical domain. Fall back to the live origin for local
  // dev and preview deploys, where the env var isn't set. Resolved after mount so the
  // displayed URL is correct without a hydration mismatch.
  useEffect(() => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClient({ base: siteUrl || window.location.origin, canNativeShare: !!navigator.share });
  }, []);

  const shareUrl = `${base}/p/${token}`;
  const shareText = `I'm a ${personalityType} on FanBrain — find your World Cup fan personality:`;

  async function handleNativeShare() {
    try {
      await navigator.share({ title: 'My FanBrain fan personality', text: shareText, url: shareUrl });
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

  // X and WhatsApp accept pre-filled text. Facebook intentionally ignores it and builds the
  // post from the page's Open Graph tags, so we pass the URL only and let the OG card supply
  // the context.
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="mt-6 rounded-3xl border border-emerald-300/25 bg-emerald-300/[0.06] p-5">
      <p className="text-sm font-black text-emerald-100">Share your fan personality</p>
      <p className="mt-1 text-sm text-gray-300">Send friends an unlisted link to your profile card.</p>

      {/* Read-only link with inline copy — the clean, expected pattern. */}
      <div className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-gray-950/60 py-1.5 pl-4 pr-1.5">
        <Link2 size={16} className="shrink-0 text-gray-400" />
        <span className="flex-1 truncate text-sm text-gray-300">{base ? shareUrl : `/p/${token}`}</span>
        <button onClick={copyLink} className="btn btn-primary shrink-0 px-4 py-2 text-sm">
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

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
          <ShareLink href={`mailto:?subject=${encodeURIComponent('My FanBrain fan personality')}&body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}>
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
