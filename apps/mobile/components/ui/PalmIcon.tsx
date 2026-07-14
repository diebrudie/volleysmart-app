import { MaterialCommunityIcons } from "@expo/vector-icons";

/**
 * Palm tree glyph used everywhere we mark a "beach" activity.
 *
 * Ionicons has no palm tree, so we render MaterialCommunityIcons "palm-tree"
 * (the mobile counterpart of lucide's `Palmtree` used across the PWA). Keep
 * every beach affordance pointing at this one component so the icon stays
 * consistent across the event card, event detail, and the create/edit form.
 */
export function PalmIcon({
  size = 16,
  color,
}: {
  size?: number;
  color: string;
}) {
  return <MaterialCommunityIcons name="palm-tree" size={size} color={color} />;
}
