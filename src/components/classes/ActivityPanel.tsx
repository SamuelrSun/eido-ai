// src/components/classes/ActivityPanel.tsx
import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileUp, FileDown, UserPlus, UserMinus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ClassActivity } from '@/services/activityService'; // Import the type from Stage 1

// --- 1. Define the props the component will receive ---
interface ActivityPanelProps {
  isLoading: boolean;
  activityLog: ClassActivity[];
}

// --- 2. Create helper functions for formatting ---
const getActivityIcon = (type: ClassActivity['activity_type']) => {
  switch (type) {
    case 'file_uploaded':
      return <FileUp className="h-4 w-4 text-green-500" />;
    case 'file_deleted':
      return <FileDown className="h-4 w-4 text-red-500" />;
    case 'member_joined':
      return <UserPlus className="h-4 w-4 text-blue-500" />;
    case 'member_left':
      return <UserMinus className="h-4 w-4 text-orange-500" />;
    default:
      return null;
  }
};

const formatActivityText = (activity: ClassActivity) => {
  const actor = activity.actor_full_name || 'A user';
  switch (activity.activity_type) {
    case 'file_uploaded':
      return <>{actor} uploaded <strong>{activity.details?.file_name || 'a file'}</strong>.</>;
    case 'file_deleted':
      return <>{actor} deleted <strong>{activity.details?.file_name || 'a file'}</strong>.</>;
    case 'member_joined':
      return <>{actor} joined the class.</>;
    case 'member_left':
      return <>{actor} left the class.</>;
    default:
      return 'An unknown action occurred.';
  }
};

// --- 3. Create a sub-component for individual activity items ---
const ActivityItem: React.FC<{ activity: ClassActivity }> = ({ activity }) => {
  const userInitials = activity.actor_full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  
  return (
    <div className="flex items-start gap-4 p-3 hover:bg-neutral-800/50 rounded-md">
      <Avatar className="h-9 w-9 border">
        <AvatarImage src={activity.actor_avatar_url} alt={activity.actor_full_name} />
        <AvatarFallback>{userInitials}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="text-sm text-neutral-200">
          {formatActivityText(activity)}
        </p>
        <p className="text-xs text-neutral-500">
          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
        </p>
      </div>
      <div className="flex-shrink-0">
        {getActivityIcon(activity.activity_type)}
      </div>
    </div>
  );
};

// --- 4. Create a skeleton loader for the loading state ---
const ActivitySkeleton = () => (
  <div className="space-y-4 p-3">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    ))}
  </div>
);


export const ActivityPanel: React.FC<ActivityPanelProps> = ({ isLoading, activityLog }) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>
          A log of recent events that have occurred in this class.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 -mx-6">
          <div className="px-6">
            {isLoading ? (
              <ActivitySkeleton />
            ) : activityLog.length > 0 ? (
              <div className="space-y-2">
                {activityLog.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">No activity to display yet.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};