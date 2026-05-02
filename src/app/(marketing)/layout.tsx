import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { ScrollProgress } from "@/components/motion/scroll-progress";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
