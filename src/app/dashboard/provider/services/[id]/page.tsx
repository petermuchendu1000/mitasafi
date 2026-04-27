/**
 * Service Preview Page — "How clients see your service"
 *
 * Renders the service as it would appear to a client searching on MitaSafi,
 * with a floating top banner for preview mode + Edit action.
 *
 * Pattern: Fiverr seller gig preview / Thumbtack listing preview
 */

import { redirect } from "next/navigation";
import { getServicePreview } from "../actions";
import { ServicePreviewClient } from "./ServicePreviewClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ServicePreviewPage({ params }: PageProps) {
  const { id } = await params;

  const result = await getServicePreview(id);

  if (result.error || !result.data) {
    redirect("/dashboard/provider/services");
  }

  return <ServicePreviewClient data={result.data} />;
}
