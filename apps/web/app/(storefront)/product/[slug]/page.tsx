import { ProductDetailClient } from "./product-detail-client";
import { demoProducts } from "@/lib/demo-data";
import { notFound } from "next/navigation";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = demoProducts.find((item) => item.slug === slug);
  if (!product) notFound();
  return <ProductDetailClient product={product} />;
}
