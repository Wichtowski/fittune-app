import type * as React from "react";

import { Logo } from "@/components/layout/logo";
import { AuthBackground } from "@/features/auth/components/auth-background";
import { ConnectionBanner } from "@/features/offline/components/connection-banner";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh md:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-card md:flex md:flex-col md:justify-between md:p-12">
        <AuthBackground />
        <Logo className="relative z-10" />
        <div className="relative z-10">
          <p className="font-display text-4xl leading-[0.95] font-bold tracking-wide whitespace-nowrap uppercase lg:text-5xl xl:text-6xl 2xl:text-7xl">
            Every rep <span className="text-primary-strong">counts.</span>
          </p>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Log sets in seconds at the gym, then dig into volume, records and trends when you are home.
          </p>
        </div>
        <div aria-hidden className="absolute -right-24 -bottom-24 size-96 rounded-full bg-primary/15 blur-3xl" />
        <p className="relative z-10 text-sm text-muted-foreground">Works offline. Syncs when you are back.</p>
      </section>
      <section className="flex flex-col justify-center px-5 pt-[calc(env(safe-area-inset-top)+2rem)] pb-10 md:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Logo className="mb-10 md:hidden" />
          <h1 className="font-display text-4xl font-bold tracking-wide uppercase">{title}</h1>
          <p className="mt-1 mb-8 text-muted-foreground">{subtitle}</p>
          <ConnectionBanner className="mb-6" />
          {children}
        </div>
      </section>
    </div>
  );
}
