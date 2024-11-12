import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";

interface Message {
  id: string;
  content: string;
  timestamp: Date;
}

const MessageWall = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [messages] = useState<Message[]>([
    {
      id: "1",
      content: "You're doing amazing! Keep it up!",
      timestamp: new Date(),
    },
    {
      id: "2",
      content: "Thank you for being such an inspiration.",
      timestamp: new Date(Date.now() - 86400000),
    },
  ]);

  const shareUrl = `${window.location.origin}/send/${userId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 text-secret-600">Your Secret Wall</h1>
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
        {messages.map((message, index) => (
          <Card
            key={message.id}
            className="message-card"
            style={{ "--animation-order": index } as React.CSSProperties}
          >
            <p className="text-lg mb-2">{message.content}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(message.timestamp).toLocaleDateString()}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MessageWall;