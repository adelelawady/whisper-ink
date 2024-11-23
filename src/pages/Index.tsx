import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Link {
  id: string;
  title: string;
  created_at: string;
  password: string | null;
}

const Index = () => {
  const { session } = useSessionContext();
  const navigate = useNavigate();

  const { data: links } = useQuery({
    queryKey: ["links", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("links")
        .select("*")
        .eq("user_id", session?.user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Link[];
    },
    enabled: !!session?.user?.id,
  });

  const copyShareLink = (linkId: string) => {
    const shareUrl = `${window.location.origin}/send/${linkId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  };

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

      {links && links.length > 0 ? (
        <Card className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">{link.title}</TableCell>
                  <TableCell>
                    {new Date(link.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {link.password ? "Password Protected" : "Public"}
                  </TableCell>
                  <TableCell>
                    <div className="space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/wall/${link.id}`)}
                      >
                        View Messages
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyShareLink(link.id)}
                      >
                        Copy Share Link
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
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