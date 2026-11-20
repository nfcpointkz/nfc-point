import { PageHeader } from "@/components/ui";
import { BusinessForm } from "../business-form";

export default function NewBusinessPage() {
  return (
    <>
      <PageHeader title="Новое заведение" subtitle="После создания можно выпустить NFC-карты и оформить страницу в редакторе." />
      <BusinessForm />
    </>
  );
}
