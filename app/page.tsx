"use client";

import { useState, Suspense } from "react";
import { Hero } from "@/components/landing/hero";
import { Marketplace } from "@/components/landing/marketplace";
import { Features } from "@/components/landing/features";
import { CommerceAI } from "@/components/landing/commerce-ai";
import { Protection } from "@/components/landing/protection";
import { Pricing } from "@/components/landing/pricing";
import { Testimonials } from "@/components/landing/testimonials";
import {
  Navigation,
  CTASection,
  Footer,
  VideoModal,
} from "@/components/landing/layout";

/**
 * Landing Page - Main entry point
 * 
 * Follows SRP: Each section extracted to focused component
 * Follows DRY: Shared pricing constants in src/constants/pricing.ts
 * Follows <400 LOC limit: Orchestrator pattern with component composition
 */
export default function HomePage() {
  const [showVideoModal, setShowVideoModal] = useState(false);

  return (
    <div className="min-h-screen bg-brand-evergreen">
      <Navigation />
      <Marketplace />
      <Suspense>
        <Hero onWatchDemo={() => setShowVideoModal(true)} />
      </Suspense>
      <Features />
      <CommerceAI />
      <Protection />
      <Testimonials />
      <Suspense>
        <Pricing />
      </Suspense>
      <Suspense>
        <CTASection />
      </Suspense>
      <Footer />
      <VideoModal isOpen={showVideoModal} onClose={() => setShowVideoModal(false)} />
    </div>
  );
}
