// app/(app)/clinics/review/actions.ts
// 電話番号 確認キューの承認/却下。人の確認なので、採用時は verified=true。
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function acceptCandidate(candidateId: string) {
  const supabase = await createClient();

  const { data: cand } = await supabase
    .from("phone_candidates")
    .select("*")
    .eq("id", candidateId)
    .single();
  if (!cand) return;

  // 1) 医院に番号を反映（人が承認 → 確認済み）
  await supabase
    .from("clinics")
    .update({
      phone: cand.phone,
      phone_source: "places",
      phone_verified: true,
      place_id: cand.place_id ?? null,
    })
    .eq("id", cand.clinic_id);

  // 2) この候補を accepted、同一医院の他候補は rejected に
  await supabase
    .from("phone_candidates")
    .update({ status: "rejected" })
    .eq("clinic_id", cand.clinic_id)
    .eq("status", "pending");
  await supabase
    .from("phone_candidates")
    .update({ status: "accepted" })
    .eq("id", candidateId);

  revalidatePath("/clinics/review");
  revalidatePath(`/clinics/${cand.clinic_id}`);
}

export async function rejectClinicCandidates(clinicId: string) {
  const supabase = await createClient();
  await supabase
    .from("phone_candidates")
    .update({ status: "rejected" })
    .eq("clinic_id", clinicId)
    .eq("status", "pending");
  revalidatePath("/clinics/review");
}
