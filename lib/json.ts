// Tolerant JSON reader: strips code fences and prose, repairs truncated output, removes trailing commas.
export function parseLoose(text: string): unknown {
  const s = text.replace(/```(?:json)?/gi, '');
  const a = s.search(/[\[{]/);
  if (a < 0) throw new Error('No JSON found in the model output');
  const stack: string[] = [];
  const snaps: { i: number; c: string }[] = [];
  let inStr = false, esc = false, end = -1;
  for (let i = a; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') {
      stack.pop();
      if (!stack.length) { end = i; break; }
    } else if (ch === ',') snaps.push({ i, c: stack.slice().reverse().join('') });
  }
  const tryParse = (t: string) => {
    try { return { v: JSON.parse(t.replace(/,\s*([}\]])/g, '$1')) }; } catch { return null; }
  };
  if (end >= 0) {
    const r = tryParse(s.slice(a, end + 1));
    if (r) return r.v;
    throw new Error('The model returned invalid JSON');
  }
  const whole = tryParse(s.slice(a) + (inStr ? '"' : '') + stack.slice().reverse().join(''));
  if (whole) return whole.v;
  for (let k = snaps.length - 1; k >= 0; k--) {
    const r = tryParse(s.slice(a, snaps[k].i) + snaps[k].c);
    if (r) return r.v;
  }
  throw new Error('The output was cut off and could not be repaired');
}
