import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

interface Message {
  id: string;
  content: string;
  created_at: string;
}

interface Link {
  id: string;
  title: string;
  password: string | null;
}

const SendMessage = () => {
  const location = useLocation();
  const [message, setMessage] = useState(location.state?.message || "");
  const [password, setPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const { userId } = useParams();
  const navigate = useNavigate();

  // Fetch wall details
  const { data: link } = useQuery({
    queryKey: ["link", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("links")
        .select("id, title, password")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data as Link;
    },
  });

  // Fetch messages if wall is public
  const { data: messages } = useQuery({
    queryKey: ["messages", userId],
    queryFn: async () => {
      if (link?.password) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("link_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!userId && !link?.password,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      const { error } = await supabase
        .from("messages")
        .insert([{ content: message, link_id: userId }]);
      
      if (error) {
        toast.error("Failed to send message");
        return;
      }

      toast.success("Message sent successfully!");
      setMessage("");
      navigate(`/wall/${userId}`);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: result, error } = await supabase
        .from('links')
        .select('password')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (result.password === password) {
        localStorage.setItem(`wall-session-${userId}`, 'true');
        navigate(`/wall/${userId}`);
      } else {
        toast.error("Incorrect password");
      }
    } catch (error) {
      console.error('Error checking password:', error);
      toast.error("Failed to verify password");
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-16">
      <Card className="p-6 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Send an Anonymous Message
          </h1>
          {link && (
            <h2 className="text-xl text-muted-foreground">
              to {link.title}
            </h2>
          )}
        </div>

        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="send">Send Message</TabsTrigger>
            <TabsTrigger value="view">View Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="send">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium">
                  Your anonymous message
                </label>
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[200px]"
                />
              </div>
              <Button type="submit" className="w-full">
                Send Message
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="view">
            {link?.password ? (
              <div className="space-y-4">
                {showPasswordInput ? (
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="password" className="text-sm font-medium">
                        Enter password to view messages
                      </label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        View Messages
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setShowPasswordInput(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      This wall is password protected
                    </p>
                    <Button 
                      onClick={() => setShowPasswordInput(true)}
                      className="w-full"
                    >
                      Enter Password to View Messages
                    </Button>
                  </div>
                )}
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Recent Messages</h3>
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/wall/${userId}`)}
                  >
                    View All Messages
                  </Button>
                </div>
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <Card key={msg.id} className="p-4 bg-muted">
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(msg.created_at).toLocaleDateString()}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                No messages yet
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default SendMessage;