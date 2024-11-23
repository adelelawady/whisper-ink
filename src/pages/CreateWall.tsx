import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const CreateWall = () => {
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { session } = useSessionContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Please enter a title for your wall");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("links")
        .insert([{
          title: title.trim(),
          password: password.trim() || null,
          user_id: session?.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Wall created successfully!");
      navigate(`/wall/${data.id}`);
    } catch (error) {
      toast.error("Failed to create wall");
      console.error(error);
    }
  };

  return (
    <div className="container max-w-md mx-auto px-4 py-16">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Create New Message Wall</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Wall Title</Label>
            <Input
              id="title"
              placeholder="Enter wall title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password (Optional)</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password to protect your wall"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Leave blank for a public wall
            </p>
          </div>
          <Button type="submit" className="w-full">
            Create Wall
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default CreateWall;