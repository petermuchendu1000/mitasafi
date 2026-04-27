/**
 * Service Edit Page
 *
 * Focused edit form that matches what the DB actually stores:
 *  - Price (amount + type)
 *  - Description (text)
 *  - Images (view / add / remove from custom_pricing.image_urls)
 *
 * No phantom fields — every input persists.
 */

import { redirect } from "next/navigation";
import { getServiceForEdit } from "../../actions";
import { ServiceEditForm } from "./ServiceEditForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditServicePage({ params }: PageProps) {
  const { id } = await params;
  const { service, error } = await getServiceForEdit(id);

  if (error || !service) {
    redirect("/dashboard/provider/services");
  }

  const cp = service.custom_pricing as Record<string, unknown> | null;

  return (
    <div className="p-6 max-w-2xl">
      <ServiceEditForm
        providerServiceId={service.id}
        serviceName={service.service.name}
        subcategoryName={service.service.subcategory_name}
        categoryName={service.service.category_name}
        initialPrice={((cp?.amount as number) || null)}
        initialPriceType={((cp?.type as string) || "fixed") as "fixed" | "starting_from" | "quote"}
        initialDescription={((cp?.description as string) || "")}
        initialImageUrls={((cp?.image_urls as string[]) || [])}
      />
    </div>
  );
}
