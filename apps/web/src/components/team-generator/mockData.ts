import { Player } from "@/types/supabase";

// Mock players data with gender added
export const allPlayers: Player[] = Array.from({ length: 24 }, (_, i) => {
  const positions = [
    "Setter",
    "Outside Hitter",
    "Middle Blocker",
    "Opposite",
    "Libero",
  ];
  const randomPositions = [];
  const numPositions = Math.floor(Math.random() * 2) + 1; // 1-2 positions per player

  for (let j = 0; j < numPositions; j++) {
    const pos = positions[Math.floor(Math.random() * positions.length)];
    if (!randomPositions.includes(pos)) {
      randomPositions.push(pos);
    }
  }

  // Explicitly set gender as one of the allowed types
  const gender: "male" | "female" | "other" =
    Math.random() > 0.5 ? "male" : "female";

  return {
    id: i + 1,
    name: [
      "Alex Johnson",
      "Maya Rivera",
      "Jordan Smith",
      "Taylor Lee",
      "Casey Jones",
      "Sam Washington",
      "Jamie Chen",
      "Riley Kim",
      "Morgan Patel",
      "Drew Garcia",
      "Quinn Brown",
      "Avery Williams",
      "Cameron Nguyen",
      "Dakota Wilson",
      "Emerson Davis",
      "Finley Moore",
      "Gray Thompson",
      "Harper Martin",
      "Indigo Clark",
      "Jordan Allen",
      "Kendall Baker",
      "Logan Hall",
      "Mason Wright",
      "Noah Turner",
    ][i],
    email: `player${i + 1}@example.com`,
    positions: randomPositions,
    preferredPosition: randomPositions[0],
    skillRating: Math.floor(Math.random() * 3) + 3, // Rating 3-5
    availability: Math.random() > 0.2, // 80% available,
    gender,
    matchesPlayed: Math.floor(Math.random() * 10),
    isPublic: true,
  };
});
