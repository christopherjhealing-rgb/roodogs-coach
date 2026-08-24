import { redirect } from "next/navigation";

export default function Home() {
  // Sessions is the weekly driver — planned during the week, run at training —
  // so the app opens there rather than the set-once Team page.
  redirect("/sessions");
}
