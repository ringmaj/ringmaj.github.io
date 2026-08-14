import NavigationArrows from "@/Components/NavigationArrows";

export default function ContactPage() {
  return (
    <NavigationArrows>
      <section
        data-page-navigation-ignore
        className="grid h-full min-h-[40em] grid-cols-[0.8fr_1.2fr] items-center gap-12 px-16 max-sm:!min-h-0 max-sm:grid-cols-1 max-sm:content-start max-sm:gap-5 max-sm:overflow-y-auto max-sm:px-8 max-sm:py-5 max-sm:pb-16"
      >
        <div>
          <p className="text-sm font-bold uppercase text-[var(--main-accent-color)]">
            Contact
          </p>
          <h1 className="mt-2 text-5xl font-bold max-sm:text-3xl">Let&apos;s talk.</h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-neutral-600 max-sm:mt-3 max-sm:text-xs max-sm:leading-5">
            Have a role, project, or difficult engineering problem in mind? Send
            a note and include enough context to start a useful conversation.
          </p>
        </div>
        <form
          action="https://formsubmit.co/9bd916966277ffee0988085f3547c6ff"
          method="POST"
          className="grid gap-4 border-l-2 border-[var(--main-accent-color)] pl-8 max-sm:border-l-0 max-sm:border-t-2 max-sm:pt-5 max-sm:pl-0"
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
              className="resize-none border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--main-accent-color)] max-sm:h-24"
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
