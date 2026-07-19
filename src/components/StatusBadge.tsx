import { StockStatus } from "../types";

type BadgeStatus = StockStatus | "active" | "returned";

const MAP: Record<BadgeStatus, string> = {
  available:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  low: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
  out: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  active:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  returned:
    "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

const LABEL: Record<BadgeStatus, string> = {
  available: "Available",
  low: "Low Stock",
  out: "Out of Stock",
  active: "Active",
  returned: "Returned",
};

export default function StatusBadge({ status }: { status: BadgeStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
        MAP[status] ||
        "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
      }`}
    >
      {LABEL[status] || status}
    </span>
  );
}
