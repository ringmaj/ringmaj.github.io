import Link from "next/link";

export default function ResumePage() {
  return (
    <section className="flex h-full min-h-0 flex-col bg-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-300 bg-white px-8 py-3">
        <div>
          <h1 className="text-lg font-bold">Henry Ring · Resume</h1>
          <p className="text-xs text-neutral-600">
            Software engineering, embedded systems, and DevOps
          </p>
        </div>
        <Link
          href="/Henry_Ring_Resume.pdf"
          download
          className="bg-[var(--main-accent-color)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--main-accent-color-dark)]"
        >
          Download PDF
        </Link>
      </header>
      <iframe
        title="Henry Ring resume"
        src="/Henry_Ring_Resume.pdf"
        className="min-h-0 flex-1 border-0"
      />
    </section>
  );
}
