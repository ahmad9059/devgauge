import { Pressable, View } from "react-native";

import { AppText } from "./AppText";
import { useTheme } from "../theme";

export interface SegmentedOption<T> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

export function SegmentedControl<T>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>): React.JSX.Element {
  const { theme } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: "row",
        backgroundColor: theme.colors.surfaceSunken,
        borderRadius: theme.radius.pill,
        padding: 3,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              {
                minHeight: 40,
                paddingHorizontal: theme.spacing.lg,
                borderRadius: theme.radius.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: selected ? theme.colors.accent : "transparent",
                opacity: pressed && !selected ? 0.7 : 1,
              },
            ]}
          >
            <AppText
              variant="label"
              color={selected ? theme.colors.onAccent : theme.colors.textSecondary}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}