const COMMON_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "yahoo.in",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "proton.me",
  "protonmail.com",
  "rediffmail.com",
  "ymail.com",
  "me.com",
];

const TLD_FIXES: Record<string, string> = {
  con: "com",
  cpm: "com",
  vom: "com",
  xom: "com",
  cim: "com",
  comm: "com",
  coom: "com",
  ocm: "com",
  cm: "com",
  ner: "net",
  nte: "net",
  ogr: "org",
  orgg: "org",
};

const distance = (a: string, b: string) => {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return rows[a.length][b.length];
};

export const suggestEmail = (value: string): string | null => {
  const email = value.trim().toLowerCase();
  const at = email.indexOf("@");
  if (at < 1 || email.indexOf("@", at + 1) !== -1) return null;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain.includes(".") || COMMON_DOMAINS.includes(domain)) return null;

  const closest = COMMON_DOMAINS.map((candidate) => ({
    candidate,
    score: distance(domain, candidate),
  })).sort((a, b) => a.score - b.score)[0];
  if (closest && closest.score > 0 && closest.score <= 2) {
    return `${local}@${closest.candidate}`;
  }

  const parts = domain.split(".");
  const tld = parts[parts.length - 1];
  const fixed = TLD_FIXES[tld];
  if (fixed) {
    return `${local}@${[...parts.slice(0, -1), fixed].join(".")}`;
  }
  return null;
};
