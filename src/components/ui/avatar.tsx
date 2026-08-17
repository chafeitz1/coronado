import Image from "next/image";

const SIZES = {
  sm: "size-8 text-sm",
  lg: "size-20 text-2xl",
} as const;

export function Avatar({
  fullName,
  avatarUrl,
  size = "sm",
}: {
  fullName: string;
  avatarUrl?: string | null;
  size?: keyof typeof SIZES;
}) {
  if (avatarUrl) {
    const dimension = size === "lg" ? 80 : 32;
    return (
      <Image
        src={avatarUrl}
        alt={fullName}
        width={dimension}
        height={dimension}
        className={`shrink-0 rounded-full object-cover ${SIZES[size]}`}
        unoptimized
      />
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary ${SIZES[size]}`}
    >
      {fullName.slice(0, 1).toUpperCase()}
    </span>
  );
}
