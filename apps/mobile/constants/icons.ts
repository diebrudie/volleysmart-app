/**
 * Icon registry: lucide (PWA) -> Ionicons (mobile) name map.
 *
 * Usage:
 *   import { Ionicons } from "@expo/vector-icons";
 *   import { icons } from "@/constants/icons";
 *   <Ionicons name={icons.bell} size={22} color={theme.icon} />
 *
 * Keys are named after the lucide icon the PWA uses (camelCased);
 * values are validated against the Ionicons glyph union at compile time.
 */

import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

/** Full Ionicons glyph-name union. */
export type IoniconsName = ComponentProps<typeof Ionicons>["name"];

export const icons = {
  // Navigation / chrome
  bell: "notifications-outline",
  bellFilled: "notifications",
  menu: "menu",
  home: "home-outline",
  homeFilled: "home",
  users: "people-outline",
  usersFilled: "people",
  calendarDays: "calendar-outline",
  calendarFilled: "calendar",
  building2: "business-outline",
  building2Filled: "business",
  user: "person-outline",
  userFilled: "person",
  settings: "settings-outline",
  logOut: "log-out-outline",
  chevronRight: "chevron-forward",
  chevronLeft: "chevron-back",
  chevronDown: "chevron-down",
  chevronUp: "chevron-up",
  arrowLeft: "arrow-back",
  arrowRight: "arrow-forward",
  externalLink: "open-outline",
  moreHorizontal: "ellipsis-horizontal",
  moreVertical: "ellipsis-vertical",

  // Actions
  plus: "add",
  plusCircle: "add-circle-outline",
  x: "close",
  xCircle: "close-circle",
  check: "checkmark",
  checkCircle: "checkmark-circle",
  checkCircleOutline: "checkmark-circle-outline",
  pencil: "create-outline",
  trash2: "trash-outline",
  share2: "share-outline",
  copy: "copy-outline",
  link: "link-outline",
  refreshCw: "refresh",
  filter: "filter-outline",
  search: "search-outline",
  camera: "camera-outline",
  image: "image-outline",
  upload: "cloud-upload-outline",
  userPlus: "person-add-outline",
  userMinus: "person-remove-outline",
  send: "send-outline",

  // Content / detail
  messageSquare: "chatbubble-outline",
  mapPin: "location-outline",
  clock: "time-outline",
  mail: "mail-outline",
  phone: "call-outline",
  globe: "globe-outline",
  lock: "lock-closed-outline",
  unlock: "lock-open-outline",
  eye: "eye-outline",
  eyeOff: "eye-off-outline",
  info: "information-circle-outline",
  alertCircle: "alert-circle-outline",
  alertTriangle: "warning-outline",
  helpCircle: "help-circle-outline",
  star: "star-outline",
  starFilled: "star",
  heart: "heart-outline",
  heartFilled: "heart",
  trophy: "trophy-outline",
  medal: "medal-outline",
  shield: "shield-outline",
  shieldCheck: "shield-checkmark-outline",
  megaphone: "megaphone-outline",
  barChart: "stats-chart-outline",
  listChecks: "list-outline",
  fileText: "document-text-outline",
  sun: "sunny-outline",
  moon: "moon-outline",
} as const satisfies Record<string, IoniconsName>;

/** Semantic key into the registry, e.g. "bell", "mapPin". */
export type IconKey = keyof typeof icons;

/** Ionicons glyph names actually used by the registry. */
export type IconName = (typeof icons)[IconKey];
