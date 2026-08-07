import Image from "next/image";

interface UserAvatarProps {
  image?: string | null;
  name: string;
  className?: string;
}

function getInitial(name: string): string {
  const firstWord = name.trim().split(/\s+/)[0];
  return (firstWord || name).charAt(0).toUpperCase();
}

export function UserAvatar({ image, name, className = "" }: UserAvatarProps) {
  if (image) {
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 select-none ${className}`}
      >
        <Image
          src={image}
          alt={name}
          fill
          unoptimized
          sizes="100%"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full overflow-hidden bg-[linear-gradient(135deg,#3b6fe8,#002fa7)] text-white font-bold flex-shrink-0 select-none ${className}`}
    >
      <span className="leading-none">{getInitial(name)}</span>
    </div>
  );
}
