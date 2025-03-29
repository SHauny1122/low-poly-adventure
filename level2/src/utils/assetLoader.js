// Helper function to get the correct asset path based on environment
const BASE_PATH = '/level2';

export function getAssetPath(path) {
    // Remove any leading slashes
    path = path.replace(/^\/+/, '');
    
    // For production, we want /level2/models/...
    // For local dev, we want /models/...
    return `${BASE_PATH}/${path}`;
}
