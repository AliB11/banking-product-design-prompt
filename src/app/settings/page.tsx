import SettingsForm from "@/components/SettingsForm";
import { readSettings } from "@/lib/settingsRepo";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await readSettings();
  return <SettingsForm initial={settings} />;
}
