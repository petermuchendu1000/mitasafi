"use client";

/**
 * Help and support.
 *
 * The content lives in lib/landlord/help-content.ts as data, so that every
 * link in it is checked by the internal-link test and the page cannot start
 * pointing at routes that do not exist.
 *
 * WHAT IS ON SCREEN THAT USUALLY IS NOT
 *   A list of what MitaSafi does NOT do. A landlord planning around this
 *   product needs that more than they need another reassuring paragraph, and
 *   finding out by discovering that no reminder was ever sent is worse than
 *   reading it here.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  Mail,
  CircleSlash,
  ArrowRight,
} from "lucide-react";
import {
  HELP_SECTIONS,
  NOT_BUILT,
  searchHelp,
  countTopics,
  type HelpTopic,
} from "@/lib/landlord/help-content";

function Topic({
  topic,
  open,
  onToggle,
}: {
  topic: HelpTopic;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = `help-panel-${topic.id}`;
  const buttonId = `help-button-${topic.id}`;
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="w-full flex items-center justify-between gap-4 px-4 sm:px-5 py-4 min-h-[44px] text-left hover:bg-gray-50"
        >
          <span className="text-sm font-medium text-gray-900">
            {topic.question}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </h3>
      {/* Rendered only when open: a hidden panel that is still in the
          accessibility tree makes the whole page one long wall of text to a
          screen reader, which is the opposite of what an accordion is for. */}
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="px-4 sm:px-5 pb-5 space-y-3"
        >
          {topic.answer.map((p, i) => (
            <p key={i} className="text-sm text-gray-700 leading-relaxed">
              {p}
            </p>
          ))}

          {topic.steps && (
            <ol className="space-y-2 pl-1">
              {topic.steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span
                    aria-hidden="true"
                    className="shrink-0 w-5 h-5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium grid place-items-center"
                  >
                    {i + 1}
                  </span>
                  {/* The number is decorative here because the list is
                      already ordered; a screen reader announces "1 of 6"
                      from the <ol>, so reading the digit twice is noise. */}
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          )}

          {topic.links && topic.links.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {topic.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-lg border border-gray-300 text-sm text-gray-700 hover:border-teal-500 hover:text-teal-700"
                >
                  {l.label}
                  <ArrowRight aria-hidden="true" className="w-3.5 h-3.5" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function HelpClient({ supportEmail }: { supportEmail: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const sections = useMemo(() => searchHelp(HELP_SECTIONS, query), [query]);
  const found = countTopics(sections);
  const searching = query.trim() !== "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Help &amp; support</h1>
        <p className="mt-1 text-gray-500">
          How it works, and what it does not do yet
        </p>
      </div>

      <div className="relative">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
        />
        <label htmlFor="help-search" className="sr-only">
          Search help
        </label>
        <input
          id="help-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: paybill, caretaker, arrears"
          className="w-full rounded-lg border border-gray-300 pl-9 pr-3 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {searching && (
        <p role="status" className="text-sm text-gray-600">
          {found === 0
            ? "Nothing matches that."
            : `${found} ${found === 1 ? "answer" : "answers"} for “${query.trim()}”.`}
        </p>
      )}

      {found === 0 && searching ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-600">
            Nothing here covers that yet. Email{" "}
            <a
              href={`mailto:${supportEmail}`}
              className="text-teal-700 underline"
            >
              {supportEmail}
            </a>{" "}
            and describe what you were trying to do.
          </p>
        </div>
      ) : (
        sections.map((section) => (
          <section
            key={section.id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">
                {section.title}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">{section.blurb}</p>
            </div>
            {section.topics.map((t) => (
              <Topic
                key={t.id}
                topic={t}
                // While searching, everything is open: the point of a search
                // result is to read it, not to click it open one by one.
                open={searching || Boolean(open[t.id])}
                onToggle={() => setOpen((o) => ({ ...o, [t.id]: !o[t.id] }))}
              />
            ))}
          </section>
        ))
      )}

      {!searching && (
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">
              What MitaSafi does not do yet
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              So you can plan around it.
            </p>
          </div>
          <ul className="divide-y divide-gray-100">
            {NOT_BUILT.map((n) => (
              <li key={n.what} className="px-4 sm:px-5 py-4 flex gap-3">
                <CircleSlash
                  aria-hidden="true"
                  className="w-4 h-4 shrink-0 mt-0.5 text-gray-400"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{n.what}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{n.why}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900">Still stuck?</h2>
        <p className="mt-2 text-sm text-gray-600">
          Say what you were trying to do and what happened. For a payment,
          include the M-Pesa code. Never send your PIN. Nobody at MitaSafi will
          ever ask for it.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`mailto:${supportEmail}`}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg bg-teal-600 text-white text-sm font-medium"
          >
            <Mail aria-hidden="true" className="w-4 h-4" />
            {supportEmail}
          </a>
          <Link
            href="/contact"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg border border-gray-300 text-sm text-gray-700"
          >
            Other ways to reach us
          </Link>
        </div>
      </section>
    </div>
  );
}
