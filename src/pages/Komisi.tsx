import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Wallet, TrendingUp, Clock, CheckCircle, Users } from "lucide-react";

interface Commission {
  id: string;
  user_id: string;
  entry_id: string;
  group_id: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  period: string | null;
  entry_name?: string;
  user_name?: string;
}

interface UserOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default function Komisi() {
  const { user, role } = useAuth();
  const isAdmin = role === "super_admin" || role === "admin";

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("mine");
  const [loading, setLoading] = useState(true);

  const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

  const fetchCommissions = async () => {
    if (!user) return;
    setLoading(true);

    const targetUserId = isAdmin && selectedUser !== "mine" ? selectedUser : user.id;

    const { data } = await supabase
      .from("commissions")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch entry names
      const entryIds = [...new Set(data.map((c: any) => c.entry_id).filter(Boolean))];
      let entryMap = new Map<string, string>();
      if (entryIds.length > 0) {
        const { data: entries } = await supabase
          .from("data_entries")
          .select("id, nama")
          .in("id", entryIds);
        entryMap = new Map(entries?.map((e: any) => [e.id, e.nama || "-"]) || []);
      }

      setCommissions(
        data.map((c: any) => ({ ...c, entry_name: entryMap.get(c.entry_id) || "-" }))
      );
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    if (!isAdmin) return;
    const { data } = await supabase.from("profiles").select("id, full_name, email");
    setUsers(data ?? []);
  };

  useEffect(() => {
    fetchCommissions();
    if (isAdmin) fetchUsers();
  }, [user, selectedUser]);

  const totalEarned = commissions.reduce((sum, c) => sum + c.amount, 0);
  const totalPending = commissions.filter((c) => c.status === "pending").reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = commissions.filter((c) => c.status === "paid").reduce((sum, c) => sum + c.amount, 0);
  const currentPeriodEarned = commissions
    .filter((c) => c.period === currentPeriod)
    .reduce((sum, c) => sum + c.amount, 0);

  const handleMarkPaid = async (ids: string[]) => {
    const { error } = await supabase
      .from("commissions")
      .update({ status: "paid", paid_at: new Date().toISOString() } as any)
      .in("id", ids);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Komisi ditandai sudah dibayar" });
      fetchCommissions();
    }
  };

  const pendingIds = commissions.filter((c) => c.status === "pending").map((c) => c.id);

  const formatRp = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Komisi & Saldo</h1>
        {isAdmin && (
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Lihat komisi user..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mine">Komisi Saya</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || u.email || u.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Komisi</p>
              <p className="text-lg font-bold">{formatRp(totalEarned)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-yellow-500/10 p-2">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Belum Cair</p>
              <p className="text-lg font-bold">{formatRp(totalPending)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-green-500/10 p-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sudah Cair</p>
              <p className="text-lg font-bold">{formatRp(totalPaid)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Periode Ini</p>
              <p className="text-lg font-bold">{formatRp(currentPeriodEarned)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action bar for admin */}
      {isAdmin && pendingIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">
            {pendingIds.length} komisi pending
          </p>
          <Button size="sm" onClick={() => handleMarkPaid(pendingIds)}>
            Cairkan Semua Pending
          </Button>
        </div>
      )}

      {/* Commission List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Komisi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
                {isAdmin && <TableHead className="w-20">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : commissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    Belum ada komisi
                  </TableCell>
                </TableRow>
              ) : (
                commissions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.entry_name}</TableCell>
                    <TableCell className="font-mono">{formatRp(c.amount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.period || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "paid" ? "default" : "secondary"}>
                        {c.status === "paid" ? "Cair" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("id-ID")}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {c.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkPaid([c.id])}
                          >
                            Cairkan
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
