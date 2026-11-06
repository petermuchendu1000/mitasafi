import type { Metadata } from "next";
import {
  LegalPage,
  LegalSection,
  LegalLink,
} from "@/components/legal/LegalPage";
import { LEGAL_CONTACT_EMAIL, SUBPROCESSORS } from "@/lib/site/legal";
import { SITE_DOMAIN } from "@/lib/site/urls";

export const metadata: Metadata = {
  title: "Privacy Policy | MitaSafi",
  description:
    "What data MitaSafi collects, why, who it is shared with, and the rights you have over it under Kenya's Data Protection Act.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="What we collect, why we collect it, who else sees it, and what you can make us do about it."
    >
      <LegalSection heading="1. Scope">
        <p>
          This policy covers {SITE_DOMAIN} and the MitaSafi platform. It is
          written against Kenya&apos;s Data Protection Act, 2019.
        </p>
      </LegalSection>

      <LegalSection heading="2. What we collect">
        <p>
          <strong>When you create an account:</strong> your name, email address,
          phone number, the role you signed up as, and a profile picture if you
          upload one.
        </p>
        <p>
          <strong>When you list a property:</strong> its address, its
          coordinates, photographs, the rent and deposit, and the details of the
          property itself.
        </p>
        <p>
          <strong>When you book a service or make an enquiry:</strong> the
          message you send, the booking details, and the record of what happened
          to it.
        </p>
        <p>
          <strong>When you pay:</strong> the amount, the M-Pesa reference, and
          the phone number that paid.{" "}
          <strong>We never receive your M-Pesa PIN.</strong>
        </p>
        <p>
          <strong>If you apply to be verified:</strong> the documents you
          upload. These are stored in private storage, not on any public page.
        </p>
        <p>
          <strong>Automatically:</strong> your IP address and basic request
          information, which our host records in order to serve the site.
        </p>
      </LegalSection>

      <LegalSection heading="3. What is public, and what is not">
        <p>
          A published listing is public: anyone can see its title, area, rent,
          photographs and the landlord&apos;s display name and verified status.
        </p>
        <p>
          <strong>
            Your email address and phone number are never shown on a public
            page.
          </strong>{" "}
          Neither is the metadata on your profile. Other users see your display
          name, your picture and whether you are verified — nothing more.
        </p>
        <p>
          If a landlord hides a property&apos;s exact address, the street
          address and building name are withheld from everyone except that
          landlord, and the published coordinates are rounded to roughly a
          half-kilometre grid so the map can show an approximate area without
          revealing the building.
        </p>
        <p>
          Draft, expired and archived listings are visible only to the landlord
          who owns them.
        </p>
      </LegalSection>

      <LegalSection heading="4. Why we are allowed to hold it">
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>To perform our contract with you</strong> — running your
            account, your listings and your bookings.
          </li>
          <li>
            <strong>Your consent</strong> — for optional things such as search
            alerts, which you can withdraw at any time.
          </li>
          <li>
            <strong>Our legitimate interest</strong> — keeping the platform safe
            and preventing fraud.
          </li>
          <li>
            <strong>Legal obligation</strong> — keeping records we are required
            to keep.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Who else processes your data">
        <p>
          We do not sell your data. We do not share it for advertising. These
          are the services that process it on our behalf:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="py-2 pr-4 font-semibold text-gray-900">
                  Service
                </th>
                <th className="py-2 pr-4 font-semibold text-gray-900">
                  What it does
                </th>
              </tr>
            </thead>
            <tbody>
              {SUBPROCESSORS.map((s) => (
                <tr key={s.name} className="border-b border-gray-100 align-top">
                  <td className="py-2 pr-4 font-medium text-gray-900 whitespace-nowrap">
                    {s.name}
                  </td>
                  <td className="py-2 pr-4">
                    {s.purpose}
                    {s.note ? (
                      <span className="block text-gray-500">{s.note}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Some of these operate outside Kenya, so your data may be transferred
          abroad. We use providers that offer protections appropriate to that
          transfer.
        </p>
      </LegalSection>

      <LegalSection heading="6. Your rights">
        <p>Under the Data Protection Act, 2019 you may:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>ask what we hold about you, and get a copy;</li>
          <li>
            have inaccurate details corrected — most are editable in your
            profile;
          </li>
          <li>ask us to delete your account and your data;</li>
          <li>object to processing, or ask us to restrict it;</li>
          <li>withdraw consent for anything you consented to;</li>
          <li>complain to the Office of the Data Protection Commissioner.</li>
        </ul>
        <p>
          To exercise any of these, write to{" "}
          <a
            className="text-brand-600 underline hover:text-brand-700"
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
        <p className="text-gray-500">
          Some records survive a deletion request where the law requires us to
          keep them — a completed payment, for example, is part of a financial
          record.
        </p>
      </LegalSection>

      <LegalSection heading="7. Security">
        <p>
          Data is encrypted in transit. Access to the database is restricted by
          row-level rules, so one account cannot read another account&apos;s
          private data. Documents you upload for verification sit in private
          storage that is not reachable from a public URL.
        </p>
        <p>
          No system is perfect. If a breach affects you, we will tell you and
          the Commissioner as the Act requires.
        </p>
      </LegalSection>

      <LegalSection heading="8. Cookies">
        <p>
          We use cookies that are necessary to keep you signed in. We do not use
          advertising cookies.
        </p>
      </LegalSection>

      <LegalSection heading="9. Changes and contact">
        <p>
          If this policy changes materially we will say so rather than quietly
          reissue the page. For anything in it, or to exercise a right above,
          contact{" "}
          <a
            className="text-brand-600 underline hover:text-brand-700"
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
          . See also our <LegalLink href="/terms">Terms of Service</LegalLink>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
