import { message, STAT_INFO, type StatKey } from '@ascend/core';
import { useCallback, useState } from 'react';
import type { AlertSpec } from '@/ui/components';
import { colors } from '@/ui/theme';
import type { RewardResponse } from './types';

export function rewardAlerts(r: RewardResponse, seed: string, kind: 'workout' | 'habits'): AlertSpec[] {
  const out: AlertSpec[] = [];
  if (r.reward.xp > 0) {
    const gains = (Object.entries(r.reward.stats) as [StatKey, number][]).filter(([, v]) => v > 0).map(([k, v]) => `${STAT_INFO[k].name} +${v}`);
    out.push({
      tag: kind === 'workout' ? 'Directive logged' : 'Habits logged',
      title: `+${r.reward.xp} Essence`,
      lines: [kind === 'workout' ? message('directiveComplete', seed, { xp: r.reward.xp }) : 'Small disciplines compound.', ...gains],
    });
  }
  if (r.levelUp) {
    out.push({ tag: 'Level up', title: `Level ${r.levelUp}`, lines: [message('levelUp', seed, { level: r.levelUp })], accent: colors.gold });
  }
  if (r.rankUp) {
    out.push({
      tag: 'Rank ascension',
      title: `${r.rankUp.name} Rank`,
      lines: [message('rankUp', seed, { rank: r.rankUp.name, title: r.rankUp.title })],
      accent: r.rankUp.color,
    });
  }
  return out;
}

/** A queue of System alerts shown one after another. */
export function useAlertQueue() {
  const [queue, setQueue] = useState<AlertSpec[]>([]);
  const push = useCallback((a: AlertSpec[]) => setQueue((q) => [...q, ...a]), []);
  const close = useCallback(() => setQueue((q) => q.slice(1)), []);
  return { current: queue[0] ?? null, push, close, pending: queue.length };
}
