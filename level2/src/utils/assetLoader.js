// Helper function to get the correct asset path based on environment
const BASE_PATH = '/level2';

export function getAssetPath(path) {
    // Remove any leading slashes
    path = path.replace(/^\/+/, '');
    
    // Add public prefix if not already present
    if (!path.startsWith('public/')) {
        path = `public/${path}`;
    }
    
    // Add level2 prefix for production
    return `/level2/${path}`;
}
