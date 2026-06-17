/** Trigger a browser download for a Blob (CSV/JSON exports). */
export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

const dateStamp = () => new Date().toISOString().slice(0, 10);

/** Run an export fn that returns a Blob, then download it. Returns ok/false. */
export async function exportCsv(fn: () => Promise<Blob>, name: string): Promise<boolean> {
  try {
    const blob = await fn();
    downloadBlob(blob, `parkswift-${name}-${dateStamp()}.csv`);
    return true;
  } catch {
    return false;
  }
}
