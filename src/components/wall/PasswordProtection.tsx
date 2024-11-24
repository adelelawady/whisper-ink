import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface PasswordProtectionProps {
  password: string;
  setPassword: (password: string) => void;
  handlePasswordSubmit: (e: React.FormEvent) => void;
}

export const PasswordProtection = ({ password, setPassword, handlePasswordSubmit }: PasswordProtectionProps) => {
  return (
    <Card className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4 text-center">
        This wall is password protected
      </h2>
      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <Input
          type="password"
          placeholder="Enter password to view messages"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className="w-full">
          View Messages
        </Button>
      </form>
    </Card>
  );
};