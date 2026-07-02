import { type PropsWithChildren, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/Button";
import { KeyboardAwareScreen } from "@/components/ui/KeyboardAwareScreen";
import { Sheet } from "@/components/ui/Sheet";
import { Dialog } from "@/components/ui/Dialog";
import { Select, type SelectOption } from "@/components/ui/Select";
import { DateField } from "@/components/ui/DateField";
import { TimeField } from "@/components/ui/TimeField";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Chip } from "@/components/ui/Chip";
import { Checkbox } from "@/components/ui/Checkbox";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";
import { StepperHeader } from "@/components/ui/StepperHeader";
import { spacing, typography } from "@/constants/theme";

/**
 * DEV-only gallery of the shared UI primitives so a tester can
 * exercise them (Expo web + native). Not reachable in production.
 */
export default function DevComponentsScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Gallery />;
}

const POSITIONS: SelectOption<string>[] = [
  { label: "Setter", value: "setter" },
  { label: "Outside Hitter", value: "outside" },
  { label: "Middle Blocker", value: "middle" },
  { label: "Opposite", value: "opposite" },
  { label: "Libero", value: "libero" },
];

function Gallery() {
  const t = useTheme();

  // Knobs
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tallSheetOpen, setTallSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [destructiveOpen, setDestructiveOpen] = useState(false);
  const [reasonResult, setReasonResult] = useState<string | null>(null);

  const [position, setPosition] = useState<string | null>(null);
  const [positions, setPositions] = useState<string[]>([]);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);

  const [tab, setTab] = useState("upcoming");
  const [tripleTab, setTripleTab] = useState("stats");
  const [chipSelected, setChipSelected] = useState(false);
  const [checked, setChecked] = useState(false);
  const [search, setSearch] = useState("");
  const [step, setStep] = useState(1);

  return (
    <KeyboardAwareScreen>
      <Text style={[styles.pageTitle, { color: t.text }]}>UI Primitives</Text>

      <Section title="SegmentedTabs">
        <SegmentedTabs
          segments={[
            { key: "upcoming", label: "Upcoming" },
            { key: "past", label: "Past" },
          ]}
          activeKey={tab}
          onChange={setTab}
        />
        <SegmentedTabs
          segments={[
            { key: "stats", label: "Stats" },
            { key: "games", label: "Games" },
            { key: "clubs", label: "Clubs" },
          ]}
          activeKey={tripleTab}
          onChange={setTripleTab}
        />
      </Section>

      <Section title="Chip">
        <View style={styles.rowWrap}>
          <Chip
            label="Toggle me"
            selected={chipSelected}
            onPress={() => setChipSelected((s) => !s)}
          />
          <Chip label="With icon" icon="mapPin" onPress={() => {}} />
          <Chip label="Attending" selected count={12} onPress={() => {}} />
          <Chip label="Disabled" disabled onPress={() => {}} />
        </View>
      </Section>

      <Section title="Checkbox">
        <Checkbox
          checked={checked}
          onChange={setChecked}
          label="I agree to play fair"
        />
      </Section>

      <Section title="SearchInput (300ms debounce)">
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search members..."
          debounceMs={300}
        />
        <Text style={[styles.hint, { color: t.textSecondary }]}>
          Debounced value: &quot;{search}&quot;
        </Text>
      </Section>

      <Section title="Select (single / multi)">
        <Select
          label="Position"
          placeholder="Pick a position"
          options={POSITIONS}
          value={position}
          onChange={setPosition}
        />
        <Select
          label="Positions (multi)"
          placeholder="Pick one or more"
          options={POSITIONS}
          multiple
          value={positions}
          onChange={setPositions}
        />
      </Section>

      <Section title="DateField / TimeField">
        <DateField
          label="Event date"
          placeholder="Pick a date"
          value={date}
          onChange={setDate}
          minDate={new Date()}
        />
        <TimeField
          label="Start time"
          placeholder="Pick a time"
          value={time}
          onChange={setTime}
        />
      </Section>

      <Section title="Sheet">
        <View style={styles.rowWrap}>
          <Button
            title="Open sheet"
            variant="secondary"
            onPress={() => setSheetOpen(true)}
          />
          <Button
            title="Fixed-height sheet"
            variant="secondary"
            onPress={() => setTallSheetOpen(true)}
          />
        </View>
      </Section>

      <Section title="Dialog">
        <View style={styles.rowWrap}>
          <Button
            title="Confirm dialog"
            variant="secondary"
            onPress={() => setDialogOpen(true)}
          />
          <Button
            title="Destructive + reason"
            variant="danger"
            onPress={() => setDestructiveOpen(true)}
          />
        </View>
        {reasonResult !== null ? (
          <Text style={[styles.hint, { color: t.textSecondary }]}>
            Last reason: &quot;{reasonResult}&quot;
          </Text>
        ) : null}
      </Section>

      <Section title="Skeleton">
        <Skeleton width="60%" height={20} />
        <Skeleton width="90%" />
        <SkeletonRow avatar lines={2} />
      </Section>

      <Section title="StepperHeader">
        <StepperHeader
          step={step}
          totalSteps={3}
          title="Create Event"
          onBack={step > 1 ? () => setStep((s) => Math.max(1, s - 1)) : undefined}
        />
        <View style={styles.rowWrap}>
          <Button
            title="Next step"
            variant="secondary"
            onPress={() => setStep((s) => (s >= 3 ? 1 : s + 1))}
          />
        </View>
      </Section>

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Content-sized sheet"
      >
        <Text style={[styles.sheetBody, { color: t.text }]}>
          This sheet snaps to its content. Drag the handle down or tap the
          backdrop to close.
        </Text>
        <Button title="Close" onPress={() => setSheetOpen(false)} />
      </Sheet>

      <Sheet
        visible={tallSheetOpen}
        onClose={() => setTallSheetOpen(false)}
        title="Fixed-height sheet"
        snapToContent={false}
        maxHeightRatio={0.6}
      >
        {Array.from({ length: 30 }, (_, i) => (
          <Text key={i} style={[styles.sheetBody, { color: t.text }]}>
            Scrollable row {i + 1}
          </Text>
        ))}
      </Sheet>

      <Dialog
        visible={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Save changes?"
        message="Your edits will be visible to all club members."
        confirmLabel="Save"
        onConfirm={() => setDialogOpen(false)}
      />

      <Dialog
        visible={destructiveOpen}
        onClose={() => setDestructiveOpen(false)}
        title="Delete event?"
        message="This cannot be undone. Optionally tell attendees why."
        confirmLabel="Delete"
        destructive
        withReasonInput
        reasonPlaceholder="Reason (optional)"
        onConfirm={(reason) => {
          setReasonResult(reason ?? "");
          setDestructiveOpen(false);
        }}
      />
    </KeyboardAwareScreen>
  );
}

function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  const t = useTheme();
  return (
    <View style={[styles.section, { borderColor: t.cardBorder }]}>
      <Text style={[styles.sectionTitle, { color: t.textSecondary }]}>
        {title}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    ...typography.h1,
    marginBottom: spacing.lg,
  },
  section: {
    borderTopWidth: 1,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionBody: {
    gap: spacing.md,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
  },
  hint: {
    ...typography.bodySm,
  },
  sheetBody: {
    ...typography.body,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
});
