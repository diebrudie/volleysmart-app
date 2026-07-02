import { View, StyleSheet } from "react-native";
import { Button } from "@/components/ui/Button";
import { type RsvpStatus } from "@volleysmart/core";

type Props = {
  currentStatus: RsvpStatus | null;
  isPending: boolean;
  onRsvp: (status: RsvpStatus | null) => void;
};

export function RsvpActions({ currentStatus, isPending, onRsvp }: Props) {
  const isGoing = currentStatus === "attending";
  const isDeclined = currentStatus === "declined";

  return (
    <View style={styles.row}>
      <Button
        title="Going"
        variant={isGoing ? "primary" : "outline"}
        onPress={() => onRsvp(isGoing ? null : "attending")}
        loading={isPending}
        style={styles.button}
      />
      <Button
        title="Not going"
        variant={isDeclined ? "danger" : "outline"}
        onPress={() => onRsvp(isDeclined ? null : "declined")}
        loading={isPending}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12 },
  button: { flex: 1 },
});
