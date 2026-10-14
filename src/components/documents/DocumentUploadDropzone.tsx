import { UploadCloud } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { useToast } from '../../context/ToastContext';
import { ACCEPT_ATTRIBUTE, isSupportedExtension, MAX_FILE_BYTES } from './fileCategory';

interface DocumentUploadDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function DocumentUploadDropzone({ onFileSelected, disabled }: DocumentUploadDropzoneProps) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const validateAndEmit = (file: File | undefined) => {
    if (!file) return;
    if (!isSupportedExtension(file.name)) {
      showToast(`Unsupported file type: ${file.name}. Supported: pdf, doc(x), xls(x), ppt(x), html, txt, csv, md, json, png, jpg, webp.`, 'error');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showToast('File limit exceeded: maximum allowed size is 10MB.', 'error');
      return;
    }
    onFileSelected(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    validateAndEmit(e.dataTransfer.files?.[0]);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
        px-6 py-10 text-center transition
        ${isDragOver ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5' : 'border-[var(--color-border)]'}
        ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-[var(--color-accent)]'}`}
    >
      <UploadCloud className="size-8 text-[var(--color-accent)]" />
      <p className="text-sm font-medium text-[var(--color-text)]">Drag & drop a file, or click to browse</p>
      <p className="text-xs text-[var(--color-text-muted)]">
        PDF, Word, Excel, PowerPoint, HTML, Text/CSV/Markdown/JSON, or images - up to 10MB
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          validateAndEmit(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
