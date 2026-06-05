export function formatScore(score: number): string {
  return `${Math.round(score)}%`;
}

export function scoreStatus(
  score: number,
): "success" | "normal" | "exception" {
  if (score >= 80) return "success";
  if (score >= 50) return "normal";
  return "exception";
}
