export type KnockStatus = 'pending' | 'locked';

export interface Knock {
  id: string;
  user: {
    id: string;
    username: string;
    avatar: string | null;
  };
  status: KnockStatus;
  timestamp: string;
}

export enum KnockListType {
  Knockers = "Knockers",
  Knocking = "Knocking",
  LockedIn = "LockedIn",
}