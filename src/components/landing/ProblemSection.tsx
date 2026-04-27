import { Section, SectionHeader, Container, ProblemCard } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import { Camera, HandCoins, Receipt, Wrench } from "lucide-react";
import Link from "next/link";

const problems = [
  {
    icon: <Camera className="w-6 h-6" />,
    title: "Photos That Lie",
    description:
      'You show up excited. The "3-bedroom apartment" is actually a cramped bedsitter. The "modern kitchen" hasn\'t been updated since 1995. Time wasted. Hope crushed.',
  },
  {
    icon: <HandCoins className="w-6 h-6" />,
    title: "The Bribe Game",
    description:
      'KES 500 just to view. Another KES 1,000 to "secure" it. The caretaker\'s cut. The agent\'s cut. Everyone takes a slice before you even move in.',
  },
  {
    icon: <Receipt className="w-6 h-6" />,
    title: "Payment Without Proof",
    description:
      'You send rent to the caretaker\'s personal M-Pesa. No receipt. Next month: "We didn\'t receive your payment." Your word against theirs.',
  },
  {
    icon: <Wrench className="w-6 h-6" />,
    title: "Repairs That Never Happen",
    description:
      'The leak started three months ago. You\'ve reported it four times. Nothing. You fix it yourself. The landlord says "What leak?" at move-out.',
  },
];

export function ProblemSection() {
  return (
    <Section background="gray" id="the-problem">
      <Container>
        <SectionHeader
          eyebrow="The Rental Reality in Nairobi"
          title="Renting Shouldn't Be This Hard"
          description="Fake listings. Hidden fees. Ghosting landlords. We've been there too."
        />

        {/* Problem Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 lg:mt-16">
          {problems.map((problem, index) => (
            <ProblemCard
              key={index}
              icon={problem.icon}
              title={problem.title}
              description={problem.description}
            />
          ))}
        </div>

        {/* Transition Statement */}
        <div className="mt-12 lg:mt-16 text-center">
          <p className="text-xl lg:text-2xl text-gray-700 font-medium mb-6">
            This isn&apos;t bad luck.{" "}
            <span className="text-gray-900">It&apos;s a broken system.</span>
            <br />
            <span className="text-brand-600">And we built MitaSafi to fix it.</span>
          </p>
          <Link
            href="#for-tenants"
            className={buttonVariants({ variant: "secondary" })}
          >
            See How We&apos;re Different →
          </Link>
        </div>
      </Container>
    </Section>
  );
}
