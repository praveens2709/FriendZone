export const personalizeSystemText = (
  text: string | undefined,
  actorId: string | null | undefined,
  myId: string | null | undefined,
  myFirstName: string | null | undefined
): string => {
  if (!text) return "";
  if (!actorId || !myId || actorId !== myId || !myFirstName) return text;
  if (text.startsWith(`${myFirstName} `)) return `You ${text.slice(myFirstName.length + 1)}`;
  if (text === `Group created by ${myFirstName}`) return "Group created by you";
  return text;
};
