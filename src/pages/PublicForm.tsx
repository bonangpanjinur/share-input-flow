import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Copy, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import DataEntryForm from "@/components/DataEntryForm";

export default function PublicForm() {
  const { token, slug } = useParams<{ token?: string; slug?: string }>();
  const [linkData, setLinkData] = useState<{ group_id: string; user_id: string; link_id: string } | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [picName, setPicName] = useState<string>("");

  useEffect(() => {
    const validate = async () => {
      if (!token && !slug) { setInvalid(true); return; }

      let query = supabase
        .from("shared_links")
        .select("id, group_id, user_id, is_active, slug");

      if (slug) {
        query = query.eq("slug", slug);
      } else {
        query = query.eq("token", token!);
      }

      const { data } = await query.single();

      if (!data || !data.is_active) {
        setInvalid(true);
      } else {
        setLinkData({ group_id: data.group_id, user_id: data.user_id, link_id: data.id });
        // Fetch PIC name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", data.user_id)
          .single();
        setPicName(profile?.full_name || profile?.email?.split("@")[0] || "");
      }
    };
    validate();
  }, [token, slug]);

  if (invalid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <p className="text-destructive font-medium">Link tidak valid atau sudah dinonaktifkan.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    const copyCode = () => {
      if (trackingCode) {
        navigator.clipboard.writeText(trackingCode);
        toast({ title: "Kode tracking disalin!" });
      }
    };
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12 space-y-4">
            <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
            <p className="text-lg font-medium">Terima kasih!</p>
            <p className="text-muted-foreground">Data Anda telah berhasil dikirim.</p>
            {trackingCode && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">Simpan kode ini untuk melacak proses sertifikat Anda:</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="rounded-md bg-muted px-4 py-2 text-lg font-bold font-mono tracking-widest">{trackingCode}</code>
                  <Button variant="outline" size="icon" onClick={copyCode}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Link to={`/tracking/${trackingCode}`}>
                  <Button variant="link" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Cek Status Tracking
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!linkData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <Shield className="mx-auto mb-2 h-10 w-10 text-primary" />
          <h1 className="text-xl font-bold">Input Data Halal</h1>
          <p className="text-sm text-muted-foreground">Silakan isi form di bawah ini</p>
          {picName && (
            <p className="text-xs text-muted-foreground mt-1">PIC: <span className="font-medium">{picName}</span></p>
          )}
        </div>
        <DataEntryForm
          groupId={linkData.group_id}
          isPublic
          sharedLinkUserId={linkData.user_id}
          sourceLinkId={linkData.link_id}
          onCancel={() => {}}
          onSaved={(newTrackingCode?: string) => {
            setTrackingCode(newTrackingCode ?? null);
            setSubmitted(true);
          }}
        />
      </div>
    </div>
  );
}
