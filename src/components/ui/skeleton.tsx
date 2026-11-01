import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/70", className)}
      {...props}
    />
  )
}

export { Skeleton }
