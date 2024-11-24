import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { getBaseUrl } from "@/lib/utils/url";
import { PasswordProtection } from "@/components/wall/PasswordProtection";

// Split into smaller components for better maintainability
const MessageForm = ({ message, setMessage, handleSubmit }) => (
  <form onSubmit={handleSubmit} className="space-y-4">
    <div className="space-y-2">
      <label htmlFor="message" className="text-sm font-medium block">
        Your anonymous message
      </label>
      <Textarea
        id="message"
        placeholder="Type your message here..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="min-h-[150px] md:min-h-[200px] resize-none"
      />
    </div>
    <Button type="submit" className="w-full py-6 text-base">
      Send Message
    </Button>
  </form>
);

const RecentMessages = ({ messages }) => (
  <div className="space-y-4">
    {messages.map((msg) => (
      <Card key={msg.id} className="p-4 bg-muted">
        <p className="text-sm md:text-base whitespace-pre-wrap break-words">
          {msg.content}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }).format(new Date(msg.created_at))}
        </p>
      </Card>
    ))}
  </div>
);

const SendMessage = () => {
  const location = useLocation();
  const [message, setMessage] = useState(location.state?.message || "");
  const [password, setPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const { userId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const passwordFromUrl = searchParams.get('password');
  const queryClient = useQueryClient();

  const { data: link } = useQuery({
    queryKey: ["link", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("links")
        .select("id, title, password")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
  });

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
      return data;
    },
    enabled: !!userId && !link?.password,
  });

  useEffect(() => {
    if (passwordFromUrl) {
      setPassword(decodeURIComponent(passwordFromUrl));
      localStorage.setItem(`wall-password-${userId}`, decodeURIComponent(passwordFromUrl));
      localStorage.setItem(`wall-session-${userId}`, 'true');
    }
  }, [passwordFromUrl, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          content: message,
          link_id: userId,
        });

      if (error) throw error;

      await queryClient.invalidateQueries({ 
        queryKey: ["messages", userId],
        exact: false 
      });

      setMessage("");
      toast.success("Message sent successfully!");
      
      if (passwordFromUrl) {
        navigate(`/wall/${userId}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const { data: result, error } = await supabase
        .rpc('check_wall_password', {
          wall_id: userId,
          wall_password: password
        });

      if (error) throw error;

      if (result === true) {
        localStorage.setItem(`wall-password-${userId}`, password);
        localStorage.setItem(`wall-session-${userId}`, 'true');
        navigate(`/wall/${userId}`);
        toast.success("Password correct! Viewing messages...");
      } else {
        toast.error("Incorrect password");
      }
    } catch (error) {
      console.error('Error checking password:', error);
      toast.error("Failed to verify password");
    }
  };

  const shareUrl = `${getBaseUrl()}/send/${userId}`;

  return (
    <div className="container max-w-2xl mx-auto p-4 min-h-[calc(100vh-4rem)]">
      <Card className="p-4 md:p-6 shadow-xl">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Send an Anonymous Message
          </h1>
          {link && (
            <h2 className="text-lg md:text-xl text-muted-foreground">
              to {link.title}
            </h2>
          )}
        </div>

        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 md:mb-6">
            <TabsTrigger value="send">Send Message</TabsTrigger>
            <TabsTrigger value="view">View Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="send">
            <MessageForm 
              message={message}
              setMessage={setMessage}
              handleSubmit={handleSubmit}
            />
          </TabsContent>

          <TabsContent value="view">
            {link?.password ? (
              <div className="space-y-4">
                {showPasswordInput ? (
                  <PasswordProtection
                    password={password}
                    setPassword={setPassword}
                    handlePasswordSubmit={handlePasswordSubmit}
                  />
                ) : (
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      This wall is password protected
                    </p>
                    <Button 
                      onClick={() => setShowPasswordInput(true)}
                      className="w-full py-6 text-base"
                    >
                      Enter Password to View Messages
                    </Button>
                  </div>
                )}
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                  <h3 className="text-lg font-semibold">Recent Messages</h3>
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/wall/${userId}`)}
                    className="w-full md:w-auto py-6 text-base"
                  >
                    View All Messages
                  </Button>
                </div>
                <RecentMessages messages={messages} />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
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