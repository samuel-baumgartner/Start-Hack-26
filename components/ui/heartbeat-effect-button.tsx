"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeartbeatEffectButtonProps = ComponentProps<typeof Button>;

export function HeartbeatEffectButton({ className, ...props }: HeartbeatEffectButtonProps) {
  return (
    <Button
      variant="destructive"
      size="lg"
      className={cn("heartbeateffect cursor-pointer rounded-lg font-semibold", className)}
      {...props}
    />
  );
}

const ButtonHeartbeatEffectDemo = () => {
  return (
    <>
      <Button variant="destructive" className="heartbeateffect cursor-pointer">
        Heartbeat Effect
      </Button>
    </>
  );
};

export default ButtonHeartbeatEffectDemo;
