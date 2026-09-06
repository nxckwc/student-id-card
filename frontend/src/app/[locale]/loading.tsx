const Block = ({ className }: { className: string }) => <div className={`skeleton rounded-lg ${className}`} />

export default function Loading() {
  return (
    <main className="min-h-screen bg-background px-4 pb-12 pt-22 sm:px-6 lg:px-8" aria-label="Loading page" aria-busy="true">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex items-center gap-3 border-b border-border pb-7">
          <Block className="size-12" />
          <div className="space-y-2"><Block className="h-3 w-28" /><Block className="h-6 w-56" /></div>
        </div>
        <Block className="mb-2 h-3 w-32" />
        <Block className="mb-5 h-8 w-52" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <Block key={item} className="h-48" />)}
        </div>
        <Block className="mb-5 mt-10 h-8 w-32" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => <Block key={item} className="h-20" />)}
        </div>
      </div>
    </main>
  )
}