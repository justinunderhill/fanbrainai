'use client';

import { ShareButtons } from '@/components/ShareButtons';
import { fanTypePhrase } from '@/lib/utils';

export function ShareProfileButton({
  token,
  personalityType,
}: {
  token: string;
  personalityType: string;
}) {
  return (
    <div className="mt-6">
      <ShareButtons
        path={`/p/${token}`}
        title="My FanBrain fan personality"
        heading="Share your fan personality"
        blurb="Send friends an unlisted link to your profile card."
        shareText={`I'm ${fanTypePhrase(personalityType)} on FanBrain — find your football fan personality:`}
      />
    </div>
  );
}
