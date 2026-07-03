import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Tabs, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme } from "@/hooks/useTheme";
import { TopBar } from "@/components/TopBar";
import { CreateFAB } from "@/components/CreateFAB";
import { MenuDrawer } from "@/components/MenuDrawer";
import { icons } from "@/constants/icons";

const TAB_CONFIG = [
  { name: "index", label: "Home", icon: "home-outline", iconActive: "home" },
  {
    name: "events",
    label: "Events",
    icon: "calendar-outline",
    iconActive: "calendar",
  },
  { name: "__fab__", label: "", icon: icons.plus, iconActive: icons.plus },
  {
    name: "clubs",
    label: "Clubs",
    icon: "business-outline",
    iconActive: "business",
  },
  {
    name: "members",
    label: "Members",
    icon: "people-outline",
    iconActive: "people",
  },
] as const;

function getTitle(pathname: string): string {
  if (pathname.includes("/events")) return "Events";
  if (pathname.includes("/clubs")) return "Clubs";
  if (pathname.includes("/members")) return "Members";
  return "Home";
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const realTabs = state.routes;
  const tabIndexMap: Record<string, number> = {};
  realTabs.forEach((route, i) => {
    tabIndexMap[route.name] = i;
  });

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: t.background,
          borderTopColor: t.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <CreateFAB />
      {TAB_CONFIG.map((tab) => {
        if (tab.name === "__fab__") {
          return <View key="fab-slot" style={styles.tabItem} />;
        }

        const routeIndex = tabIndexMap[tab.name];
        const isActive = state.index === routeIndex;

        return (
          <Pressable
            key={tab.name}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: state.routes[routeIndex].key,
                canPreventDefault: true,
              });
              if (!event.defaultPrevented) {
                navigation.navigate(state.routes[routeIndex].name);
              }
            }}
            style={styles.tabItem}
          >
            <Ionicons
              name={
                (isActive ? tab.iconActive : tab.icon) as keyof typeof Ionicons.glyphMap
              }
              size={24}
              color={isActive ? t.tabActive : t.tabInactive}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? t.tabActive : t.tabInactive },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <>
      <TopBar title={title} onMenuPress={() => setMenuOpen(true)} />
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="events" />
        <Tabs.Screen name="clubs" />
        <Tabs.Screen name="members" />
      </Tabs>
      <MenuDrawer visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 8,
    position: "relative",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
});
