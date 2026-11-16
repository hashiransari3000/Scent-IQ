export default function Loading() {
  return (
    <div className="container-page py-16">
      <div className="skeleton h-3 w-28 rounded-full" />
      <div className="skeleton mt-5 h-16 w-2/3 rounded-2xl" />
      <div className="skeleton mt-4 h-4 w-1/2 rounded-full" />
      <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-[1.6rem] border border-ink/8">
            <div className="skeleton aspect-[4/5]" />
            <div className="space-y-2 p-4">
              <div className="skeleton h-3 w-3/4 rounded-full" />
              <div className="skeleton h-3 w-1/2 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
