/**
 * CardSlider — horizontal snap slider with dot indicators, mirroring the
 * top card slider of apps/web/src/pages/HomeDashboard.tsx (mobile layout).
 *
 * Auto-rotate is implemented but OFF by default (pass autoRotateMs to
 * enable) so Expo-web testing stays deterministic.
 */
import {
  Children,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { spacing } from "@/constants/theme";

type Props = PropsWithChildren<{
  /** Enable auto-rotation by passing an interval in ms (e.g. 15000). */
  autoRotateMs?: number;
}>;

const SIDE_PADDING = spacing.lg; // matches Screen's 16px horizontal padding
const GAP = spacing.md;

export function CardSlider({ children, autoRotateMs }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const slides = Children.toArray(children).filter(Boolean);
  const total = slides.length;

  // ~85vw like the web mobile slider, capped for larger phones/tablets
  const cardWidth = Math.min(Math.round(width * 0.85), 340);
  const interval = cardWidth + GAP;

  const scrollRef = useRef<ScrollView>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.min(Math.max(Math.round(x / interval), 0), total - 1);
    activeRef.current = index;
    setActive(index);
  };

  useEffect(() => {
    if (!autoRotateMs || total <= 1) return;
    const timer = setInterval(() => {
      const next = (activeRef.current + 1) % total;
      scrollRef.current?.scrollTo({ x: next * interval, animated: true });
      activeRef.current = next;
      setActive(next);
    }, autoRotateMs);
    return () => clearInterval(timer);
  }, [autoRotateMs, total, interval]);

  if (total === 0) return null;

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={interval}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {slides.map((slide, i) => (
          <View
            key={i}
            style={[
              styles.slide,
              { width: cardWidth },
              i < total - 1 && { marginRight: GAP },
            ]}
          >
            {slide}
          </View>
        ))}
      </ScrollView>

      {total > 1 ? (
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === active ? theme.textSecondary : theme.cardBorder,
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Bleed out of the Screen padding so cards can peek at the edges
  scroll: { marginHorizontal: -SIDE_PADDING },
  content: { paddingHorizontal: SIDE_PADDING, paddingBottom: spacing.sm },
  slide: { flexGrow: 0 },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs + 2,
    paddingTop: spacing.xs,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
