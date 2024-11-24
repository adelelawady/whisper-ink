import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";

const CreateWall = () => {
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [isProtected, setIsProtected] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("You must be logged in to create a wall");
      return;
    }

    try {
      // First check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        // Create profile if it doesn't exist
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            username: session.user.email
          });

        if (createProfileError) throw createProfileError;
      }

      // Now create the wall
      const { data, error } = await supabase
        .from("links")
        .insert({
          title,
          password: isProtected ? password : null,
          user_id: session.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Wall created successfully!");
      navigate(`/wall/${data.id}`);
    } catch (error) {
      console.error('Error creating wall:', error);
      toast.error("Failed to create wall");
    }
  };

  return (
    <div className="container max-w-md mx-auto px-4 py-16">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Message Wall</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Wall Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter wall title"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isProtected"
                checked={isProtected}
                onCheckedChange={(checked) => setIsProtected(checked as boolean)}
              />
              <Label htmlFor="isProtected">Password Protected</Label>
            </div>
          </div>

          {isProtected && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required={isProtected}
              />
            </div>
          )}

          <Button type="submit" className="w-full">
            Create Wall
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default CreateWall;