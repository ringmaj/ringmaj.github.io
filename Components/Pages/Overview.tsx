import Terminal from "../Terminal";

export default function Overview() {
  return (
    <section className="h-full w-full bg-white px-7 py-8 sm:px-12 lg:px-20">
      <div className="mx-auto grid h-full max-w-[1120px] min-h-0 items-center gap-8 lg:grid-cols-[minmax(16rem,0.72fr)_minmax(31rem,1.28fr)] lg:gap-12">
        <header className="max-w-md lg:-translate-y-4">
          <p className="mb-3 text-[0.68rem] font-bold uppercase tracking-[0.28em] text-[var(--main-accent-color-dark)]">
            Interactive introduction
          </p>
          <h1 className="max-w-sm text-[clamp(2rem,4vw,3.5rem)] font-bold leading-[0.98] tracking-[-0.04em] text-black">
            Everybody loves terminals, right?
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-6 text-black/60">
            A brief introduction, served the old-fashioned way. Watch the shell
            session run, or replay it from the title bar.
          </p>
        </header>
        <Terminal />
      </div>
    </section>
  );
}
