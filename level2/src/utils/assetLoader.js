// Helper function to get the correct asset path based on environment

export function getAssetPath(path) {
    // Remove any leading slash
    path = path.replace(/^\//, '');
    
    // For production (Vercel)
    if (window.location.hostname !== 'localhost') {
        return `/level2/${path}`;
    }
    
    // For local development
    return `/${path}`;
}
