import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { buttonVariants } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Tenant Guide | Renting in Nairobi without getting burned | MitaSafi",
  description:
    "What a Nairobi rental actually costs once service charge and levies are counted, how the common deposit and viewing-fee scams work, and what to check before you pay anyone.",
};

/**
 * The figures below are from the research in docs/research/, which cites its
 * sources — chiefly the Centre for Affordable Housing Finance in Africa via
 * Kenyans.co.ke (10 Feb 2024) for service charge, and first-hand accounts
 * collected from Kenyan tenants for the scam patterns. They are presented as
 * ranges because that is how they were reported.
 */
export default function TenantGuidePage() {
  return (
    <LegalPage
      title="Tenant Guide"
      intro="Renting in Nairobi without getting burned. What it really costs, how the common scams work, and what to check before money leaves your hand."
      showUpdated={false}
    >
      <LegalSection heading="The advertised rent is not the rent">
        <p>
          A listing that says 12,000 is rarely 12,000. Service charge alone runs
          around <strong>13% of rent</strong> in Nairobi — roughly 5,000 on a
          one-bed, 6,500 on a two-bed and 8,000 on a three-bed, according to the
          Centre for Affordable Housing Finance in Africa. On that worked
          example, 12,000 becomes <strong>17,000</strong> before anything else
          is counted.
        </p>
        <p>Then the smaller lines, which are easy to miss and add up:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>garbage collection</li>
          <li>security or guards</li>
          <li>water, sometimes levied rather than metered</li>
          <li>parking</li>
          <li>utility deposits, paid once</li>
          <li>internet, if the building ties you to one provider</li>
        </ul>
        <p>
          <strong>Ask one question before you view:</strong> &ldquo;what does a
          tenant here pay in total each month, everything included?&rdquo; A
          figure that is only the rent is not an answer. Where you can, ask a
          current tenant rather than the agent — they are the ones paying it.
        </p>
      </LegalSection>

      <LegalSection heading="The deposit is where the money disappears">
        <p>
          Most landlords ask for one or two months&apos; rent as a deposit. Many
          tenants never see it again. The refund conversation happens at the end
          of a tenancy, when you have no leverage left and the person who took
          it may no longer be reachable.
        </p>
        <p>Protect yourself at the start, because you cannot at the end:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Get a receipt that names the amount, the date and what it is for.
          </li>
          <li>
            Get the deposit terms in writing — what can be deducted, and when it
            is returned.
          </li>
          <li>
            Photograph every room before you move your things in, including the
            damage that is already there.
          </li>
          <li>
            Pay to an account in the name of the person or company on the
            agreement. Not a different name.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="Three patterns worth recognising">
        <p>
          <strong>The viewing fee.</strong> You are asked for a few hundred
          shillings to be shown a house. Tenants have reported paying to view
          properties that were still building sites. A fee to look is a fee to
          waste your afternoon.{" "}
          <strong>No listing on MitaSafi may charge you to view.</strong>
        </p>
        <p>
          <strong>The urgent deposit.</strong> The house is perfect, and the
          agent needs the deposit today because someone else is interested.
          Urgency is the product being sold. A real landlord will still have the
          property tomorrow.
        </p>
        <p>
          <strong>The vanishing agent.</strong> Money is sent, the phone stops
          being answered. This is why the two rules above matter more than any
          other advice here: see it first, and pay only a named party with a
          receipt.
        </p>
      </LegalSection>

      <LegalSection heading="Before you pay anyone">
        <ul className="list-disc pl-6 space-y-1">
          <li>
            You have physically stood inside the actual unit — not the show
            house, not a photograph.
          </li>
          <li>You know the total monthly cost, not just the rent.</li>
          <li>
            You have seen proof the person letting it has the right to let it.
          </li>
          <li>
            You have a written agreement, and you have read the deposit clause.
          </li>
          <li>
            You are paying a named account, and you are getting a receipt.
          </li>
          <li>You have photographed the condition you are taking it in.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="What MitaSafi does about this">
        <p>
          Listings carry the rent and deposit the landlord has entered, and we
          remove listings that advertise a property that is not available or a
          price that is not real. Searching, enquiring and booking are free for
          tenants, and no viewing fee is permitted.
        </p>
        <p>
          We are a marketplace, not a guarantor: we introduce you to a landlord,
          we do not stand behind them. The checklist above still applies on a
          MitaSafi listing.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/properties" className={buttonVariants({ size: "lg" })}>
            Browse verified homes
          </Link>
          <Link
            href="/contact"
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            Report a listing
          </Link>
        </div>
      </LegalSection>
    </LegalPage>
  );
}
