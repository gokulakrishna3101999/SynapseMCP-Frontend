/** Mirrors backend FileCategory.java exactly - the 7 supported categories and their extensions. */
export const SUPPORTED_EXTENSIONS: Record<string, string> = {
  pdf: 'PDF',
  doc: 'Word', docx: 'Word',
  xls: 'Excel', xlsx: 'Excel',
  ppt: 'PowerPoint', pptx: 'PowerPoint',
  html: 'HTML', htm: 'HTML',
  txt: 'Text', csv: 'Text', md: 'Text', json: 'Text',
  png: 'Image', jpg: 'Image', jpeg: 'Image', webp: 'Image',
};

export const ACCEPT_ATTRIBUTE = Object.keys(SUPPORTED_EXTENSIONS).map((ext) => `.${ext}`).join(',');

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function categoryLabel(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return SUPPORTED_EXTENSIONS[ext] ?? 'Unknown';
}

export function isSupportedExtension(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return ext in SUPPORTED_EXTENSIONS;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
