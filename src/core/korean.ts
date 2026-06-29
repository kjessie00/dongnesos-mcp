export function issueLooksLike(label: string): string {
  return `${label}${hasFinalConsonant(label) ? "으로" : "로"} 보입니다`;
}

function hasFinalConsonant(value: string): boolean {
  const last = [...value.trim()].pop();
  if (!last) return false;
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}
