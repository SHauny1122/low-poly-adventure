// Helper function to get the correct asset path based on environment

export function getAssetPath(path) {
    // Remove any leading slash and normalize slashes
    path = path.replace(/^\/+/, '').replace(/\\/g, '/');
    
    // Get the base URL from Vite's import.meta.env
    const baseUrl = import.meta.env.BASE_URL || '/';
    
    // For production (Vercel)
    if (window.location.hostname !== 'localhost') {
        // Ensure we don't double up the base URL
        return baseUrl.replace(/\/+$/, '') + '/' + path;
    }
    
    // For local development
    return '/' + path;
}
