import { DotLoader } from "@/components/ui/dot-loader";

// Simple loading animation pattern
const loadingPattern = [
  [21, 22],
  [14, 21, 22, 29],
  [7, 14, 21, 22, 29, 36],
  [0, 7, 14, 21, 22, 29, 36, 43],
  [1, 8, 15, 22, 29, 36, 43],
  [2, 9, 16, 23, 30, 37, 44],
  [3, 10, 17, 24, 31, 38, 45],
  [4, 11, 18, 25, 32, 39, 46],
  [5, 12, 19, 26, 33, 40, 47],
  [6, 13, 20, 27, 34, 41, 48],
  [13, 20, 27, 34, 41, 48],
  [20, 27, 34, 41, 48],
  [27, 34, 41, 48],
  [34, 41],
  [41],
  [],
];

export default function Loader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <DotLoader
        frames={loadingPattern}
        duration={120}
        dotClassName="bg-muted-foreground/30 [&.active]:bg-primary"
        className="gap-0.5"
      />
    </div>
  );
}
