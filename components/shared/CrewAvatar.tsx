import type { AstronautProfile } from "@/types/greenhouse";

interface CrewAvatarProps {
  avatar: AstronautProfile["avatar"];
  size?: "sm" | "md";
}

export function CrewAvatar({ avatar, size = "sm" }: CrewAvatarProps) {
  const isSmall = size === "sm";
  const wrapperSize = isSmall ? "h-8 w-8" : "h-10 w-10";
  const iconSize = isSmall ? 30 : 36;

  return (
    <span
      className={`flex ${wrapperSize} shrink-0 items-center justify-center rounded-full bg-[#e0e2f8]`}
      aria-hidden="true"
    >
      {avatar === "female" ? (
        <svg width={iconSize} height={iconSize} viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="18" fill="#43A7D9" />
          <path d="M9 30.2C9.8 25.9 13.5 23 18 23C22.5 23 26.2 25.9 27 30.2L18 36L9 30.2Z" fill="#C9D4D9" />
          <path d="M9.7 28.9C9.7 22.1 11.1 11.4 18 11.4C24.9 11.4 26.3 22.1 26.3 28.9H9.7Z" fill="#2B1B59" />
          <path
            d="M18 10.6C14.7 10.6 12 13.2 12 16.5V17.1C12 20.4 14.7 23 18 23C21.3 23 24 20.4 24 17.1V16.5C24 13.2 21.3 10.6 18 10.6Z"
            fill="#D59167"
          />
          <path d="M14.2 13.4C16.2 12.5 18.9 11.1 20.7 9.3C22.8 9.8 24.3 11.8 24.3 14.2V15.1H24C20.4 15.1 17 14.5 14.2 13.4Z" fill="#2B1B59" />
        </svg>
      ) : (
        <svg width={iconSize} height={iconSize} viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="18" fill="#43A7D9" />
          <path d="M9 30.2C9.8 25.9 13.5 23 18 23C22.5 23 26.2 25.9 27 30.2L18 36L9 30.2Z" fill="#C9D4D9" />
          <path
            d="M18 10.8C14.7 10.8 12 13.4 12 16.7V17.3C12 20.6 14.7 23.2 18 23.2C21.3 23.2 24 20.6 24 17.3V16.7C24 13.4 21.3 10.8 18 10.8Z"
            fill="#D59167"
          />
          <path d="M13.5 13.5C14 11 15.8 9.2 18 9.2C20.4 9.2 22.4 11.2 22.6 13.8C20.6 13.3 18.2 13 15.8 13C15 13 14.2 13.2 13.5 13.5Z" fill="#2B1B59" />
        </svg>
      )}
    </span>
  );
}
