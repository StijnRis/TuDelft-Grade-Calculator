/** File name (without extension) for a course code; shared by the build and the browser. */
export function courseSlug(code: string): string {
  return code.trim().toLowerCase().replace(/[^a-z0-9.-]/g, "_");
}
