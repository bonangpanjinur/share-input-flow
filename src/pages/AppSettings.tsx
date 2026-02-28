import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Palette, Type, Image as ImageIcon } from "lucide-react";

const COLOR_PRESETS = [
  { label: "Biru Profesional", value: "217 91% 50%" },
  { label: "Hijau Halal", value: "142 71% 40%" },
  { label: "Teal Modern", value: "174 72% 40%" },
  { label: "Ungu Elegan", value: "262 83% 58%" },
  { label: "Oranye Hangat", value: "25 95% 53%" },
  { label: "Merah Tegas", value: "0 84% 50%" },
];

export default function AppSettings() {
  const { role } = useAuth();
  const [appName, setAppName] = useState("HalalTrack");
  const [primaryColor, setPrimaryColor] = useState("217 91% 50%");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("app_settings").select("key, value");
      if (data) {
        data.forEach((row: any) => {
          if (row.key === "app_name") setAppName(row.value ?? "HalalTrack");
          if (row.key === "primary_color") setPrimaryColor(row.value ?? "217 91% 50%");
          if (row.key === "logo_url") setLogoUrl(row.value ?? "");
        });
      }
    };
    load();
  }, []);

  // Apply primary color preview live
  useEffect(() => {
    document.documentElement.style.setProperty("--primary", primaryColor);
    return () => {
      document.documentElement.style.removeProperty("--primary");
    };
  }, [primaryColor]);

  const handleSave = async () => {
    setSaving(true);
    const updates = [
      { key: "app_name", value: appName },
      { key: "primary_color", value: primaryColor },
      { key: "logo_url", value: logoUrl },
    ];

    for (const u of updates) {
      await supabase
        .from("app_settings")
        .update({ value: u.value, updated_at: new Date().toISOString() })
        .eq("key", u.key);
    }

    setSaving(false);
    toast({ title: "Pengaturan berhasil disimpan" });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `logo/app-logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-photos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Gagal upload logo", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("product-photos").getPublicUrl(path);
    setLogoUrl(urlData.publicUrl);
    setUploading(false);
    toast({ title: "Logo berhasil diupload" });
  };

  if (role !== "super_admin") {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Hanya Super Admin yang bisa mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Pengaturan Tampilan</h1>

      {/* App Name */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Type className="h-5 w-5" /> Nama Aplikasi
          </CardTitle>
          <CardDescription>Nama yang tampil di sidebar dan halaman login</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="Nama Aplikasi" />
        </CardContent>
      </Card>

      {/* Primary Color */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" /> Warna Utama
          </CardTitle>
          <CardDescription>Pilih warna utama aplikasi dari preset atau masukkan HSL kustom</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setPrimaryColor(preset.value)}
                className={`group flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-all ${
                  primaryColor === preset.value ? "border-primary shadow-md" : "border-transparent hover:border-border"
                }`}
              >
                <div
                  className="h-8 w-8 rounded-full shadow-sm ring-1 ring-border"
                  style={{ backgroundColor: `hsl(${preset.value})` }}
                />
                <span className="text-[10px] text-muted-foreground leading-tight text-center">{preset.label}</span>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label>HSL Kustom</Label>
            <div className="flex items-center gap-3">
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="217 91% 50%"
                className="font-mono text-sm"
              />
              <div
                className="h-9 w-9 shrink-0 rounded-lg border shadow-sm"
                style={{ backgroundColor: `hsl(${primaryColor})` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-5 w-5" /> Logo Aplikasi
          </CardTitle>
          <CardDescription>Upload logo yang tampil di sidebar (opsional)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoUrl && (
            <div className="flex items-center gap-4">
              <img
                src={logoUrl}
                alt="Logo"
                className="h-14 w-14 rounded-lg border object-contain bg-background p-1"
              />
              <Button variant="outline" size="sm" onClick={() => setLogoUrl("")}>
                Hapus Logo
              </Button>
            </div>
          )}
          <div className="space-y-2">
            <Label>Upload Logo Baru</Label>
            <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
            {uploading && <p className="text-sm text-muted-foreground">Mengupload...</p>}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border p-4" style={{ backgroundColor: `hsl(${primaryColor} / 0.08)` }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded object-contain" />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `hsl(${primaryColor})` }}
              >
                <span className="text-sm font-bold text-white">{appName.charAt(0)}</span>
              </div>
            )}
            <span className="font-bold" style={{ color: `hsl(${primaryColor})` }}>{appName}</span>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Simpan Pengaturan
      </Button>
    </div>
  );
}
