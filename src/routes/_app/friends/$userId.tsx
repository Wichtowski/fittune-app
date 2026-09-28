import { createFileRoute } from "@tanstack/react-router";

import { FriendProfile } from "@/features/friends/components/friend-profile";

export const Route = createFileRoute("/_app/friends/$userId")({
  component: FriendProfilePage,
});

function FriendProfilePage() {
  const { userId } = Route.useParams();
  // Keyed so switching between friends never shows the previous one's data
  return <FriendProfile key={userId} userId={userId} />;
}
