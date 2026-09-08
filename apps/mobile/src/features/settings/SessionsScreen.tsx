import { useCallback, useState } from "react";
import { Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, EmptyState, ListRow, ScreenHeader, Surface, useTheme } from "../../components";
import { api } from "../../api/client";
import { useFocusEffect } from "expo-router";
import { formatAge } from "../../utils/format";

interface CompanionDevice {
  id: string;
  label: string;
  lastSeenAt: string;
  revokedAt: string | null;
}

export function SessionsScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const [devices, setDevices] = useState<CompanionDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void api.companionDevices()
        .then((data) => {
          if (!cancelled) setDevices(data.devices);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const revoke = (device: CompanionDevice): void => {
    Alert.alert("Revoke companion device?", `"${device.label}" will stop syncing Claude Code usage.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke",
        style: "destructive",
        onPress: () => {
          void api.revokeCompanionDevice(device.id).then(() => {
            setDevices((current) => current.map((item) => (item.id === device.id ? { ...item, revokedAt: new Date().toISOString() } : item)));
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScreenHeader title="Sessions & devices" subtitle="Companion devices paired to your account" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.lg }}>
        {loading ? (
          <AppText variant="caption" tone="muted">
            Loading…
          </AppText>
        ) : devices.length === 0 ? (
          <EmptyState title="No companion devices" body="Pair the Claude Code companion to sync usage from your desktop." />
        ) : (
          <Surface>
            {devices.map((device) => (
              <ListRow
                key={device.id}
                title={device.label}
                subtitle={device.revokedAt ? `Revoked ${formatAge(device.revokedAt)}` : `Last seen ${formatAge(device.lastSeenAt)}`}
                right={
                  device.revokedAt ? null : <Button label="Revoke" variant="ghost" onPress={() => revoke(device)} />
                }
              />
            ))}
          </Surface>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
