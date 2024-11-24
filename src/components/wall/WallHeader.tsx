import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { getBaseUrl } from "@/lib/utils/url";

interface WallHeaderProps {
  title: string;
  wallId: string;
}

export const WallHeader = ({ title, wallId }: WallHeaderProps) => {
  const shareUrl = `${getBaseUrl()}/send/${wallId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="text-center mb-12">
      <div className="flex flex-col items-center mb-6">
        <h1 className="text-4xl font-bold mb-2">{title}</h1>
        <p className="text-lg text-muted-foreground">
          Share this link to receive anonymous messages
        </p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Input
          value={shareUrl}
          readOnly
          className="max-w-sm bg-white"
        />
        <Button onClick={copyLink} variant="outline">
          <Share2 className="h-4 w-4 mr-2" />
          Copy Link
        </Button>
      </div>
    </div>
  );
};