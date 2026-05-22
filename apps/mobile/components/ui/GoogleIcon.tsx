import { Image } from "expo-image";

type Props = { size?: number };

export function GoogleIcon({ size = 20 }: Props) {
  return (
    <Image
      source={{
        uri: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg",
      }}
      style={{ width: size, height: size }}
      contentFit="contain"
    />
  );
}
