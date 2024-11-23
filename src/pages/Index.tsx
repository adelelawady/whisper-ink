import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

const Index = () => {
  const { session } = useSessionContext();
  const navigate = useNavigate();

  const { data: links } = useQuery({
    queryKey: ["links", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("links")
        .select("*")
        .eq("user_id", session?.user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  if (!session) {
    return (
      <div className="container max-w-lg mx-auto p-4">
        <Card className="p-8">
          <h1 className="text-2xl font-bold mb-6 text-center">Welcome to Secret Message</h1>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={[]}
            redirectTo={window.location.origin}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Your Message Walls</h1>
        <div className="space-x-4">
          <Button onClick={() => navigate("/create")}>Create New Wall</Button>
          <Button 
            variant="outline" 
            onClick={() => supabase.auth.signOut()}
          >
            Sign Out
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {links?.map((link) => (
          <Card key={link.id} className="p-6">
            <h2 className="text-xl font-semibold mb-2">{link.title}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Created on {new Date(link.created_at).toLocaleDateString()}
            </p>
            <div className="space-x-2">
              <Button onClick={() => navigate(`/wall/${link.id}`)}>
                View Wall
              </Button>
              <Button variant="outline" onClick={() => navigate(`/send/${link.id}`)}>
                Share Link
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Index;