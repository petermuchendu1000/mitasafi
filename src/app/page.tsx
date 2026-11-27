import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { HomeNavbar } from "@/components/landing/HomeNavbar";
import { HomeIcon, type HomeIconName } from "@/components/landing/HomeIcons";
import { HomeSearch } from "@/components/landing/HomeSearch";
import { HomeReveals, PhotoMotionControl } from "@/components/landing/HomeMotion";
import { RecentlyViewedSection } from "@/components/landing/RecentlyViewedSection";
import { CONTACT_EMAIL, siteUrl } from "@/lib/site/urls";
import { places } from "@/lib/site/places";
import { LocalSearchDirectory } from "@/components/landing/LocalSearchDirectory";
import { getAvailablePrioritySearches } from "@/lib/site/local-search-inventory";
import { homeFont } from "@/components/landing/home-font";
import type { PropertyType } from "@/lib/listings/types";
import styles from "@/components/landing/HomePage.module.css";

const heroImage = "/images/homepage/nairobi-living-room.webp";
const servicesImage = "/images/homepage/home-cleaning.webp";
export const revalidate = 600;
const title = "Homes for Rent & Home Services in Kenya | MitaSafi";
const description = "Find apartments, bedsitters and houses for rent across Kenya. Search by town or county and compare local movers, house cleaners, plumbers and electricians.";

export const metadata: Metadata = {
  title,
  description,
  keywords: null,
  alternates: { canonical: siteUrl("/") },
  openGraph: {
    title,
    description,
    url: siteUrl("/"),
    siteName: "MitaSafi",
    type: "website",
    locale: "en_KE",
    images: [{ url: heroImage, width: 1280, height: 960, alt: "Sunlit apartment with a balcony and city view" }],
  },
  twitter: { card: "summary_large_image", title, description, images: [heroImage] },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": siteUrl("/#organization"),
      name: "MitaSafi",
      url: siteUrl("/"),
      logo: siteUrl("/logo/app-icon-512.svg"),
      email: CONTACT_EMAIL,
      areaServed: { "@type": "Country", name: "Kenya" },
    },
    {
      "@type": "WebSite",
      "@id": siteUrl("/#website"),
      name: "MitaSafi",
      url: siteUrl("/"),
      description,
      publisher: { "@id": siteUrl("/#organization") },
    },
    {
      "@type": "WebPage",
      "@id": siteUrl("/#webpage"),
      url: siteUrl("/"),
      name: title,
      description,
      inLanguage: "en-KE",
      isPartOf: { "@id": siteUrl("/#website") },
      about: { "@id": siteUrl("/#organization") },
      primaryImageOfPage: { "@type": "ImageObject", url: siteUrl(heroImage) },
      relatedLink: [siteUrl("/properties"), siteUrl("/services/browse"), siteUrl("/find"), siteUrl("/guides/tenants")],
    },
  ],
};

const featuredPlaces = ["kiambu-county", "machakos-county", "narok-county", "mombasa", "nakuru", "kisumu"];
const searchAreas = places.map(({ name, slug }) => ({ label: name, value: slug })).sort((a, b) => a.label.localeCompare(b.label, "en-KE"));
const types: { label: string; value: PropertyType }[] = [
  { label: "Apartment", value: "apartment" },
  { label: "Bedsitter", value: "bedsitter" },
  { label: "Studio", value: "studio" },
  { label: "House", value: "house" },
  { label: "Townhouse", value: "townhouse" },
];

const services: { name: string; caption: string; icon: HomeIconName; href: string }[] = [
  { name: "Movers", caption: "Packing, transport and moving day help", icon: "truck", href: "/services/browse?category=moving" },
  { name: "House cleaning", caption: "Move-in, deep and regular cleaning", icon: "brush", href: "/services/browse?category=cleaning" },
  { name: "Plumbers", caption: "Leaking taps, drains and fittings", icon: "plumbing", href: "/services/browse?category=plumbing" },
  { name: "Electricians", caption: "Lighting, sockets and electrical repairs", icon: "bolt", href: "/services/browse?category=electrical" },
];

const steps: { title: string; text: string; icon: HomeIconName; link: string; href: string }[] = [
  { title: "Shortlist homes", text: "Filter rentals by town or county, then narrow by rent, home type and bedrooms. Save listings so you can compare them before arranging a viewing.", icon: "search", link: "Browse rental homes", href: "/properties?residential=1" },
  { title: "Know what you’ll pay", text: "At the viewing, ask about the deposit and what’s included in the monthly rent. Confirm when the home is available and get the terms in writing before paying.", icon: "checklist", link: "Read the tenant guide", href: "/guides/tenants" },
  { title: "Plan the move", text: "Once you know the address, look for movers and cleaners who work in that area. Share the date, building access and size of the job so providers can quote accurately.", icon: "truck", link: "Find local house movers", href: "/services/browse?category=moving" },
];

