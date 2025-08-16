"use client";

import { DotLoader } from "@/components/ui/dot-loader";

// Compact loading animation for smaller spaces
const compactPattern = [
  [10, 11, 12, 17, 19, 24, 25, 26],
  [9, 13, 16, 20, 23, 27],
  [8, 14, 15, 21, 22, 28],
  [7, 29],
  [6, 30],
  [5, 31],
  [4, 32],
  [3, 33],
  [2, 34],
  [1, 35],
  [0, 36],
  [7, 29],
  [14, 22],
  [21],
  [],
];

// Pulsing dots pattern
const pulsePattern = [
  [21],
  [14, 21, 28],
  [15, 21, 27],
  [16, 21, 26],
  [17, 21, 25],
  [18, 21, 24],
  [17, 21, 25],
  [16, 21, 26],
  [15, 21, 27],
  [14, 21, 28],
  [21],
];

interface CompactDotLoaderProps {
  variant?: "wave" | "pulse";
  className?: string;
}

export const CompactDotLoader = ({ variant = "wave", className }: CompactDotLoaderProps) => {
  const pattern = variant === "pulse" ? pulsePattern : compactPattern;
  
  return (
    <DotLoader
      frames={pattern}
      duration={150}
      dotClassName="bg-muted-foreground/20 [&.active]:bg-primary"
      className={className || "gap-0.5"}
    />
  );
};
