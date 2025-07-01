import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import Features from "@/components/Features";
import ProductShowcase from "@/components/ProductShowcase";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import RegistrationCTA from "@/components/RegistrationCTA";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Features />
      <ProductShowcase />
      <RegistrationCTA />
      <CTA />
      <Footer />
    </div>
  );
}
