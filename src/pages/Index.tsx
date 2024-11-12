import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Index = () => {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      // In a real app, we'd validate and create the user
      const userId = Math.random().toString(36).substring(7);
      toast.success("Your secret wall has been created!");
      navigate(`/wall/${userId}`);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 text-secret-600">
          Anonymous Notes
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Create your personal wall for anonymous messages
        </p>
      </div>

      <Card className="max-w-md mx-auto p-6 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Choose your username
            </label>
            <Input
              id="username"
              placeholder="Enter a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full"
            />
          </div>
          <Button type="submit" className="w-full bg-secret-500 hover:bg-secret-600">
            Create Your Wall
          </Button>
        </form>
      </Card>

      <div className="mt-16 grid md:grid-cols-3 gap-8">
        <div className="text-center p-6">
          <h3 className="text-xl font-semibold mb-2">Private & Secure</h3>
          <p className="text-muted-foreground">
            Your messages are encrypted and only visible to you
          </p>
        </div>
        <div className="text-center p-6">
          <h3 className="text-xl font-semibold mb-2">Stay Anonymous</h3>
          <p className="text-muted-foreground">
            Send messages without revealing your identity
          </p>
        </div>
        <div className="text-center p-6">
          <h3 className="text-xl font-semibold mb-2">Easy to Share</h3>
          <p className="text-muted-foreground">
            Share your wall link with anyone you trust
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;