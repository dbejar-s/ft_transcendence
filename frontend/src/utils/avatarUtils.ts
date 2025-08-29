// Map of predefined avatars using public URLs
const avatarMap: { [key: string]: string } = {
  "women1": "/assets/Profile/women1.png",
  "women1.png": "/assets/Profile/women1.png",
  "women2": "/assets/Profile/women2.png",
  "women2.png": "/assets/Profile/women2.png",
  "men1": "/assets/Profile/men1.png",
  "men1.png": "/assets/Profile/men1.png",
  "men2": "/assets/Profile/men2.png",
  "men2.png": "/assets/Profile/men2.png",
}

/**
 * Get the correct avatar URL for display
 * Handles uploaded avatars, predefined avatars, and file objects
 */
export const getAvatarUrl = (avatar: string | File | null | undefined): string => {
  // Handle null/undefined
  if (!avatar) {
    return '/default-avatar.svg';
  }

  // Handle File objects (for preview)
  if (avatar instanceof File) {
    const url = URL.createObjectURL(avatar);
    return url;
  }
  
  if (typeof avatar === "string") {
    // If it's an uploaded avatar (starts with /uploads/)
    if (avatar.startsWith("/uploads/")) {
      const url = `https://localhost:3001${avatar}`;
      return url;
    }
    
    // If it's a full URL
    if (avatar.startsWith("http")) {
      return avatar;
    }
    
    // If it's already a Vite import URL (contains blob: or /@fs/ or starts with /)
    if (avatar.startsWith("blob:") || avatar.startsWith("/@fs/") || avatar.startsWith("/src/assets/")) {
      return avatar;
    }
    
    // Check if it's a predefined avatar name
    const cleanName = avatar
      .replace("/assets/Profile/", "")
      .replace("../../assets/Profile/", "")
      .replace("/src/assets/Profile/", "");
    
    if (avatarMap[cleanName]) {
      return avatarMap[cleanName];
    }
    
    // Special case: if the avatar IS already the correct URL format
    if (avatar.startsWith("/assets/Profile/") && avatar.endsWith(".png")) {
      return avatar;
    }
    
    // Handle any remaining cases that might include the name
    const foundKey = Object.keys(avatarMap).find(key => 
      avatar.includes(key) || key.includes(avatar.replace('.png', ''))
    );
    if (foundKey) {
      return avatarMap[foundKey];
    }
    
    // Last resort: try the avatar as-is in case it's a valid public URL
    return avatar;
  }
  
  return "/default-avatar.svg";
}

export default getAvatarUrl;
