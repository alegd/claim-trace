import { Auditor } from "@/components/Auditor";
import { DRAFT, TRANSCRIPT } from "@/lib/fixture";

export default function Home() {
  return <Auditor initialTranscript={TRANSCRIPT} initialDraft={DRAFT} />;
}
