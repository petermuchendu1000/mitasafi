import type { Metadata } from "next";
import {
  LegalPage,
  LegalSection,
  LegalLink,
} from "@/components/legal/LegalPage";
import { COMMISSION, LEGAL_CONTACT_EMAIL } from "@/lib/site/legal";

export const metadata: Metadata = {
  title: "Terms of Service | MitaSafi",
  description:
    "The terms you agree to when using MitaSafi to find a home or book a service in Kenya.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms govern your use of MitaSafi. They are written to be read, not skimmed past."
    >
      <LegalSection heading="1. What MitaSafi is">
        <p>
          MitaSafi is a marketplace. We connect people looking for a home with
          landlords who have one to let, and people who need a job done with
          service providers who do it.
        </p>
        <p>
          <strong>We are not a party to your tenancy or to your job.</strong>{" "}
          The agreement to let a property is between you and the landlord. The
          agreement to carry out work is between you and the provider. We
          introduce you, carry the payment, and keep a record — we do not become
          your landlord, your tenant, or your contractor.
        </p>
      </LegalSection>

      <LegalSection heading="2. Your account">
        <p>
          You need an account to enquire about a listing, book a service, or
          list a property. You must give accurate details and keep your sign-in
          secure. One person, one account. You must be old enough to enter a
          binding contract in Kenya.
        </p>
        <p>
          A verified badge on a profile means we have checked something specific
          about that account. It is not a character reference, and it is not a
          guarantee about anyone&apos;s conduct.
        </p>
      </LegalSection>

      <LegalSection heading="3. If you list a property">
        <p>
          You are responsible for what you publish. By listing, you confirm:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>the property exists, and you have the right to let it;</li>
          <li>
            the rent and the deposit shown are what you will actually charge;
          </li>
          <li>the photographs are of that property, taken recently;</li>
          <li>you will take the listing down once it is taken.</li>
        </ul>
        <p>
          Listings that advertise a property that is not available, or a price
          that is not real, are removed. Repeat offences end the account.
        </p>
        <p>
          You can hide a property&apos;s exact address. When you do, the address
          and building name are withheld from the public page and the map shows
          an approximate area instead of a pin. See the{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink> for exactly what
          that withholds.
        </p>
      </LegalSection>

      <LegalSection heading="4. If you offer a service">
        <p>
          You must hold any licence your trade requires, turn up when you said
          you would, and quote honestly. Quotes you send through MitaSafi are
          offers you are expected to honour.
        </p>
      </LegalSection>

      <LegalSection heading="5. Fees">
        <p>
          <strong>MitaSafi is free for tenants and for customers.</strong> We do
          not charge you to search, to enquire, or to book. We charge no viewing
          fee, and no listing on MitaSafi may charge you one.
        </p>
        <p>
          Service providers pay a commission only on a completed job. The rate
          falls as the job gets bigger:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="py-2 pr-4 font-semibold text-gray-900">
                  Job value
                </th>
                <th className="py-2 pr-4 font-semibold text-gray-900">
                  Commission
                </th>
              </tr>
            </thead>
            <tbody>
              {COMMISSION.bands.map((b) => (
                <tr key={b.fromKes} className="border-b border-gray-100">
                  <td className="py-2 pr-4">
                    {b.toKes === null
                      ? `KES ${b.fromKes.toLocaleString()} and above`
                      : `KES ${b.fromKes.toLocaleString()} – ${b.toKes.toLocaleString()}`}
                  </td>
                  <td className="py-2 pr-4 font-medium">{b.ratePercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          The rate applies to the whole job, not in slices: a KES 5,000 job is
          charged 10% of 5,000, not 15% of the first 999 and so on.
          {!COMMISSION.hasMinimumFee && <> There is no minimum fee.</>}
          {!COMMISSION.hasCap && <> There is no maximum fee.</>}
          {!COMMISSION.hasMinimumJobValue && (
            <> There is no minimum job value.</>
          )}
        </p>
        <p>
          If these rates change, the rate that applies to a job is the one
          published when that job was booked.
        </p>
      </LegalSection>

      <LegalSection heading="6. Payments">
        <p>
          Payments are made by M-Pesa, processed by Safaricom. We do not see or
          store your M-Pesa PIN. We record the amount, the reference and the
          phone number that paid, so that payment can be matched to your
          booking.
        </p>
        <p>
          If a payment is taken and the job does not happen, raise it with us
          through the booking before paying again. Do not pay twice to resolve a
          failed payment.
        </p>
      </LegalSection>

      <LegalSection heading="7. What you may not do">
        <ul className="list-disc pl-6 space-y-1">
          <li>Advertise a property or service you cannot provide.</li>
          <li>
            Ask anyone to pay a deposit before they have seen the property.
          </li>
          <li>
            Take the conversation off-platform in order to avoid fees, then use
            MitaSafi to find the next customer.
          </li>
          <li>Harass, threaten or discriminate against anyone.</li>
          <li>
            Scrape the site, or use it to build a competing listing database.
          </li>
          <li>
            Post anyone else&apos;s personal details without their consent.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="8. Limits of our responsibility">
        <p>
          We verify what we say we verify, and nothing beyond it. We do not
          inspect every property, we are not present at your viewing, and we do
          not supervise the work a provider does.
        </p>
        <p>
          To the extent the law allows, MitaSafi is not liable for the conduct
          of a landlord, tenant, customer or provider, for the condition of a
          property, or for the quality of work carried out. Nothing here
          excludes liability that cannot lawfully be excluded.
        </p>
      </LegalSection>

      <LegalSection heading="9. Suspension">
        <p>
          We may suspend or close an account that breaks these terms, that
          defrauds another user, or that puts someone at risk. Where we can, we
          will tell you why.
        </p>
      </LegalSection>

      <LegalSection heading="10. Changes">
        <p>
          We may change these terms. If a change materially affects you, we will
          say so rather than quietly reissue the page. Continuing to use
          MitaSafi after a change means you accept it.
        </p>
      </LegalSection>

      <LegalSection heading="11. Law and contact">
        <p>
          These terms are governed by the laws of Kenya. Questions about them go
          to{" "}
          <a
            className="text-brand-600 underline hover:text-brand-700"
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
