import Link from "next/link";
import { Container, Logo } from "@/components/ui";
import { Facebook, Twitter, Instagram, Linkedin, Mail, MapPin } from "lucide-react";

const footerLinks = {
  product: {
    title: "Product",
    links: [
      { label: "Browse Homes", href: "/properties" },
      { label: "Home Services", href: "/services" },
      { label: "For Landlords", href: "/landlords" },
      { label: "For Service Providers", href: "/service-providers" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Mobile App", href: "/app" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Blog", href: "/blog" },
      { label: "Press", href: "/press" },
      { label: "Contact", href: "/contact" },
    ],
  },
  resources: {
    title: "Resources",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Tenant Guide", href: "/guides/tenants" },
      { label: "Landlord Guide", href: "/guides/landlords" },
      { label: "Safety Tips", href: "/safety" },
      { label: "API Documentation", href: "/developers" },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Tenant Rights", href: "/tenant-rights" },
    ],
  },
};

const socialLinks = [
  { icon: <Facebook className="w-5 h-5" />, href: "https://facebook.com/mitasafi", label: "Facebook" },
  { icon: <Twitter className="w-5 h-5" />, href: "https://twitter.com/mitasafi", label: "Twitter" },
  { icon: <Instagram className="w-5 h-5" />, href: "https://instagram.com/mitasafi", label: "Instagram" },
  { icon: <Linkedin className="w-5 h-5" />, href: "https://linkedin.com/company/mitasafi", label: "LinkedIn" },
];

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer */}
      <Container className="py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Logo variant="full" color="white" size="sm" />
            <p className="mt-4 text-gray-400 leading-relaxed max-w-xs">
              Kenya&apos;s trusted rental platform connecting tenants with verified
              homes and honest landlords.
            </p>

            {/* Contact Info */}
            <div className="mt-6 space-y-3">
              <a
                href="mailto:hello@mitasafi.co.ke"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <Mail className="w-4 h-4" />
                hello@mitasafi.co.ke
              </a>
              <p className="flex items-center gap-2 text-gray-400">
                <MapPin className="w-4 h-4" />
                Nairobi, Kenya
              </p>
            </div>

            {/* Social Links */}
            <div className="flex gap-4 mt-6">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.values(footerLinks).map((section, index) => (
            <div key={index}>
              <h3 className="font-semibold text-white mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <Container className="py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} MitaSafi. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-500">Made with ❤️ in Nairobi</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">🇰🇪</span>
                <span className="text-gray-400">Kenya</span>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </footer>
  );
}
