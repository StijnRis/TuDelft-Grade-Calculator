export interface AssessmentComponent {
  name: string;
  /** Percentage of the final grade (0-100). */
  weight: number;
  /** Minimum grade required on this component, if the text states one. */
  minGrade?: number;
  /** The fragment of the original text this component was derived from. */
  source: string;
}

export interface ParsedAssessment {
  components: AssessmentComponent[];
  /** Sentences describing unweighted (e.g. pass/fail) requirements. */
  passFail: string[];
  totalWeight: number;
  /** True when at least one component was found and weights add up to 100%. */
  confident: boolean;
  /** Plain-text version of the input that all `source` fragments refer to. */
  text: string;
}

export function htmlToText(input: string): string {
  return input
    .replace(/<\s*(head|style|script)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(br|\/p|\/li|\/div|\/h\d)\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .trim();
}

const WEIGHT = /(\d+(?:[.,]\d+)?)\s*%|(?<![\d/.])(\d{1,2})\/(\d{1,2})(?![\d/])/g;
const DELIM = /[.;\n,:]|\s(?:and|en|plus)\s|\s[+&]\s/gi;
const MIN_GRADE =
  /min(?:imum)?(?:\s+(?:grade|mark|score|result))?(?:\s+of)?\s*[:=]?\s*(?:a\s+)?(\d{1,2}(?:[.,]\d+)?)/i;
const PASS_FAIL = /pass\s*\/\s*fail|pass or fail|satisfactory|mandatory|compulsory|attendance|(?:has|have|must|need)\s+to\s+be\s+(?:passed|completed)/i;

function num(s: string): number {
  return parseFloat(s.replace(",", "."));
}

function lastDelimiterEnd(s: string): number {
  let end = 0;
  for (const m of s.matchAll(DELIM)) end = m.index! + m[0].length;
  return end;
}

function firstDelimiterStart(s: string): number {
  const m = new RegExp(DELIM.source, "i").exec(s);
  return m ? m.index : s.length;
}

function cleanName(raw: string): string {
  let n = raw
    .replace(/\([^)]*\)?/g, "")
    .replace(/^[\s\-–•*]+|[\s\-–•*]+$/g, "")
    .replace(/^(?:the|a|an|with|for|of|is|are|consists of|based on)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!n) return "Component";
  return n.charAt(0).toUpperCase() + n.slice(1);
}

/** Index of the "(" enclosing `pos`, or -1. */
function enclosingParen(text: string, pos: number): { open: number; close: number } | null {
  let depth = 0;
  for (let i = pos - 1; i >= 0; i--) {
    if (text[i] === ")") depth++;
    else if (text[i] === "(") {
      if (depth === 0) {
        const close = text.indexOf(")", pos);
        return { open: i, close: close === -1 ? text.length : close };
      }
      depth--;
    }
  }
  return null;
}

export function parseAssessment(input: string): ParsedAssessment {
  const text = htmlToText(input);
  const components: AssessmentComponent[] = [];
  const weightSpans: Array<[number, number]> = [];

  const matches = [...text.matchAll(WEIGHT)];
  for (const m of matches) {
    const start = m.index!;
    const end = start + m[0].length;
    const weight = m[1] !== undefined ? num(m[1]) : (Number(m[2]) / Number(m[3])) * 100;
    if (!(weight > 0 && weight <= 100)) continue;
    weightSpans.push([start, end]);

    let name: string;
    let sourceStart: number;
    let sourceEnd: number;
    let detail: string;

    const paren = enclosingParen(text, start);
    if (paren) {
      const before = text.slice(0, paren.open);
      sourceStart = lastDelimiterEnd(before);
      name = cleanName(before.slice(sourceStart));
      sourceEnd = Math.min(paren.close + 1, text.length);
      detail = text.slice(paren.open, sourceEnd);
    } else {
      const before = text.slice(0, start);
      const segStart = lastDelimiterEnd(before.replace(/[:=]\s*$/, (s) => " ".repeat(s.length)));
      const lead = before.slice(segStart).replace(/[:=]\s*$/, "").trim();
      if (lead) {
        name = cleanName(lead);
        sourceStart = segStart;
        sourceEnd = end;
        detail = text.slice(end, end + firstDelimiterStart(text.slice(end)));
      } else {
        const after = text.slice(end);
        const len = firstDelimiterStart(after.replace(/\([^)]*\)/g, (s) => " ".repeat(s.length)));
        name = cleanName(after.slice(0, len));
        sourceStart = start;
        sourceEnd = end + len;
        detail = after.slice(0, len);
      }
    }

    const min = MIN_GRADE.exec(detail);
    components.push({
      name,
      weight,
      ...(min ? { minGrade: num(min[1]) } : {}),
      source: text.slice(sourceStart, sourceEnd).trim(),
    });
  }

  const passFail = text
    .split(/(?<=[.!?])\s+|\n/)
    .map((s) => s.trim())
    .filter((s) => s && PASS_FAIL.test(s) && !new RegExp(WEIGHT.source).test(s));

  const totalWeight = Math.round(components.reduce((a, c) => a + c.weight, 0) * 100) / 100;
  return {
    components,
    passFail,
    totalWeight,
    confident: components.length > 0 && Math.abs(totalWeight - 100) < 0.5,
    text,
  };
}
