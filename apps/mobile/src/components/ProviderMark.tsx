import { View } from "react-native";

import { AppText } from "./AppText";
import { PROVIDER_LABELS, useTheme } from "../theme";

interface ProviderMarkProps {
  provider: string;
  size?: number;
}

export function ProviderMark({ provider, size = 40 }: ProviderMarkProps): React.JSX.Element {
  const { theme } = useTheme();
  const color = theme.colors.provider[provider] ?? theme.colors.text;
  const initial = (PROVIDER_LABELS[provider] ?? provider).charAt(0).toUpperCase();

  return (
    <View
      accessible
      accessibilityLabel={PROVIDER_LABELS[provider] ?? provider}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${color}1F`,
        borderWidth: 1,
        borderColor: `${color}66`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AppText
        variant="titleLarge"
        color={color}
        style={{ fontSize: size * 0.44, lineHeight: size * 0.52 }}
      >
        {initial}
      </AppText>
    </View>
  );
}