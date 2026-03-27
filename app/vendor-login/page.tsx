import { redirect } from "next/navigation";

export default function VendorLoginPage() {
  redirect("/auth?role=vendor&next=/vendor");
}
