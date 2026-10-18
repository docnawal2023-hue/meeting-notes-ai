export default function ComingSoon({ title }) {
  return (
    <div className="rounded-xl bg-white border border-dashed border-slate-300 p-12 text-center">
      <h2 className="text-xl font-semibold text-slate-700">{title}</h2>
      <p className="text-slate-500 mt-2">This page will be built in a later step.</p>
    </div>
  );
}