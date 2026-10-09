import Workspace from "@/components/Workspace";
import { readSettings } from "@/lib/settingsRepo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await readSettings();
  return <Workspace settings={settings} />;
}