const questions = [
  {
    question: "What can I find on MitaSafi?",
    answer: "MitaSafi is a Kenyan marketplace for rental homes and home services. Use the same location to search for apartments, bedsitters or houses and to find movers, cleaners, plumbers or electricians. Results depend on the listings and providers available in each area.",
  },
  {
    question: "How do I find a rental and arrange a viewing in Kenya?",
    answer: "Pick a town or county and home type. Narrow by budget and bedroom count, then open a listing and contact the landlord to confirm rent, availability and viewing time. You may need to sign in to send an inquiry.",
    link: { label: "Browse rental listings", href: "/properties" },
  },
  {
    question: "What should I ask before paying a rental deposit?",
    answer: "View the specific home, confirm who is authorised to rent it out, and ask for the rent, deposit, additional charges and refund terms in writing. Check water supply and which bills are included. Keep a copy of the agreement and a receipt for any payment.",
    link: { label: "Read the tenant guide", href: "/guides/tenants" },
  },
  {
    question: "Can I find a mover or cleaner in the same town as my rental?",
    answer: "Yes. Choose your location and switch from Rentals to Home services. MitaSafi keeps the location selected. Search for the job you need and confirm that the provider covers your address and is available on your date.",
    link: { label: "Find home services", href: "/services/browse" },
  },
  {
    question: "What affects the cost of moving or house cleaning in Kenya?",
    answer: "The price depends on the job. For a move, share both addresses, the size of the load, floor and lift access, and whether you need packing. For a clean, share the number of rooms and whether it’s a routine or a deep clean. Ask for an itemised quote so you can compare what’s included.",
  },
  {
    question: "Can I hire a home service if I already have a place?",
    answer: "Yes. Select your location, compare providers and request a booking or quote where available. Confirm the scope, travel fees and timing before making arrangements.",
    link: { label: "Browse service providers", href: "/services/browse" },
  },
  {
    question: "How do I list a rental or offer a home service?",
    answer: "If you’re a landlord, create a landlord account to list a property with photos, rent and availability. If you provide a home service, start with a provider account and add the services you offer and the areas you cover.",
    link: { label: "Explore provider options", href: "/service-providers" },
  },
];

