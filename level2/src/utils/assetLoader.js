// Helper function to get the correct asset path based on environment

export function getAssetPath(path) {
    // Remove any leading slash and normalize slashes
    path = path.replace(/^\/+/, '').replace(/\\/g, '/');
    
    // For production (Vercel)
    if (window.location.hostname !== 'localhost') {
        // Keep the full path structure for subdirectories
        if (path.includes('character/') || path.includes('props/')) {
            return `/models/${path}`;
        }
        // For top-level models, just use the filename
        return `/models/${path.split('/').pop()}`;
    }
    
    // For local development
    return `/${path}`;
}
