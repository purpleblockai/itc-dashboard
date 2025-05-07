import { Icons } from "./icons"

export function LoadingSpinner({ className }: { className?: string }) {
  return <Icons.spinner className={`h-6 w-6 animate-spin ${className}`} />
}

export function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <LoadingSpinner />
    </div>
  )
}
