import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop medicines | PM Store",
  description:
    "Order prescription and OTC medicines online. Compare brands by price per tablet and find cheaper equivalents of the same composition.",
};

export default function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
