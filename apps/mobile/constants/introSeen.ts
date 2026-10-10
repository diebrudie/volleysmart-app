import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * First-launch flag: whether the user has seen the pre-auth intro carousel.
 * Set once the user leaves the intro (Get Started / Log in / Skip) so returning
 * users go straight to the login screen instead of the intro.
 */
const KEY = "volleysmart-intro-seen";

export async function getIntroSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === "1";
  } catch {
    // On storage failure, treat as "seen" so we never trap users in the intro.
    return true;
  }
}

export async function markIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, "1");
  } catch {
    // Best-effort; a failed write just means the intro shows once more.
  }
}
