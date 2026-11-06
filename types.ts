export interface DocSummary {
  id: string;
  title: string;
  excerpt: string;
  wordCount: number;
  charCount: number;
  lineCount: number;
  writingTimeSec: number;
  isDraft: boolean;
  isFavorite: boolean;
  isTrashed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Doc extends DocSummary {
  content: string;
  plainText: string;
}

export interface EditorSettings {
  font: string;
  size: number;
  lineHeight: number;
}

export const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: "Lora (serif)", value: "'Lora', Georgia, 'Times New Roman', serif" },
  { label: "Georgia (serif)", value: "Georgia, 'Times New Roman', serif" },
  { label: "Inter (sans)", value: "'Inter', ui-sans-serif, system-ui, sans-serif" },
  { label: "Courier (mono)", value: "'Courier New', ui-monospace, monospace" },
];

export const SIZE_OPTIONS = [14, 16, 18, 20, 22, 24, 28];
export const LINE_HEIGHT_OPTIONS = [1.4, 1.6, 1.8, 2.0, 2.2];

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  font: FONT_OPTIONS[0].value,
  size: 19,
  lineHeight: 1.8,
};

export const EDITOR_STORAGE_KEY = "wr-editor-settings";
