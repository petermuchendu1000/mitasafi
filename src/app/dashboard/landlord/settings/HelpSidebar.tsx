/**
 * The help rail Innago keeps beside its settings.
 *
 * Every answer here is about how MitaSafi actually behaves today, checked
 * against the code it describes. None of it is aspirational: where the honest
 * answer is "that does not exist yet", it says so, because a help panel that
 * describes a product you do not have is worse than no help panel.
 */

import { SUPPORT_EMAIL } from "@/lib/site/urls";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Does MitaSafi hold my rent?",
    a: "No. Tenants pay you directly and MitaSafi records what was paid, which is why there is no payout account to set up and no balance waiting to be released.",
  },
  {
    q: "Why can I not change my sign-in email here?",
    a: "Because changing it on this page would change the address shown and leave the one you actually log in with untouched. Contact support and it is changed in both places.",
  },
  {
    q: "What does a caretaker see?",
    a: "Only the blocks you assign, and only the modules you grant. Suspend them and the access stops immediately. They can never widen their own permissions.",
  },
  {
    q: "Why can tenant access not be limited to one block?",
    a: "A tenant belongs to a lease, not a building, so there is no way to scope them to a block. Tenant access is therefore all of your tenants or none.",
  },
  {
    q: "Some switches say 'saved, but not in effect'. Why?",
    a: "Because the feature they control has not been built yet. The setting is stored so your choice is not lost, and labelled so you are not told something is working when it is not.",
  },
  {
    q: "Will changing my late fee change existing leases?",
    a: "No. A lease keeps the terms it was signed with. Late fee rules apply to leases created from now on.",
  },
  {
    q: "Are notification emails being sent?",
    a: "Not yet. MitaSafi has no scheduled email or SMS, so those preferences decide what you will receive once it does.",
  },
];

export function HelpSidebar() {
  return (
    <aside
      aria-labelledby="help-heading"
      className="xl:w-80 shrink-0 space-y-4"
    >
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2
          id="help-heading"
          className="text-sm font-semibold uppercase tracking-wide text-gray-900"
        >
          Help and support
        </h2>
        <h3 className="mt-4 text-sm font-semibold text-gray-800">FAQs</h3>
        <ul className="mt-2 divide-y divide-gray-100">
          {FAQS.map((f) => (
            <li key={f.q} className="py-2 first:pt-0">
              <details className="group">
                <summary className="cursor-pointer text-sm text-gray-700 hover:text-teal-700 marker:text-gray-400">
                  {f.q}
                </summary>
                <p className="mt-2 text-xs text-gray-600">{f.a}</p>
              </details>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
          Get in touch
        </h2>
        <p className="mt-3 text-sm font-medium text-gray-800">Write to us</p>
        <p className="mt-1 text-xs text-gray-600">
          Email{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-teal-700 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          and we will come back to you within one or two working days.
        </p>
      </div>
    </aside>
  );
}
