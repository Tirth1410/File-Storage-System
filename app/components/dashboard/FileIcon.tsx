"use client";

import { File, FileImage, FileText, FileVideo } from "lucide-react";

interface FileIconProps {
  mimeType: string;
  className?: string;
}

export function FileIcon({ mimeType, className = "w-5 h-5" }: FileIconProps) {
  if (mimeType.startsWith("image/")) {
    return <FileImage className={`${className} text-emerald-500`} />;
  }
  if (mimeType.startsWith("video/")) {
    return <FileVideo className={`${className} text-violet-500`} />;
  }
  if (mimeType === "application/pdf") {
    return <FileText className={`${className} text-rose-500`} />;
  }
  return <File className={`${className} text-[#737373]`} />;
}
