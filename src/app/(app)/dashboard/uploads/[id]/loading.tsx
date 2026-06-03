export default function ContractLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="skeleton h-5 w-5 rounded-md" />
        <div className="skeleton h-5 w-52 rounded-md" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="skeleton h-[70vh] rounded-xl" />
        <div className="flex flex-col gap-4">
          <div className="skeleton h-32 rounded-xl" />
          <div className="skeleton h-40 rounded-xl" />
          <div className="skeleton h-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
