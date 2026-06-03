export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-7 w-64 rounded-md" />
        <div className="skeleton h-4 w-40 rounded-md" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="skeleton h-28 rounded-xl md:col-span-1" />
        <div className="skeleton h-28 rounded-xl md:col-span-1" />
      </div>
      <div className="skeleton h-64 rounded-xl" />
    </div>
  );
}
