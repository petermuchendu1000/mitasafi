/**
 * Add Services Wizard Page
 * 
 * 3-step wizard for providers to add services to their profile.
 * Steps: Category → Services → Pricing
 */

import type { Metadata } from "next";
import { WizardProvider } from "./context";
import { ServiceWizardContent } from "./ServiceWizardContent";

export const metadata: Metadata = {
  title: "Add Services | MitaSafi Provider",
};

export default function AddServicesPage() {
  return (
    <WizardProvider>
      <ServiceWizardContent />
    </WizardProvider>
  );
}
