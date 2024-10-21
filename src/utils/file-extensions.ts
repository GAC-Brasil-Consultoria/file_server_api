export const FileExtension = {
  pdf: { id: 1, extension: 'pdf' },
  doc: { id: 2, extension: 'doc' },
  docx: { id: 3, extension: 'docx' },
  ppt: { id: 4, extension: 'ppt' },
  pptx: { id: 5, extension: 'pptx' },
  xls: { id: 6, extension: 'xls' },
  xlsx: { id: 7, extension: 'xlsx' },
  jpeg: { id: 8, extension: 'jpeg' },
} as const;

export type FileExtensionType = keyof typeof FileExtension;
