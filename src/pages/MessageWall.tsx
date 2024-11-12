import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface Message {
  id: string;
  content: string;
  created_at: string;
}

interface Link {
  id: string;
  title: string;
  password: string | null;
  user_id: string;
}

const MessageWall = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  const { data: link } = useQuery({
    queryKey: ["link", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("links")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data as Link;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", userId, isAuthenticated],
    queryFn: async () => {
      if (!isAuthenticated && link?.password) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("link_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!userId && (isAuthenticated || !link?.password),
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id === link?.user_id) {
        setIsAuthenticated(true);
      }
    };
    checkAuth();
  }, [link]);

  const shareUrl = `${window.location.origin}/send/${userId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === link?.password) {
      setIsAuthenticated(true);
    } else {
      toast.error("Incorrect password");
    }
  };

  if (link?.password && !isAuthenticated) {
    return (
      <div className="container max-w-md mx-auto px-4 py-16">
        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-4 text-center">Protected Message Wall</h1>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" className="w-full">Access Messages</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{link?.title}</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Share this link to receive anonymous messages
        </p>
        <div className="flex items-center justify-center gap-4">
          <Input
            value={shareUrl}
            readOnly
            className="max-w-sm bg-white"
          />
          <Button onClick={copyLink} variant="outline">
            Copy Link
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {messages?.map((message, index) => (
          <Card
            key={message.id}
            className="p-6 message-card"
            style={{ "--animation-order": index } as React.CSSProperties}
          >
            <p className="text-lg mb-2">{message.content}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(message.created_at).toLocaleDateString()}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MessageWall;