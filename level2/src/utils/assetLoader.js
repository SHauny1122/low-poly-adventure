// Helper function to get the correct asset path based on environment
const BASE_PATH = '/level2';

export function getAssetPath(path) {
    // Remove any leading slashes and 'public' prefix if present
    path = path.replace(/^\/+/, '').replace(/^public\//, '');
    
    // For production, we want /level2/models/...
    return `${BASE_PATH}/${path}`;
}
