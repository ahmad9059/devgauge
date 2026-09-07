import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { AppText } from "./AppText";
import { useTheme } from "../theme";

interface SparklineProps {
  /** Percentage-like series 0..100. */
  data: number[];
  width: number;
  height: number;
  color: string | undefined;
  strokeWidth?: number;
  accessibilityLabel?: string;
}

/** Builds a smooth-ish line path through the points. */
const buildLinePath = (points: readonly [number, number][]): string =>
  points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

const buildAreaPath = (points: readonly [number, number][], height: number): string => {
  if (points.length === 0) return "";
  const line = buildLinePath(points);
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return `${line} L${last[0].toFixed(1)},${height} L${first[0].toFixed(1)},${height} Z`;
};

export function Sparkline({
  data,
  width,
  height,
  color,
  strokeWidth = 2,
  accessibilityLabel,
}: SparklineProps): React.JSX.Element {
  const { theme } = useTheme();
  const stroke = color ?? theme.colors.text;

  const flat = data.length === 0;
  const values = flat ? [0, 0] : data;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const stepX = width / Math.max(values.length - 1, 1);
  const pad = strokeWidth;
  const points: [number, number][] = values.map((value, i) => {
    const x = i * stepX;
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return [x, Math.max(0, Math.min(height, y))];
  });

  const label =
    accessibilityLabel ??
    (flat ? "No usage history yet." : `Trend from ${Math.round(min)}% to ${Math.round(max)}% used.`);

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{ width, height, justifyContent: "center" }}
    >
      {flat ? (
        <AppText variant="caption" tone="muted">
          Not enough history
        </AppText>
      ) : (
        <Svg width={width} height={height}>
          <Path
            d={buildAreaPath(points, height)}
            fill={stroke}
            opacity={0.12}
          />
          <Path d={buildLinePath(points)} stroke={stroke} strokeWidth={strokeWidth} fill="none" />
          <Circle
            cx={points[points.length - 1]![0]}
            cy={points[points.length - 1]![1]}
            r={3.5}
            fill={stroke}
          />
        </Svg>
      )}
    </View>
  );
}