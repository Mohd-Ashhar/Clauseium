export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Wraps within the (marketing) layout (Navbar + Footer).
  // Navbar reads usePathname() and forces light mode on /resources/*.
  return <>{children}</>;
}
