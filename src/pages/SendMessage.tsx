import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SendMessage = () => {
  const [message, setMessage] = useState("");
  const { userId } = useParams();
  const navigate = useNavigate();

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

  return (
    <div className="container max-w-2xl mx-auto px-4 py-16">
      <Card className="p-6 shadow-xl">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Send an Anonymous Message
        </h1>
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
      </Card>
    </div>
  );
};

export default SendMessage;