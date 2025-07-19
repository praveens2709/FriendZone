import { KnockRequest } from '@/services/knockService';
import { KnockListType } from '@/types/knock.type';

export const categorizeKnocks = (
  received: KnockRequest[],
  sent: KnockRequest[],
  userId: string
) => {
  const lockedIn: KnockRequest[] = [];
  const knockers: KnockRequest[] = [];
  const knocking: KnockRequest[] = [];

  const uniquePairs = new Set<string>();

  received.forEach((knock) => {
    const pairId = [knock.user.id, userId].sort().join('_');
    if (knock.status === 'lockedIn' && !uniquePairs.has(pairId)) {
      lockedIn.push(knock);
      uniquePairs.add(pairId);
    } else if (knock.status === 'onesidedlock') {
      knockers.push(knock);
    }
  });

  sent.forEach((knock) => {
    const pairId = [userId, knock.user.id].sort().join('_');
    if (knock.status === 'lockedIn' && !uniquePairs.has(pairId)) {
      lockedIn.push(knock);
      uniquePairs.add(pairId);
    } else if (knock.status === 'onesidedlock') {
      knocking.push(knock);
    }
  });

  return { knockers, knocking, lockedIn, lockedInCount: uniquePairs.size };
};

export const getKnockListByType = (
  type: KnockListType,
  received: KnockRequest[],
  sent: KnockRequest[],
  userId: string
): KnockRequest[] => {
  const { knockers, knocking, lockedIn } = categorizeKnocks(received, sent, userId);

  switch (type) {
    case KnockListType.Knockers:
      return knockers;
    case KnockListType.Knocking:
      return knocking;
    case KnockListType.LockedIn:
      return lockedIn;
    default:
      return [];
  }
};

export const getKnockStatusButtonText = (
  item: KnockRequest,
  listType: KnockListType
): string => {
  if (item.status === "lockedIn") return "Message";
  if (item.status === "pending") return "Pending";

  if (item.status === "onesidedlock") {
    if (listType === KnockListType.Knockers) return "Knock Back";
    if (listType === KnockListType.Knocking) return "Unknock";
  }

  return item.status;
};