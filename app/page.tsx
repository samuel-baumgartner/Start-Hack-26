"use client";

import { motion } from "framer-motion";
import { ArrowRight, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16 md:px-10">
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="space-y-4"
      >
        <p className="text-sm font-medium text-muted-foreground">
          Team Starter Kit
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
          Build your product fast with Next.js, shadcn/ui, and motion.
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
          This repository is ready for collaborative development. It includes a
          clean app shell, UI primitives, and guard rails that block pushes when
          the app cannot build.
        </p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: 0.12 }}
      >
        <Card className="border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="size-4" />
              Ready to start coding
            </CardTitle>
            <CardDescription>
              Use this as your launch point for features, pages, and shared UI
              components.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            <p>Tech stack: Next.js App Router + TypeScript + Tailwind CSS.</p>
            <p>UI stack: shadcn/ui components and Framer Motion animations.</p>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button size="lg">Start building</Button>
            <Button size="lg" variant="outline">
              View docs
              <ArrowRight className="size-4" />
            </Button>
          </CardFooter>
        </Card>
      </motion.section>
    </main>
  );
}
