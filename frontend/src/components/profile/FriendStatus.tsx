import React from "react";
import { useEffect } from "react";
import type { Friend } from "./FriendProfile";

export function useFriendStatus(userId: string, setFriends: React.Dispatch<React.SetStateAction<Friend[]>>) {
  useEffect(() => {
    console.log("Setting up friend status listener for user:", userId);
    
    const handleFriendStatusUpdate = (event: CustomEvent) => {
      const { userId: friendUserId, status } = event.detail;
      console.log("Friend status update received:", friendUserId, status);
      
      setFriends((prev: Friend[]) => {
        const updated = prev.map((f: Friend) => 
          f.id === friendUserId ? { ...f, status } : f
        );
        console.log("Updated friends list after status change");
        return updated;
      });
    };

    // Listen to global friend status updates
    window.addEventListener('friendStatusUpdate', handleFriendStatusUpdate as EventListener);

    return () => {
      console.log("Cleaning up friend status listener for user:", userId);
      window.removeEventListener('friendStatusUpdate', handleFriendStatusUpdate as EventListener);
    };
  }, [userId]); // Only depend on userId
}