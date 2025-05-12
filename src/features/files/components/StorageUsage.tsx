import { Progress } from "@/components/ui/progress";
import { UserStorage } from "../types";

interface StorageUsageProps {
  storage: UserStorage;
}

export const StorageUsage = ({ storage }: StorageUsageProps) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const usagePercentage = (storage.storage_used / storage.storage_limit) * 100;

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center text-sm mb-1">
        <span>Storage usage</span>
        <span>{usagePercentage.toFixed(1)}% used</span>
      </div>
      <Progress value={usagePercentage} className="h-2" />
      <div className="flex justify-end mt-1">
        <span className="text-xs text-gray-500">
          {formatFileSize(storage.storage_used)} of{" "}
          {formatFileSize(storage.storage_limit)}
        </span>
      </div>
    </div>
  );
}; 