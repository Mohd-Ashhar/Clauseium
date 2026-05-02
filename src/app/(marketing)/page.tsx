import { Hero } from "@/components/marketing/hero";
import { LogoCloud } from "@/components/marketing/logo-cloud";
import { DarkToLightTransition } from "@/components/marketing/dark-to-light-transition";
import { FeaturesBento } from "@/components/marketing/features-bento";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ProductShowcase } from "@/components/marketing/product-showcase";
import { StatsStrip } from "@/components/marketing/stats-strip";
import { Testimonials } from "@/components/marketing/testimonials";
import { TrustBadges } from "@/components/marketing/trust-badges";
import { Pricing } from "@/components/marketing/pricing";
import { FAQ } from "@/components/marketing/faq";
import { FinalCTA } from "@/components/marketing/final-cta";
import { InlineCTA } from "@/components/marketing/inline-cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <LogoCloud />
      <DarkToLightTransition />
      <FeaturesBento />
      <InlineCTA
        caption="See it in action with your own contract"
        label="Book a 20-min demo"
        variant="outline"
      />
      <HowItWorks />
      <ProductShowcase />
      <StatsStrip />
      <Testimonials />
      <InlineCTA
        caption="Join 400+ Indian legal teams"
        label="Start 14-day free trial"
        variant="primary"
      />
      <TrustBadges />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </>
  );
}
