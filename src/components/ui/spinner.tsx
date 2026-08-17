import { Loader2Icon } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";

export function Spinner({
  className,
  ...props
}: React.ComponentProps<typeof Loader2Icon>): React.ReactElement {
  return (
    <Loader2Icon
      aria-label="Loading"
      className={cn(
        "origin-center animate-[spin_650ms_linear_infinite] motion-reduce:animate-none",
        className,
      )}
      role="status"
      {...props}
    />
  );
}
