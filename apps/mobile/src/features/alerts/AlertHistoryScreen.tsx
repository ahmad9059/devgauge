import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { AlertEvent } from "@devgauge/contracts";

import { AppText, Button, EmptyState, ScreenHeader, StatusPill, Surface, useTheme } from "../../components";
import { loadAlertEvents } from "../../data/repository";
import { useFocusEffect } from "expo-router";
import { api } from "../../api/client";
import { formatAbsolute } from "../../utils/format";

export function AlertHistoryScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void loadAlertEvents()
        .then((data) => {
          if (!cancelled) setEvents(data);
        })
        .catch(() => {
          if (!cancelled) setError(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const acknowledge = async (id: string): Promise<void> => {
    try {
      await api.acknowledgeAlertEvent(id);
      setEvents((current) => current.map((event) => (event.id === id ? { ...event, acknowledgedAt: new Date().toISOString() } : event)));
    } catch {
      // Non-blocking.
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScreenHeader title="Delivery history" subtitle="Recent alert events" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.lg }}>
        {loading ? (
          <AppText variant="caption" tone="muted">
            Loading…
          </AppText>
        ) : error ? (
          <EmptyState title="Couldn&rsquo;t load history" body="Check your connection and try again." />
        ) : events.length === 0 ? (
          <EmptyState title="No alerts yet" body="When an alert rule fires, its event and delivery result will appear here." />
        ) : (
          events.map((event) => (
            <Surface key={event.id} padded style={{ gap: theme.spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <AppText variant="body">{event.title}</AppText>
                {!event.acknowledgedAt ? (
                  <Button label="Acknowledge" variant="ghost" onPress={() => void acknowledge(event.id)} />
                ) : (
                  <StatusPill status="available" label="Seen" />
                )}
              </View>
              <AppText variant="body" tone="secondary">
                {event.body}
              </AppText>
              <AppText variant="caption" tone="muted">
                {formatAbsolute(event.occurredAt)}
              </AppText>
            </Surface>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
