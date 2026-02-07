import { redirect } from "next/navigation";

export default function Page() {
  redirect("/rooms?tab=schedule");
}
