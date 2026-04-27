import { Section, SectionHeader, Container } from "@/components/ui";
import { Search, MessageSquare, Key, ArrowRight } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: Search,
    title: "Search",
    subtitle: "Find your home",
    description: "Browse verified listings by location, price, and amenities.",
  },
  {
    number: 2,
    icon: MessageSquare,
    title: "Connect",
    subtitle: "Talk to landlords",
    description: "Message directly, ask questions, and schedule viewings.",
  },
  {
    number: 3,
    icon: Key,
    title: "Move In",
    subtitle: "Get your keys",
    description: "Sign digitally, pay securely, and start living.",
  },
];

export function HowItWorksSection() {
  return (
    <Section background="white" id="how-it-works">
      <Container>
        <SectionHeader
          eyebrow="How It Works"
          title="Simple by Design"
          description="Three steps. No brokers. No hidden fees. Just you and your new home."
        />

        {/* Timeline Steps */}
        <div className="mt-12 lg:mt-20">
          {/* Progress Line - Desktop */}
          <div className="hidden lg:block relative">
            {/* Main Progress Line */}
            <div className="absolute top-16 left-0 right-0 h-1 bg-gray-200 rounded-full">
              <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-brand-500 via-brand-400 to-brand-300 rounded-full" />
            </div>

            {/* Steps */}
            <div className="relative grid grid-cols-3 gap-8">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="flex flex-col items-center text-center">
                    {/* Circle with Number */}
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full bg-white border-4 border-brand-500 flex items-center justify-center shadow-xl shadow-brand-500/20">
                        <Icon className="w-12 h-12 text-brand-600" />
                      </div>
                      {/* Step Number Badge */}
                      <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-brand-600 text-white font-bold text-lg flex items-center justify-center shadow-lg">
                        {step.number}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="mt-8 space-y-2">
                      <h3 className="text-2xl font-bold text-gray-900">{step.title}</h3>
                      <p className="text-brand-600 font-medium">{step.subtitle}</p>
                      <p className="text-gray-600 leading-relaxed max-w-xs mx-auto">
                        {step.description}
                      </p>
                    </div>

                    {/* Arrow (except last) */}
                    {index < steps.length - 1 && (
                      <div className="absolute top-16 left-[calc(50%+4rem)] transform -translate-y-1/2">
                        <ArrowRight className="w-6 h-6 text-brand-400" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Layout - Vertical */}
          <div className="lg:hidden space-y-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-10 top-20 w-0.5 h-16 bg-gradient-to-b from-brand-500 to-brand-300" />
                  )}
                  
                  <div className="flex gap-6 items-start">
                    {/* Circle with Icon */}
                    <div className="relative flex-shrink-0">
                      <div className="w-20 h-20 rounded-full bg-white border-4 border-brand-500 flex items-center justify-center shadow-lg">
                        <Icon className="w-8 h-8 text-brand-600" />
                      </div>
                      {/* Number Badge */}
                      <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-brand-600 text-white font-bold text-sm flex items-center justify-center">
                        {step.number}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="pt-2">
                      <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                      <p className="text-brand-600 font-medium text-sm">{step.subtitle}</p>
                      <p className="text-gray-600 mt-2 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Time to Move-In Stats */}
        <div className="mt-16 lg:mt-24 relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-brand-700 rounded-3xl" />
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-brand-400/20 rounded-full blur-3xl" />
          
          <div className="relative p-8 lg:p-12 rounded-3xl">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
              {/* Left: Stats */}
              <div className="text-center lg:text-left">
                <p className="text-sm font-semibold text-brand-200 uppercase tracking-wider mb-3">
                  Average Time to Move-In
                </p>
                <div className="flex items-baseline gap-2 justify-center lg:justify-start">
                  <span className="text-6xl lg:text-7xl font-bold text-white">3-5</span>
                  <span className="text-3xl lg:text-4xl font-semibold text-brand-200">Days</span>
                </div>
                <p className="text-brand-100 mt-3 text-lg">
                  From first search to getting your keys
                </p>
              </div>

              {/* Right: Mini Timeline */}
              <div className="w-full lg:w-auto">
                {/* Mobile: Vertical Stack */}
                <div className="flex flex-col gap-3 sm:hidden">
                  <div className="flex items-center gap-3">
                    <StepPill step={1} label="Search" time="Day 1" />
                    <StepConnectorHorizontal />
                    <StepPill step={2} label="Visit" time="Day 2" />
                  </div>
                  <div className="flex items-center gap-3">
                    <StepPill step={3} label="Apply" time="Day 3" />
                    <StepConnectorHorizontal />
                    <StepPill step={4} label="Move In" time="Day 4-5" active />
                  </div>
                </div>
                
                {/* Desktop: Horizontal Row */}
                <div className="hidden sm:flex items-center gap-3">
                  <StepPill step={1} label="Search" time="Day 1" />
                  <StepConnectorHorizontal />
                  <StepPill step={2} label="Visit" time="Day 2" />
                  <StepConnectorHorizontal />
                  <StepPill step={3} label="Apply" time="Day 3" />
                  <StepConnectorHorizontal />
                  <StepPill step={4} label="Move In" time="Day 4-5" active />
                </div>
              </div>
            </div>

            {/* Bottom Stats Row */}
            <div className="mt-10 pt-8 border-t border-white/20 grid grid-cols-2 lg:grid-cols-4 gap-6">
              <StatItem value="500+" label="Verified Listings" />
              <StatItem value="98%" label="Satisfaction Rate" />
              <StatItem value="24/7" label="Support Available" />
              <StatItem value="0" label="Hidden Fees" />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function StepPill({
  step,
  label,
  time,
  active = false,
}: {
  step: number;
  label: string;
  time: string;
  active?: boolean;
}) {
  return (
    <div className={`flex-1 sm:flex-initial flex flex-col items-center px-4 py-3 rounded-xl transition-all ${
      active 
        ? "bg-white text-brand-700 shadow-lg shadow-white/20" 
        : "bg-white/10 text-white backdrop-blur-sm"
    }`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
        active ? "bg-success-500 text-white" : "bg-white/20 text-white"
      }`}>
        {step}
      </div>
      <p className="text-sm font-semibold">{label}</p>
      <p className={`text-xs ${active ? "text-brand-500" : "text-white/70"}`}>{time}</p>
    </div>
  );
}

function StepConnectorHorizontal() {
  return (
    <div className="flex items-center flex-shrink-0">
      <div className="w-6 sm:w-8 h-0.5 bg-white/30" />
      <ArrowRight className="w-3 h-3 text-white/50 -ml-0.5" />
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl lg:text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-brand-200">{label}</p>
    </div>
  );
}
