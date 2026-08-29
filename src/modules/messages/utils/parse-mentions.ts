export type MentionToken =
  | { type: 'everyone' }
  | { type: 'role'; name: string }
  | { type: 'member'; name: string };

const MENTION_PATTERN = /@([^\s@]+)/g;

const TRAILING_PUNCTUATION = /[.,!?;:)]+$/;

function clean(raw: string) {
  return raw.replace(TRAILING_PUNCTUATION, '');
}

export function parseMentions(content: string): MentionToken[] {
  const tokens: MentionToken[] = [];

  let match: RegExpExecArray | null;

  MENTION_PATTERN.lastIndex = 0;

  while ((match = MENTION_PATTERN.exec(content)) !== null) {
    const raw = clean(match[1]);

    if (raw.length === 0) {
      continue;
    }

    if (raw.toLowerCase() === 'everyone') {
      tokens.push({ type: 'everyone' });
    } else if (raw.startsWith('role:')) {
      tokens.push({ type: 'role', name: raw.slice('role:'.length) });
    } else {
      tokens.push({ type: 'member', name: raw });
    }
  }

  return tokens;
}
