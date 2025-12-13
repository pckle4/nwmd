export interface GeneratePdfRequest {
  markdown: string;
}

export interface GeneratePdfResponse {
  pdf: string; // Base64 encoded PDF
  filename: string;
}

export interface ApiError {
  message: string;
  code?: string;
}

export enum EditorView {
  EDIT = 'EDIT',
  PREVIEW = 'PREVIEW',
  SPLIT = 'SPLIT'
}

export type Theme = 'light' | 'dark' | 'midnight';
export type FontFamily = 'sans' | 'serif' | 'mono';
export type FontSize = 'sm' | 'base' | 'lg';
export type PaperSize = 'a4' | 'letter';

export interface AppConfig {
  theme: Theme;
  fontFamily: FontFamily;
  fontSize: FontSize;
  paperSize: PaperSize;
}