// Helper function to get the correct asset path based on environment

export function getAssetPath(path) {
    // Remove any leading slash and normalize slashes
    path = path.replace(/^\/+/, '').replace(/\\/g, '/');
    
    // For production (Vercel)
    if (window.location.hostname !== 'localhost') {
        // Check for special cases
        if (path.includes('Astronaut') && !path.includes('character/')) {
            return `/models/character/${path.replace('models/', '')}`;
        }
        
        // For all other models
        return `/models/${path.replace('models/', '')}`;
    }
    
    // For local development
    return `/models/${path.replace('models/', '')}`;
}
