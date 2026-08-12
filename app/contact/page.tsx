import NavigationArrows from "@/Components/NavigationArrows";

export default function ContactPage() {
  return (
    <NavigationArrows>
      <section className="grid h-full min-h-[40em] grid-cols-[0.8fr_1.2fr] items-center gap-12 px-16">
        <div>
          <p className="text-sm font-bold uppercase text-[var(--main-accent-color)]">
            Contact
          </p>
          <h1 className="mt-2 text-5xl font-bold">Let&apos;s talk.</h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-neutral-600">
            Have a role, project, or difficult engineering problem in mind? Send
            a note and include enough context to start a useful conversation.
          </p>
        </div>
        <form
          action="https://formsubmit.co/9bd916966277ffee0988085f3547c6ff"
          method="POST"
          className="grid gap-4 border-l-2 border-[var(--main-accent-color)] pl-8"
        >
          <input type="hidden" name="_captcha" value="false" />
          <input type="hidden" name="_subject" value="Portfolio Email" />
          <label className="grid gap-1 text-xs font-semibold">
            Name
            <input
              required
              name="name"
              autoComplete="name"
              className="border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--main-accent-color)]"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            Email
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              className="border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--main-accent-color)]"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            Message
            <textarea
              required
              name="message"
              rows={7}
              className="resize-none border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--main-accent-color)]"
            />
          </label>
          <button
            type="submit"
            className="w-fit bg-[var(--main-accent-color)] px-5 py-2 text-sm font-bold text-white hover:bg-[var(--main-accent-color-dark)]"
          >
            Send message
          </button>
        </form>
      </section>
    </NavigationArrows>
  );
}
