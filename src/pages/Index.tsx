import { useNavigate } from "react-router-dom";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { getBaseUrl } from "@/lib/utils/url";

interface Link {
  id: string;
  title: string;
  created_at: string;
  password: string | null;
  message_count: { count: number }[];
}

const Index = () => {
  const navigate = useNavigate();
  const { session } = useSessionContext();

  const { data: links } = useQuery({
    queryKey: ["links"],
    queryFn: async () => {
      if (!session) return null;
      const { data, error } = await supabase
        .from("links")
        .select(`
          *,
          message_count:messages(count)
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      return data.map(link => ({
        ...link,
        message_count: link.message_count[0]?.count || 0
      })) as unknown as Link[];
    },
    enabled: !!session,
  });

  const copyShareLink = async (id: string) => {
    const url = `${getBaseUrl()}/send/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      // Fallback for mobile devices
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success("Link copied to clipboard!");
      } catch (err) {
        toast.error("Failed to copy link");
      }
      document.body.removeChild(textArea);
    }
  };

  if (!session) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-6">Welcome to Secret Message</h1>
        <p className="text-muted-foreground mb-8">
          Create your own message wall and receive anonymous messages.
        </p>
        <Button 
          onClick={() => navigate('/login')}
          size="lg"
          className="w-full md:w-auto"
        >
          Get Started
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold">Your Message Walls</h1>
        <div className="flex flex-col md:flex-row w-full md:w-auto gap-2">
          <Button 
            onClick={() => navigate("/create")}
            className="w-full md:w-auto"
          >
            Create New Wall
          </Button>
        </div>
      </div>

      {links && links.length > 0 ? (
        <div className="space-y-4">
          {links.map((link) => (
            <Card key={link.id} className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <h2 className="font-medium text-lg">{link.title}</h2>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span>{new Date(link.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{link.password ? "Password Protected" : "Public"}</span>
                    <span>•</span>
                    <Badge variant="secondary">
                      {typeof link.message_count === 'number' ? link.message_count : 0} messages
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/wall/${link.id}`)}
                    className="w-full md:w-auto"
                  >
                    View Messages
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyShareLink(link.id)}
                    className="w-full md:w-auto flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="md:hidden">Copy Link</span>
                    <span className="hidden md:inline">Share</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            You haven't created any message walls yet.
          </p>
          <Button onClick={() => navigate("/create")}>
            Create Your First Wall
          </Button>
        </Card>
      )}
    </div>
  );
};

export default Index;