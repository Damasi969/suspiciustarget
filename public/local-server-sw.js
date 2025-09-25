// Service Worker for handling local file requests without external server

const CACHE_NAME = 'nautical-app-v1';
const STATIC_RESOURCES = [
    '/',
    './standalone.html',
    './charts/',
];

// Install event - cache static resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Service Worker: Caching static resources');
            return cache.addAll(STATIC_RESOURCES);
        })
    );
    self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve files locally or from cache
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Handle chart tile requests
    if (url.pathname.includes('/charts/')) {
        event.respondWith(handleChartRequest(event.request));
        return;
    }
    
    // Handle other requests
    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) {
                return response;
            }
            
            // For local files, try to serve from file system
            if (url.protocol === 'file:' || url.hostname === 'localhost') {
                return fetch(event.request).catch(() => {
                    // Fallback for offline operation
                    return new Response('Resource not available offline', {
                        status: 404,
                        statusText: 'Not Found'
                    });
                });
            }
            
            return fetch(event.request);
        })
    );
});

// Handle chart tile requests with fallback
async function handleChartRequest(request) {
    try {
        // Try to get from cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Try to fetch from local file system
        const response = await fetch(request);
        if (response.ok) {
            // Cache successful responses
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
            return response;
        }
        
        throw new Error('Chart not found');
    } catch (error) {
        // Generate placeholder chart tile
        return generatePlaceholderChart(request.url);
    }
}

// Generate placeholder chart tile
function generatePlaceholderChart(url) {
    // Extract zoom/x/y from URL for context
    const pathParts = url.split('/');
    const filename = pathParts[pathParts.length - 1];
    const coordinates = pathParts.slice(-3).join('/');
    
    // Create a canvas-based placeholder
    const canvas = new OffscreenCanvas(256, 256);
    const ctx = canvas.getContext('2d');
    
    // Draw water background
    ctx.fillStyle = '#4A90E2';
    ctx.fillRect(0, 0, 256, 256);
    
    // Add grid lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 256; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 256);
        ctx.moveTo(0, i);
        ctx.lineTo(256, i);
        ctx.stroke();
    }
    
    // Add text info
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText('Nautical Chart', 10, 20);
    ctx.fillText(coordinates, 10, 40);
    ctx.fillText('Placeholder Tile', 10, 60);
    
    return canvas.convertToBlob({ type: 'image/png' }).then(blob => {
        return new Response(blob, {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=3600'
            }
        });
    });
}