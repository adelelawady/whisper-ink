import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./card";
import { Button } from "./button";
import { Clock, Lock, Unlock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface WallVisit {
  id: string;
  wall_id: string;
  title: string;
  last_visited: string;
  is_authenticated: boolean;
}

// Move recordWallVisit outside the component
export const recordWallVisit = async (
  wallId: string,
  title: string,
  isAuthenticated: boolean
) => {
  let visitorId = localStorage.getItem('visitor_id');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem('visitor_id', visitorId);
  }

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  try {
    await supabase.rpc('upsert_wall_visit', {
      p_wall_id: wallId,
      p_title: title,
      p_is_authenticated: isAuthenticated,
      p_user_id: userId,
      p_visitor_id: !userId ? visitorId : null
    });
  } catch (error) {
    console.error('Error recording wall visit:', error);
  }
};

export const RecentWalls = () => {
  const [recentWalls, setRecentWalls] = useState<WallVisit[]>([]);
  const { session } = useSessionContext();
  const navigate = useNavigate();

  // Get or create visitor ID for anonymous users
  const getVisitorId = () => {
    let visitorId = localStorage.getItem('visitor_id');
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem('visitor_id', visitorId);
    }
    return visitorId;
  };

  useEffect(() => {
    const fetchRecentWalls = async () => {
      const userId = session?.user?.id;
      const visitorId = getVisitorId();

      const { data, error } = await supabase
        .from('wall_visits')
        .select('id, wall_id, title, last_visited, is_authenticated')
        .order('last_visited', { ascending: false })
        .limit(5)
        .or(`user_id.eq.${userId},visitor_id.eq.${visitorId}`);

      if (error) {
        console.error('Error fetching recent walls:', error);
        return;
      }

      // Filter out duplicates based on wall_id
      const uniqueWalls = data?.reduce((acc: WallVisit[], current) => {
        const exists = acc.find(wall => wall.wall_id === current.wall_id);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []) || [];

      setRecentWalls(uniqueWalls);
    };

    fetchRecentWalls();
  }, [session]);

  if (recentWalls.length === 0) return null;

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5" />
        Recent Walls
      </h2>
      <div className="space-y-2">
        {recentWalls.map((wall) => (
          <Button
            key={wall.id}
            variant="ghost"
            className="w-full justify-between"
            onClick={() => navigate(`/wall/${wall.wall_id}`)}
          >
            <div className="flex items-center gap-2">
              {wall.is_authenticated ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Unlock className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="truncate">{wall.title}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(wall.last_visited), { addSuffix: true })}
            </span>
          </Button>
        ))}
      </div>
    </Card>
  );
}; 