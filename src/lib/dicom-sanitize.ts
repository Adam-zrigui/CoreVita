const INVALID_PATTERN = /[<>&"'\x00-\x1f\x7f-\x9f]/g;

const REPLACEMENTS: Record<string, string> = {
  "<": " ",
  ">": " ",
  "&": " ",
  '"': " ",
  "'": " ",
};

export function sanitizeDicomMetadata(value: string, maxLength = 256): string {
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.replace(INVALID_PATTERN, (ch) => REPLACEMENTS[ch] ?? " ");
}
