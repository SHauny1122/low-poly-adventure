// Helper function to get the correct asset path based on environment

export function getAssetPath(path) {
    // Remove any leading slash and normalize slashes
    path = path.replace(/^\/+/, '').replace(/\\/g, '/');
    
    // For production (Vercel)
    if (window.location.hostname !== 'localhost') {
        // Remove any 'models/' prefix to avoid duplication
        path = path.replace(/^models\//, '');
        
        // Check if it's a character model
        if (path.includes('Astronaut.glb')) {
            return `/models/character/${path}`;
        }
        
        return `/models/${path}`;
    }
    
    // For local development
    return `/${path}`;
}
