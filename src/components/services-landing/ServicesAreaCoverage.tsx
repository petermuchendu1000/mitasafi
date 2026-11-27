import Link from "next/link";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { counties, places } from "@/lib/site/places";

const featuredTowns = new Set(["juja", "ruiru", "thika", "athi-river", "narok", "nakuru", "mombasa", "kisumu", "eldoret", "kitengela"]);
const groups = [
  { name: "Counties", locations: counties },
  { name: "Cities and towns", locations: places.filter(({ slug }) => featuredTowns.has(slug)) },
];

export function ServicesAreaCoverage() {
  return (
    <Section background="gray" padding="md" id="service-areas">
      <Container size="default">
        <SectionHeader
          title="Find home services by location"
          description="Choose a town or county to see providers who list it as a service area."
        />
        <nav aria-label="Service areas" className="mt-8 grid gap-8 sm:grid-cols-2">
          {groups.map(({ name, locations }) => (
            <div key={name} className="border-t border-gray-200 pt-4">
              <h3 className="text-base font-semibold text-gray-900">{name}</h3>
              <ul className="grid grid-cols-2 gap-x-4">
                {locations.map(({ name, slug }) => (
                  <li key={slug}>
                    <Link
                      href={{ pathname: "/services/browse", query: { location: slug } }}
                      prefetch={false}
                      className="inline-flex items-center px-4 min-h-[44px] rounded-full text-sm font-medium text-brand-700 hover:underline"
                    >
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <Link href="/find" className="mt-4 inline-flex min-h-11 items-center text-brand-700 underline underline-offset-4">
          See all location searches
        </Link>
      </Container>
    </Section>
  );
}
