/**
 * What the help page says.
 *
 * WHY THIS IS DATA AND NOT JSX
 *   A help page is a set of factual claims about the software, and the way it
 *   fails is by drifting: a page describing a feature that was changed, or
 *   linking to one that was never built. As data it can be checked. Every
 *   `href` below is written as an object property, which is the form
 *   src/__tests__/internal-links-resolve.test.ts already scans — so a link
 *   here to a route that does not exist fails the build, and the help page
 *   cannot quietly start lying about where things are.
 *
 * THE RULE FOR WRITING IN HERE
 *   Describe only what the product does today. Anything planned, partial or
 *   absent belongs in NOT_BUILT, where it is shown to the landlord as not
 *   built. A landlord who follows an instruction that does not work loses
 *   more than one who is told plainly that something is missing.
 */

export interface HelpLink {
  label: string;
  href: string;
}

export interface HelpTopic {
  id: string;
  question: string;
  /** Paragraphs, in order. */
  answer: string[];
  /** An ordered procedure, where the answer is a set of steps. */
  steps?: string[];
  links?: HelpLink[];
  /** Extra words this topic should be findable by. */
  keywords?: string[];
}

export interface HelpSection {
  id: string;
  title: string;
  blurb: string;
  topics: HelpTopic[];
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "getting-started",
    title: "Getting started",
    blurb: "The order things need to happen in, once.",
    topics: [
      {
        id: "setup-order",
        question: "What order do I set everything up in?",
        answer: [
          "Each step depends on the one before it: a lease needs a unit and a tenant, and rent cannot be matched to a lease that does not exist yet.",
        ],
        steps: [
          "Add a property, and the units inside it.",
          "Add a tenant.",
          "Create a lease: the rent, the day it is due, and how many days' grace you allow.",
          "Tell MitaSafi where rent should be paid, under Settings.",
          "Give the tenant the instruction — they can also see it themselves once they have an account.",
          "Record what arrives, either by hand or by pasting your M-Pesa messages into Reconcile.",
        ],
        links: [
          {
            label: "Add a property",
            href: "/dashboard/landlord/buildings/new",
          },
          { label: "Tenants", href: "/dashboard/landlord/tenants" },
          { label: "Leases", href: "/dashboard/landlord/leases" },
          { label: "Settings", href: "/dashboard/landlord/settings" },
        ],
        keywords: ["start", "first", "new", "onboarding", "begin"],
      },
      {
        id: "listing-vs-property",
        question: "What is the difference between a listing and a property?",
        answer: [
          "A listing is public. It advertises a vacancy to people looking for somewhere to rent, and anyone can see it.",
          "A property is private. It is how you manage a building you already own — its units, its tenants, their leases and their rent. Nobody but you and the staff you give access to can see it.",
          "The same unit can be both: advertised while it is empty, managed once somebody moves in.",
        ],
        links: [
          { label: "My listings", href: "/dashboard/landlord/listings" },
          { label: "My properties", href: "/dashboard/landlord/buildings" },
        ],
        keywords: ["vacancy", "advertise", "public", "private"],
      },
    ],
  },

  {
    id: "rent",
    title: "Collecting rent",
    blurb: "Where the money goes, and how it gets matched to a tenant.",
    topics: [
      {
        id: "who-holds-the-money",
        question: "Does MitaSafi hold my rent?",
        answer: [
          "No. Not at any point, and there is no plan to.",
          "Rent goes straight from your tenant to the paybill, till, M-Pesa number or bank account you nominate. MitaSafi never stands between the two — there is no MitaSafi balance, no float, and nothing to be released or withheld.",
          "What MitaSafi does is tell the tenant exactly where to send it, and then help you work out whose rent each payment was.",
        ],
        keywords: ["escrow", "float", "balance", "hold", "wallet", "payout"],
      },
      {
        id: "where-rent-goes",
        question: "How do I tell MitaSafi where rent should be paid?",
        answer: [
          "Under Settings, add a collection method. You can use a Pay Bill number, a Buy Goods till, your own M-Pesa number, or a bank account.",
          "One method is the default, and that is the one tenants are shown. You can add more than one — for instance a different paybill for a different block.",
        ],
        links: [{ label: "Settings", href: "/dashboard/landlord/settings" }],
        keywords: [
          "paybill",
          "till",
          "buy goods",
          "send money",
          "bank",
          "account number",
          "mpesa",
          "m-pesa",
        ],
      },
      {
        id: "account-reference",
        question: "What should my tenant type in the account field?",
        answer: [
          "Their unit number, unless you have set something else. That single field is what makes an automatic match possible: it is the only part of an M-Pesa confirmation that says which tenant the money is for.",
          "The tenant does not have to remember it. Their own page shows the exact business number and the exact account reference to type, and they can copy it.",
        ],
        keywords: ["reference", "unit number", "account", "what to type"],
      },
      {
        id: "reconcile",
        question: "How does Reconcile match payments?",
        answer: [
          "Paste your M-Pesa confirmation messages — one or a hundred — and MitaSafi reads the code, the amount, the payer and the account reference out of each one.",
          "It matches on the account reference the tenant typed. If that reference identifies exactly one unit, the payment is placed. If the reference is missing, the payer's phone number is used instead, but only if that number is on exactly one lease.",
          "It never matches on the amount. A tenant who pays half their rent has still paid, and matching on the amount would strand exactly the people most likely to be chased.",
          "Anything it cannot place without guessing is left for you under “Needs your decision”, with the reason it could not be matched. Two units whose references look the same produce a question, not a coin toss — putting rent on the wrong account means the tenant who paid still shows as owing, and somebody else's account is quietly wrong.",
        ],
        links: [{ label: "Reconcile", href: "/dashboard/landlord/reconcile" }],
        keywords: [
          "match",
          "automatic",
          "paste",
          "sms",
          "confirmation",
          "unmatched",
        ],
      },
      {
        id: "duplicate-paste",
        question: "What if I paste the same message twice?",
        answer: [
          "Nothing is credited twice. Each M-Pesa code may only be recorded once against you, and a repeat is reported back as a duplicate.",
          "This is deliberate: pasting an overlapping batch of messages is the normal way to use the page, so it has to be safe.",
        ],
        keywords: ["duplicate", "twice", "double", "again"],
      },
      {
        id: "which-month",
        question: "Which month does a matched payment settle?",
        answer: [
          "The oldest month that is still owing, which is how an unallocated payment is normally applied — the older debt first.",
          "It never reaches back before the first month you recorded rent against that lease. If a tenancy began in February but you only started recording in August, February to July are months with no records, not months of arrears, and money will not be filed against them.",
          "If nothing is owing, the payment settles the current month. One payment is never split across two months.",
        ],
        keywords: ["period", "allocate", "arrears", "which month", "oldest"],
      },
      {
        id: "callback",
        question: "Can Safaricom send the confirmations automatically?",
        answer: [
          "Only you can arrange that, because it is your paybill, not MitaSafi's. Safaricom sends a paybill's confirmations to whatever address the paybill's owner has registered.",
          "MitaSafi cannot register an address on somebody else's paybill, and there is no flow inside MitaSafi to set it up for you yet. Pasting the messages reconciles exactly as well in the meantime.",
        ],
        keywords: [
          "c2b",
          "callback",
          "daraja",
          "api",
          "automatic",
          "safaricom",
        ],
      },
    ],
  },

  {
    id: "team",
    title: "Caretakers and staff",
    blurb: "Giving somebody else access, and limiting what they can see.",
    topics: [
      {
        id: "add-caretaker",
        question: "How do I add a caretaker?",
        answer: [
          "Add them under Users with their name, email and phone number, then choose what they may see.",
          "They are linked to their MitaSafi account by phone number, so the number you enter has to be the one they signed up with. If they do not have an account yet, create one on that number first — there is no invitation email yet.",
        ],
        links: [{ label: "Users", href: "/dashboard/landlord/users" }],
        keywords: ["staff", "caretaker", "manager", "agent", "invite", "team"],
      },
      {
        id: "access-levels",
        question: "What can a caretaker see?",
        answer: [
          "Exactly what you grant, module by module. You can start from a role and then change any of it.",
          "Two things are worth knowing. Your collection details — paybill, till or bank account — are hidden unless you grant bank access specifically; it is the most sensitive thing stored here. And suspending somebody removes their access immediately, including to anything they could see a moment earlier.",
          "A caretaker can never see money that belongs to another landlord, and can never change where your rent is sent.",
        ],
        links: [{ label: "Users", href: "/dashboard/landlord/users" }],
        keywords: [
          "permissions",
          "access",
          "role",
          "suspend",
          "restrict",
          "bank",
        ],
      },
    ],
  },

  {
    id: "tenants",
    title: "Tenants and leases",
    blurb: "Applications, leases, and what a tenant can see of their own.",
    topics: [
      {
        id: "tenant-view",
        question: "What can my tenant see?",
        answer: [
          "Their own unit and building, their rent and the day it is due, the exact instruction for paying you, and every payment you have recorded against their lease.",
          "They cannot record a payment themselves. Only you, or staff you have given the right to, can do that — so what a tenant sees is always what you have confirmed, never what they say they sent.",
          "They can see nothing about any other tenant, unit or lease.",
        ],
        keywords: ["tenant", "portal", "see", "privacy", "statement"],
      },
      {
        id: "applications",
        question: "How do people apply for a vacancy?",
        answer: [
          "A listing carries an Apply button. What they send arrives under Applications, where you can read it and decide.",
          "Nothing in an application creates a tenant or a lease on its own — you still add them deliberately once you have decided.",
        ],
        links: [
          { label: "Applications", href: "/dashboard/landlord/applications" },
        ],
        keywords: ["apply", "application", "screening", "prospect"],
      },
      {
        id: "late-fees",
        question: "How do late fees work?",
        answer: [
          "You can write late fee rules under Settings and assign them to leases, and the grace period on each lease decides when rent counts as late.",
          "MitaSafi does not yet calculate a fee and add it to anything. The rules are stored and the lateness is shown; charging is still something you do yourself.",
        ],
        links: [{ label: "Settings", href: "/dashboard/landlord/settings" }],
        keywords: ["late", "penalty", "fee", "grace", "overdue"],
      },
    ],
  },

  {
    id: "reports",
    title: "Reports",
    blurb: "What each report counts, and what it leaves out.",
    topics: [
      {
        id: "report-list",
        question: "What reports are there?",
        answer: [
          "Rent roll — every live lease, with this month's position. Arrears — rent still owed, oldest first. Collections — what was due against what came in, month by month. Deposits held — what you owe back, and to whom. Lease expiries — what ends in the next 90 days, including anything already past its end date. Occupancy — units by status, per building.",
          "Each one downloads as a CSV you can open in Excel or Sheets.",
        ],
        links: [{ label: "Reports", href: "/dashboard/landlord/reports" }],
        keywords: [
          "report",
          "export",
          "csv",
          "rent roll",
          "occupancy",
          "excel",
        ],
      },
      {
        id: "no-pnl",
        question: "Why is there no profit and loss statement?",
        answer: [
          "Because MitaSafi does not record your expenses. The only outgoing it holds anywhere is maintenance cost.",
          "A statement built from rent minus maintenance would show a bottom line that looks like profit and is not one — and unlike every other figure in MitaSafi, that is the number you would take to a bank. Income and maintenance spend each have their own page, and each says exactly what it covers.",
        ],
        links: [
          { label: "Income", href: "/dashboard/landlord/income" },
          { label: "Expenses", href: "/dashboard/landlord/expenses" },
        ],
        keywords: ["p&l", "profit", "loss", "statement", "accounting", "tax"],
      },
      {
        id: "arrears-gaps",
        question: "Why does Arrears leave some leases out?",
        answer: [
          "A lease with no rent recorded against it at all is left out, and the report says how many. That is a gap in the records, not a tenant who owes nothing, and showing it as twelve months of debt would put a figure in front of you that you might act on.",
          "For the same reason, months before the first rent you recorded on a lease are not counted as arrears anywhere, and the Collections report shows a dash for them rather than 0%.",
        ],
        links: [{ label: "Reports", href: "/dashboard/landlord/reports" }],
        keywords: ["arrears", "missing", "excluded", "zero", "gap"],
      },
    ],
  },
];

