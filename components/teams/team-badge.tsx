import Image from "next/image";
import { Team } from "@/types/database";
import { cn } from "@/lib/utils";

interface TeamBadgeProps {
  team: Team;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-16 w-16",
};

export function TeamBadge({ team, size = "md", showName = true, className }: TeamBadgeProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative rounded-full overflow-hidden border", sizeClasses[size])}>
        {team.logo_url ? (
          <Image src={team.logo_url} alt={team.name} fill className="object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full w-full bg-muted text-muted-foreground text-xs font-bold">
            {team.short_name}
          </div>
        )}
      </div>
      {showName && (
        <span
          className={cn(
            "font-medium",
            size === "sm" && "text-sm",
            size === "md" && "text-base",
            size === "lg" && "text-lg"
          )}
        >
          {team.short_name}
        </span>
      )}
    </div>
  );
}
