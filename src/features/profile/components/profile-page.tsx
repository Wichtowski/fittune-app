import { t } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import { AccountSecurity } from "./account-security";
import { ProfileForm } from "./profile-form";
import { meQuery } from "@/api/auth";
import { PageHeader } from "@/components/layout/page-header";
import { LanguagePicker } from "@/components/language-picker";
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
      <PageHeader title={t("Profile")} eyebrow={user ? `@${user.username}` : undefined} actions={<SignOutButton />} />

      <div className="grid gap-4">
        <Section title={t("Profile & units")}>
          {user ? (
            <ProfileForm key={user.id} user={user} />
          ) : (
            <QueryFallback query={me}>
              <Skeleton className="h-64" />
            </QueryFallback>
          )}
        </Section>

        <Section title={t("Appearance")}>
          <ToggleGroup
            type="single"
            value={preference}
            onValueChange={(value) => value && setPreference(value as ThemePreference)}
            aria-label={t("Theme")}
            className="w-full sm:w-auto"
          >
            <ToggleGroupItem value="system">
              <MonitorIcon className="mr-1.5 size-4" aria-hidden />{" "}{t("System")}{" "}</ToggleGroupItem>
            <ToggleGroupItem value="dark">
              <MoonIcon className="mr-1.5 size-4" aria-hidden />{" "}{t("Dark")}{" "}</ToggleGroupItem>
            <ToggleGroupItem value="light">
              <SunIcon className="mr-1.5 size-4" aria-hidden />{" "}{t("Light")}{" "}</ToggleGroupItem>
          </ToggleGroup>
        </Section>

        <Section title={t("Language")}><LanguagePicker /></Section>

        <Section title={t("Offline data")}>
          <OfflineData />
        </Section>

        <Section title={t("Security")}>
          <AccountSecurity />
        </Section>

        {user?.role === "admin" ? (
          <Section title={t("Invites")}>
            <p className="mb-4 text-sm text-muted-foreground">{t("FitTune is invite only. Create a code for each person you want to let in.")}</p>
            <div className="grid gap-6">
              <CreateInvite />
              <InviteList />
            </div>
          </Section>
        ) : null}

        <Card className="grid gap-2 p-5 text-sm text-muted-foreground">
          <SyncIndicator />
          {user ? <p>{t("Member since")}{" "}{formatDate(user.created_at)} · {user.email}</p> : null}
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
        <LogOutIcon className="size-4" aria-hidden />{" "}{t("Sign out")}{" "}</Button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Unsaved workouts on this device")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Unsynced workouts: {count}. Signing out will delete them from this device.", { count: pending })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Stay signed in")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void run()}>{t("Sign out anyway")}{" "}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