/**
 * Shown on the page, deliberately.
 *
 * A landlord planning around MitaSafi needs to know what it does not do.
 * Finding out by discovering that no email was ever sent is worse than
 * reading it here.
 */
export const NOT_BUILT: { what: string; why: string }[] = [
  {
    what: "Notification emails and SMS",
    why: "The preferences under Settings decide what would be sent. Nothing sends them yet, so treat them as a plan rather than a promise.",
  },
  {
    what: "Staff invitations",
    why: "A caretaker is linked by phone number to an account that already exists. There is no invitation email and no way for somebody to accept one and sign up from it.",
  },
  {
    what: "Late fees added to what a tenant owes",
    why: "Rules can be written and assigned, and lateness is shown. The fee itself is not calculated or charged.",
  },
  {
    what: "Automatic paybill confirmations",
    why: "Safaricom sends them wherever your paybill's owner registered. MitaSafi cannot register an address on your paybill, and has no flow to help you do it. Pasting works today.",
  },
  {
    what: "Splitting one payment across two months",
    why: "A payment settles one month. If it covers more, the rest stays showing as owed until you record it.",
  },
  {
    what: "Matching a payment you already recorded by hand",
    why: "Record a payment yourself and then paste the same M-Pesa message, and you will have two. Pasting the same message twice is safe; this is not.",
  },
  {
    what: "A general expenses ledger",
    why: "Only maintenance cost is recorded, which is why there is no profit and loss statement.",
  },
];

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Filter the sections by a query, keeping a section only if a topic matched.
 *
 * Matching is over the question, the answer, the steps and the keywords. The
 * keywords matter more than they look: a landlord searches for "paybill",
 * not for "how do I tell MitaSafi where rent should be paid".
 */
export function searchHelp(
  sections: HelpSection[],
  query: string,
): HelpSection[] {
  const q = query.trim().toLowerCase();
  if (q === "") return sections;
  const terms = q.split(/\s+/).filter(Boolean);

  const hit = (t: HelpTopic) => {
    const hay = [
      t.question,
      ...t.answer,
      ...(t.steps ?? []),
      ...(t.keywords ?? []),
      ...(t.links ?? []).map((l) => l.label),
    ]
      .join(" ")
      .toLowerCase();
    // Every term must appear, so a longer query narrows rather than widens.
    return terms.every((term) => hay.includes(term));
  };

  return sections
    .map((s) => ({ ...s, topics: s.topics.filter(hit) }))
    .filter((s) => s.topics.length > 0);
}

/** Every topic, flattened — used for counts and for the empty state. */
export function countTopics(sections: HelpSection[]): number {
  return sections.reduce((n, s) => n + s.topics.length, 0);
}
