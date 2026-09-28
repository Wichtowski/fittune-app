import { Link } from "@tanstack/react-router";
import { ShieldIcon } from "lucide-react";
import type { ReactNode } from "react";

import { BlockedUsers } from "./blocked-users";
import { FindFriend } from "./find-friend";
import { FriendFeed } from "./friend-feed";
import { FriendList } from "./friend-list";
import { FriendRequests } from "./friend-requests";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";

export function FriendsPage() {
  return (
    <>
      <PageHeader
        title={t("Friends")}
        eyebrow={t("Train together, share on your terms")}
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link to="/profile" hash="sharing">
              <ShieldIcon className="size-4" aria-hidden />{t("Sharing")}
            </Link>
          </Button>
        }
      />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="grid min-w-0 grid-cols-1 gap-3 lg:order-2">
          <Card className="grid grid-cols-1 gap-5 p-5">
            <Heading>{t("Add a friend")}</Heading>
            <FindFriend />
            <FriendRequests />
          </Card>
          <Card className="grid grid-cols-1 gap-3 p-5">
            <Heading>{t("Your friends")}</Heading>
            <FriendList />
          </Card>
          <BlockedUsers />
        </section>
        <section className="grid min-w-0 grid-cols-1 gap-3 lg:order-1">
          <Heading>{t("Recent sessions")}</Heading>
          <FriendFeed emptyDescription={t("Finished workouts and activities your friends choose to share show up here.")} />
        </section>
      </div>
    </>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-xl font-bold tracking-wide uppercase">{children}</h2>;
}
