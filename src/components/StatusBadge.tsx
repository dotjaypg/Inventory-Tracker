import { StockStatus } from "../types";

type BadgeStatus = StockStatus | "active" | "returned";

const MAP: Record<BadgeStatus, string> = {
  available: "bg-green-50 text-green-700 border-green-200",
  low: "bg-yellow-50 text-yellow-700 border-yellow-200",
  out: "bg-red-50 text-red-700 border-red-200",
  active: "bg-blue-50 text-blue-700 border-blue-200",
  returned: "bg-gray-100 text-gray-600 border-gray-200",
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
        MAP[status] || "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      {LABEL[status] || status}
    </span>
  );
}
