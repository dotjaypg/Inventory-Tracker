import { CategoryKey, CATEGORIES } from "../types";

function initials(name: string) {
  return name
    .split(" ")
    .filter((w) => w.length)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const SIZE_MAP = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-2xl",
};

export default function ItemIcon({
  name,
  category,
  image,
  size = "sm",
}: {
  name: string;
  category: CategoryKey;
  image: string | null;
  size?: keyof typeof SIZE_MAP;
}) {
  const cat = CATEGORIES[category];
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={`${SIZE_MAP[size]} rounded-lg object-cover flex-shrink-0 border border-border`}
      />
    );
  }
  return (
    <div
      className={`${SIZE_MAP[size]} rounded-lg flex items-center justify-center font-semibold flex-shrink-0`}
      style={{ backgroundColor: cat.bg, color: cat.text }}
    >
      {initials(name)}
    </div>
  );
}
