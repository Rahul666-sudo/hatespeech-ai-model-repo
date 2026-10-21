import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

export const useAvatarUrl = (path?: string | null) => {
  const [url, setUrl] = useState<string | null>(path ? cache.get(path) ?? null : null);
  useEffect(() => {
    if (!path) return setUrl(null);
    if (cache.has(path)) return setUrl(cache.get(path)!);
    supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24).then(({ data }) => {
      if (data?.signedUrl) {
        cache.set(path, data.signedUrl);
        setUrl(data.signedUrl);
      }
    });
  }, [path]);
  return url;
};

const UserAvatar = ({ path, name, size = 40 }: { path?: string | null; name: string; size?: number }) => {
  const url = useAvatarUrl(path);
  return (
    <div
      className="rounded-full overflow-hidden bg-gradient-primary flex items-center justify-center shrink-0 text-primary-foreground font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {url ? <img src={url} alt={name} className="w-full h-full object-cover" /> : (name[0] ?? "?").toUpperCase()}
    </div>
  );
};

export default UserAvatar;