async function HomeFooter() {
  const available = await getAvailablePrioritySearches();
  const groups = [
    { label: "Explore", links: [["Rentals", "/properties"], ["Home services", "/services"], ["Saved homes", "/saved"]] },
    { label: "Work with us", links: [["For landlords", "/landlords"], ["For providers", "/service-providers"]] },
    { label: "Help", links: [["Tenant guide", "/guides/tenants"], ["Contact", "/contact"], ["Frequently asked questions", "/#faq"]] },
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.wrap}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <Link href="/" aria-label="MitaSafi home"><Logo variant="full" color="teal" size="sm" /></Link>
            <p>Rental homes and home services across Kenya.</p>
            <a href={"mailto:" + CONTACT_EMAIL}><HomeIcon name="mail" size={18} />{CONTACT_EMAIL}</a>
          </div>
          {groups.map(({ label, links }) => (
            <nav key={label} aria-label={label}>
              <h2>{label}</h2>
              <ul>{links.map(([text, href]) => <li key={href}><Link href={href}>{text}</Link></li>)}</ul>
            </nav>
          ))}
        </div>
        <LocalSearchDirectory available={available} />
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} MitaSafi</span>
          <div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div className={`${homeFont.variable} ${styles.home}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <HomeReveals />
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <HomeNavbar />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.wrap}>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <p className={styles.location}><HomeIcon name="pin" size={17} /> Across Kenya</p>
                <h1 id="hero-heading">Find your next home in Kenya.</h1>
                <p className={styles.heroLead}>Browse apartments, bedsitters and houses for rent. Find movers, cleaners and repair services in the same town or county.</p>
                <HomeSearch areas={searchAreas} types={types} />
                <nav className={styles.heroLinks} aria-label="Browse marketplace">
                  <Link href="/properties?residential=1">Browse all rentals <HomeIcon name="arrow" size={16} /></Link>
                  <Link href="/services/browse">Browse all services <HomeIcon name="arrow" size={16} /></Link>
                </nav>
              </div>

              <div className={styles.heroVisual}>
                <Image src={heroImage} alt="Illustration of a sunlit apartment with a balcony and city view." fill preload sizes="(max-width: 859px) calc(100vw - 36px), (max-width: 1290px) 49vw, 625px" />
                <PhotoMotionControl />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section} id="neighborhoods" aria-labelledby="neighborhood-title">
          <div className={styles.wrap}>
            <div className={styles.sectionHead} data-home-reveal>
              <div>
                <h2 id="neighborhood-title">Search by town or county</h2>
                <p>Browse homes and local services side by side, wherever you plan to live.</p>
              </div>
              <Link href="/find" className={styles.textLink}>See all location searches <HomeIcon name="arrow" size={17} /></Link>
            </div>
            <ul className={styles.areaGrid} data-home-reveal>
              {places.filter(({ slug }) => featuredPlaces.includes(slug)).map(({ name, slug }) => (
                  <li key={slug} className={styles.areaCard}>
                    <h3>{name}</h3>
                    <div className={styles.areaLinks}>
                      <Link href={{ pathname: "/properties", query: { location: slug, residential: "1" } }} prefetch={false} aria-label={`Browse rentals in ${name}`}>Rentals <HomeIcon name="arrow" size={15} /></Link>
                      <Link href={{ pathname: "/services/browse", query: { location: slug } }} prefetch={false} aria-label={`Find home services in ${name}`}>Home services <HomeIcon name="arrow" size={15} /></Link>
                    </div>
                  </li>
              ))}
            </ul>
            <div className={styles.areaFoot}>
              <div className={styles.homeTypes}>
                <span>Browse by home type</span>
                <ul aria-label="Rental types">
                  {types.map(({ label, value }) => (
                    <li key={value}><Link href={"/properties?type=" + value} prefetch={false}>{label}s</Link></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.serviceSection} aria-labelledby="service-heading">
          <div className={styles.wrap}>
            <div className={styles.serviceGrid} data-home-reveal>
              <div className={styles.servicePhoto}>
                <Image src={servicesImage} alt="Illustration of a home cleaner wiping down a kitchen counter." fill sizes="(max-width: 859px) calc(100vw - 36px), 47vw" />
              </div>
              <div className={styles.serviceCopy}>
                <h2 id="service-heading">Home services near you</h2>
                <p>Find help for moving day, cleaning and repairs. Compare local providers by the jobs they do and the areas they cover.</p>
                <ul className={styles.serviceList}>
                  {services.map(({ name, caption, icon, href }) => (
                    <li key={name}>
                      <Link href={href} prefetch={false}>
                        <HomeIcon name={icon} size={23} className={styles.serviceIcon} />
                        <span><strong>{name}</strong><small>{caption}</small></span>
                        <HomeIcon name="arrow" size={17} />
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link className={styles.textLink} href="/services/browse">Explore all home services <HomeIcon name="arrow" size={17} /></Link>
              </div>
            </div>
          </div>
        </section>

        <RecentlyViewedSection />

        <section className={styles.section} id="how-it-works" aria-labelledby="steps-heading">
          <div className={styles.wrap}>
            <div className={styles.sectionHead} data-home-reveal>
              <div><h2 id="steps-heading">From house hunting to moving in</h2></div>
            </div>
            <ol className={styles.stepGrid} data-home-reveal>
              {steps.map(({ title, text, icon, link, href }) => (
                <li key={title}>
                  <HomeIcon name={icon} size={25} className={styles.stepIcon} />
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <Link href={href} className={styles.textLink}>{link} <HomeIcon name="arrow" size={16} /></Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.partners} id="pricing" aria-label="For landlords and service providers">
          <div className={styles.wrap}>
            <div className={styles.partnerGrid} data-home-reveal>
              <article>
                <HomeIcon name="key" size={25} className={styles.stepIcon} />
                <h2>Have a place to rent out?</h2>
                <p>List your rental with photos, rent and availability so renters can find it and ask about a viewing.</p>
                <div className={styles.partnerActions}>
                  <Link className={styles.primaryLink} href="/signup?role=landlord&intent=list">List a property</Link>
                  <Link className={styles.textLink} href="/landlords">Explore landlord tools</Link>
                </div>
              </article>
              <article>
                <HomeIcon name="tools" size={25} className={styles.stepIcon} />
                <h2>Offer a home service?</h2>
                <p>Create a provider profile with the work you do and the towns or neighbourhoods you serve.</p>
                <div className={styles.partnerActions}>
                  <Link className={styles.outlineButton} href="/service-providers">See provider options</Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.section} id="faq" aria-labelledby="faq-heading">
          <div className={styles.wrap}>
            <div className={styles.faqLayout} data-home-reveal>
              <div>
                <h2 id="faq-heading">Renting and hiring in Kenya</h2>
                <Link className={styles.textLink} href="/contact">Contact MitaSafi <HomeIcon name="arrow" size={17} /></Link>
              </div>
              <div className={styles.questions}>
                {questions.map(({ question, answer, link }) => (
                  <details key={question}>
                    <summary><h3>{question}</h3><HomeIcon name="plus" size={19} /></summary>
                    <div className={styles.answer}>
                      <p>{answer}</p>
                      {link && <Link className={styles.textLink} href={link.href}>{link.label} <HomeIcon name="arrow" size={16} /></Link>}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <HomeFooter />
    </div>
  );
}
