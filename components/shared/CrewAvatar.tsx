"use client";

interface CrewAvatarProps {
  avatar?: "male" | "female" | string;
  size?: "sm" | "md";
}

const sizeClasses: Record<NonNullable<CrewAvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-base",
};

const avatarColor: Record<string, string> = {
  male: "bg-[#e0e2f8] text-[#36398e]",
  female: "bg-[#fde2ec] text-[#8f2d56]",
};

export function CrewAvatar({ avatar = "male", size = "md" }: CrewAvatarProps) {
  const label = typeof avatar === "string" && avatar.length > 0 ? avatar[0].toUpperCase() : "A";
  return (
    <span
      className={`flex items-center justify-center rounded-full font-semibold ${sizeClasses[size]} ${avatarColor[avatar] ?? avatarColor.male}`}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}
