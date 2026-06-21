import { LeadsClientPage } from "@/components/leads-client-page";

export default function LeadsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
      </div>
      <LeadsClientPage />
    </div>
  );
}
