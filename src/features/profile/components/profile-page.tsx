import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import { AccountSecurity } from "./account-security";
import { ProfileForm } from "./profile-form";
import { meQuery } from "@/api/auth";
import { PageHeader } from "@/components/layout/page-header";
import { QueryFallback } from "@/components/query-error";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { signOut } from "@/features/auth/sign-out";
import { CreateInvite } from "@/features/invites/components/create-invite";
import { InviteList } from "@/features/invites/components/invite-list";
import { OfflineData } from "@/features/offline/components/offline-data";
import { SyncIndicator } from "@/features/workouts/components/sync-indicator";
import { usePendingWorkouts } from "@/features/workouts/store";
import { type ThemePreference, useTheme } from "@/hooks/use-theme";
import { APP_VERSION } from "@/lib/env";
import { formatDate } from "@/lib/format";

export function ProfilePage() {
  const me = useQuery(meQuery());
  const user = me.data;
  const { preference, setPreference } = useTheme();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profile" eyebrow={user ? `@${user.username}` : undefined} actions={<SignOutButton />} />

      <div className="grid gap-4">
        <Section title="Profile & units">
          {user ? (
            <ProfileForm key={user.id} user={user} />
          ) : (
            <QueryFallback query={me}>
              <Skeleton className="h-64" />
            </QueryFallback>
          )}
        </Section>

        <Section title="Appearance">
          <ToggleGroup
            type="single"
            value={preference}
            onValueChange={(value) => value && setPreference(value as ThemePreference)}
            aria-label="Theme"
            className="w-full sm:w-auto"
          >
            <ToggleGroupItem value="system">
              <MonitorIcon className="mr-1.5 size-4" aria-hidden /> System
            </ToggleGroupItem>
            <ToggleGroupItem value="dark">
              <MoonIcon className="mr-1.5 size-4" aria-hidden /> Dark
            </ToggleGroupItem>
            <ToggleGroupItem value="light">
              <SunIcon className="mr-1.5 size-4" aria-hidden /> Light
            </ToggleGroupItem>
          </ToggleGroup>
        </Section>

        <Section title="Offline data">
          <OfflineData />
        </Section>

        <Section title="Security">
          <AccountSecurity />
        </Section>

        {user?.role === "admin" ? (
          <Section title="Invites">
            <p className="mb-4 text-sm text-muted-foreground">FitTune is invite only. Create a code for each person you want to let in.</p>
            <div className="grid gap-6">
              <CreateInvite />
              <InviteList />
            </div>
          </Section>
        ) : null}

        <Card className="grid gap-2 p-5 text-sm text-muted-foreground">
          <SyncIndicator />
          {user ? <p>Member since {formatDate(user.created_at)} · {user.email}</p> : null}
          <p>FitTune {APP_VERSION}</p>
        </Card>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 font-display text-xl font-bold tracking-wide uppercase">{title}</h2>
      {children}
    </Card>
  );
}

function SignOutButton() {
  const pending = usePendingWorkouts();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  const run = async () => {
    await signOut();
    void navigate({ to: "/login", replace: true });
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => (pending > 0 ? setConfirming(true) : void run())}>
        <LogOutIcon className="size-4" aria-hidden /> Sign out
      </Button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved workouts on this device</AlertDialogTitle>
            <AlertDialogDescription>
              {pending} workout{pending > 1 ? "s haven't" : " hasn't"} reached the server yet. Signing out now deletes
              {pending > 1 ? " them" : " it"} from this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay signed in</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void run()}>
              Sign out anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
