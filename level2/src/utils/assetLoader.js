// Helper function to get the correct asset path based on environment
const BASE_PATH = '/level2';

export function getAssetPath(path) {
    // Remove leading slash if present
    path = path.startsWith('/') ? path.slice(1) : path;
    return `${BASE_PATH}/${path}`;
}
