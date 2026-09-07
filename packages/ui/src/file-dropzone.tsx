"use client";

import { useCallback, useRef, useState, type DragEvent, type ReactNode } from "react";
import { cx, focusRing } from "./utils";

export type FileDropzoneProps = {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Max bytes per file; oversized files are reported through onReject rather than uploaded. */
  maxBytes?: number;
  onReject?: (reason: string) => void;
  hint?: ReactNode;
  className?: string;
};

export function FileDropzone({
  onFiles,
  accept = "image/*",
  multiple = true,
  disabled,
  maxBytes,
  onReject,
  hint,
  className,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept_ = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) return;
      const files: File[] = [];
      for (const file of Array.from(fileList)) {
        if (maxBytes && file.size > maxBytes) {
          onReject?.(`${file.name} is larger than ${Math.round(maxBytes / 1024 / 1024)} MB`);
          continue;
        }
        files.push(file);
      }
      if (files.length) onFiles(multiple ? files : files.slice(0, 1));
    },
    [maxBytes, multiple, onFiles, onReject],
  );

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    accept_(event.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cx(
        "border border-dashed p-7 text-center transition-colors duration-instant",
        dragging ? "border-signal bg-signal-tint" : "border-line-strong",
        disabled ? "opacity-50" : null,
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          accept_(e.target.files);
          e.target.value = "";
        }}
      />
      <svg
        className="mx-auto h-7 w-7 text-paper-faint"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
        />
      </svg>
      <p className="mt-3 text-[13px]">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cx(
            "font-mono text-[12px] uppercase tracking-[0.14em] text-signal underline-offset-4 hover:underline",
            focusRing,
          )}
        >
          Choose files
        </button>{" "}
        <span className="text-paper-mute">or drag them here</span>
      </p>
      {hint ? (
        <p className="mt-2 text-[12px] text-paper-faint">{hint}</p>
      ) : null}
    </div>
  );
}
