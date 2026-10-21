import { useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import UserAvatar from "./UserAvatar";

type Props = { open: boolean; onOpenChange: (o: boolean) => void; me: Tables<"profiles">; onSaved: () => void };

const SettingsDialog = ({ open, onOpenChange, me, onSaved }: Props) => {
  const [name, setName] = useState(me.display_name ?? "");
  const [uploading, setUploading] = useState(false);
  useEffect(() => setName(me.display_name ?? ""), [me.display_name]);

  const update = async (patch: { display_name?: string; avatar_url?: string; detector_enabled?: boolean }) => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", me.id);
    if (error) toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    else onSaved();
  };

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast({ title: "Please choose an image", variant: "destructive" });
    if (file.size > 2 * 1024 * 1024) return toast({ title: "Image must be under 2 MB", variant: "destructive" });
    setUploading(true);
    const path = `${me.id}/${Date.now()}.${file.name.split(".").pop() || "png"}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    else await update({ avatar_url: path });
    setUploading(false);
  };

  const blocked = me.blocked_until && new Date(me.blocked_until) > new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Your profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <UserAvatar path={me.avatar_url} name={me.display_name || me.username} size={64} />
            <div>
              <p className="text-sm text-muted-foreground">@{me.username}</p>
              <Label htmlFor="avatar" className="mt-2 inline-flex items-center gap-2 text-sm text-primary cursor-pointer">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Change photo
              </Label>
              <input id="avatar" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dname">Display name</Label>
            <div className="flex gap-2">
              <Input id="dname" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
              <Button variant="secondary" onClick={() => update({ display_name: name.trim() || me.username })}>Save</Button>
            </div>
          </div>
          <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Hate speech detector</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                When on, messages flagged as hate speech or offensive are hidden from you.
              </p>
            </div>
            <Switch checked={me.detector_enabled} onCheckedChange={(v) => update({ detector_enabled: v })} />
          </div>
          <div className="rounded-xl border border-border p-3 text-sm">
            <p className="font-medium text-foreground">Strikes: {me.strikes} / 3</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {blocked
                ? `You're blocked from sending until ${new Date(me.blocked_until!).toLocaleString()}.`
                : "Each flagged message is a strike. 3 strikes blocks sending for 24 hours."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
