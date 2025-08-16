import { DotLoader } from "@/components/ui/dot-loader";
import { CompactDotLoader } from "@/components/ui/compact-dot-loader";

// Snake loading pattern
const snakePattern = [
  [0],
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 13],
  [13, 20],
  [20, 27],
  [27, 34],
  [34, 41],
  [41, 48],
  [48, 47],
  [47, 46],
  [46, 45],
  [45, 44],
  [44, 43],
  [43, 42],
  [42, 35],
  [35, 28],
  [28, 21],
  [21, 14],
  [14, 7],
  [7],
];

// Spiral pattern
const spiralPattern = [
  [21, 22, 23],
  [14, 21, 22, 23, 30],
  [14, 15, 22, 29, 30],
  [14, 15, 16, 29, 30],
  [7, 14, 15, 16, 23, 30, 37],
  [7, 8, 15, 22, 23, 24, 37],
  [7, 8, 9, 22, 23, 24, 25, 37],
  [0, 7, 8, 9, 22, 23, 24, 25, 32, 37],
  [0, 1, 8, 15, 22, 23, 24, 31, 32, 39],
  [0, 1, 2, 15, 22, 23, 30, 31, 32, 39],
];

// Cross pattern
const crossPattern = [
  [24],
  [17, 24, 31],
  [10, 17, 24, 31, 38],
  [3, 10, 17, 24, 31, 38, 45],
  [21, 22, 23, 24, 25, 26, 27],
  [3, 10, 17, 21, 22, 23, 24, 25, 26, 27, 31, 38, 45],
  [21, 22, 23, 24, 25, 26, 27],
  [3, 10, 17, 24, 31, 38, 45],
  [10, 17, 24, 31, 38],
  [17, 24, 31],
  [24],
];

export const LoadingExamples = () => {
  return (
    <div className="p-8 space-y-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Dot Loading Animations</h2>
        <p className="text-muted-foreground">
          Various loading animation patterns using the DotLoader component.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {/* Default Loader */}
        <div className="space-y-3">
          <h3 className="font-semibold">Default App Loader</h3>
          <div className="p-4 border rounded-lg flex items-center justify-center">
            <DotLoader
              frames={[
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
              ]}
              duration={120}
              dotClassName="bg-muted-foreground/30 [&.active]:bg-primary"
            />
          </div>
        </div>

        {/* Snake Pattern */}
        <div className="space-y-3">
          <h3 className="font-semibold">Snake Pattern</h3>
          <div className="p-4 border rounded-lg flex items-center justify-center">
            <DotLoader
              frames={snakePattern}
              duration={100}
              dotClassName="bg-muted-foreground/30 [&.active]:bg-green-500"
            />
          </div>
        </div>

        {/* Spiral Pattern */}
        <div className="space-y-3">
          <h3 className="font-semibold">Spiral Pattern</h3>
          <div className="p-4 border rounded-lg flex items-center justify-center">
            <DotLoader
              frames={spiralPattern}
              duration={200}
              dotClassName="bg-muted-foreground/30 [&.active]:bg-purple-500"
            />
          </div>
        </div>

        {/* Cross Pattern */}
        <div className="space-y-3">
          <h3 className="font-semibold">Cross Pattern</h3>
          <div className="p-4 border rounded-lg flex items-center justify-center">
            <DotLoader
              frames={crossPattern}
              duration={150}
              dotClassName="bg-muted-foreground/30 [&.active]:bg-red-500"
            />
          </div>
        </div>

        {/* Compact Wave */}
        <div className="space-y-3">
          <h3 className="font-semibold">Compact Wave</h3>
          <div className="p-4 border rounded-lg flex items-center justify-center">
            <CompactDotLoader variant="wave" />
          </div>
        </div>

        {/* Compact Pulse */}
        <div className="space-y-3">
          <h3 className="font-semibold">Compact Pulse</h3>
          <div className="p-4 border rounded-lg flex items-center justify-center">
            <CompactDotLoader variant="pulse" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Usage Example</h3>
        <div className="p-4 bg-muted rounded-lg">
          <code className="text-sm">
{`import { DotLoader } from "@/components/ui/dot-loader";

// Custom pattern
const myPattern = [[21], [14, 28], [7, 21, 35]];

<DotLoader 
  frames={myPattern}
  duration={200}
  dotClassName="bg-gray-300 [&.active]:bg-blue-500"
/>`}
          </code>
        </div>
      </div>
    </div>
  );
};
