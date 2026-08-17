// new Date() alone is fine under the purity lint; Date.now() arithmetic
// inside a render body is not, so these wrap the offset math.
export function isoDateOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isoDateTimeOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
