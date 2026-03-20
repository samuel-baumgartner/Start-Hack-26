"use client";

import Image from "next/image";

interface CrewAvatarProps {
  avatar?: "male" | "female" | string;
  size?: "sm" | "md";
}

const sizeClasses: Record<NonNullable<CrewAvatarProps["size"]>, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
};

const avatarImageByKey: Record<string, string> = {
  ari: "/avatars/ari.svg",
  maya: "/avatars/maya.svg",
  "luis-photo": "/ProfileImage.jpeg",
};

export function CrewAvatar({ avatar = "male", size = "md" }: CrewAvatarProps) {
  const src = avatarImageByKey[avatar] ?? "/avatars/ari.svg";

  return (
    <span
      className={`relative overflow-hidden rounded-full border border-[#d9e7db] bg-white ${sizeClasses[size]}`}
      aria-hidden="true"
    >
      <Image
        src={src}
        alt={`${avatar} avatar`}
        fill
        className="object-cover"
        sizes={size === "sm" ? "32px" : "40px"}
      />
    </span>
  );
}
