import Overlay from "@/components/overlay";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Overlay id={(await params).id} />;
}
