"use client";

import { Compass } from "lucide-react";

interface TourKickoffModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  onStart: () => void;
  onSkip: () => void;
}

export function TourKickoffModal({
  isOpen,
  title,
  description,
  onStart,
  onSkip,
}: TourKickoffModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Modal Dialog Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-md flex flex-col shadow-xl overflow-hidden animate-fade-in">
        {/* Body content */}
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          {/* Tour Icon */}
          <div className="w-12 h-12 rounded-full flex items-center justify-center border bg-blue-50 text-[#002FA7] border-blue-100">
            <Compass className="w-6 h-6" />
          </div>

          <div className="space-y-1.5 w-full">
            <h3 className="text-base font-bold text-[#171717]">{title}</h3>
            <p className="text-xs text-neutral-500 leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-[#FAFAFA] border-t border-[#E5E7EB] px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onSkip}
            className="px-4 py-2 border border-[#E5E7EB] rounded-xl text-xs font-semibold text-[#525252] hover:bg-neutral-50 transition-all cursor-pointer"
          >
            Skip
          </button>
          <button
            onClick={onStart}
            className="px-4 py-2 bg-[#002FA7] hover:bg-[#002482] text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-[#002FA7]/10 cursor-pointer"
          >
            Start Tour
          </button>
        </div>
      </div>
    </div>
  );
}
