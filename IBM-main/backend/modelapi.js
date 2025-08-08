/**
 * Wildlife Detection API Script (with npm packages)
 * Integrates with Roboflow API for wildlife detection using HTTP requests
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const axios = require('axios');

/**
 * Detect wildlife in the given image and return results as JSON
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<Object>} Detection results
 */
async function detectWildlife(imagePath) {
    try {
        // Check if image file exists
        if (!fsSync.existsSync(imagePath)) {
            return {
                success: false,
                error: `Image file not found: ${imagePath}`,
                detections: [],
                total_detections: 0
            };
        }

        // Check file size (max 10MB)
        const stats = await fs.stat(imagePath);
        const fileSizeInBytes = stats.size;
        if (fileSizeInBytes > 10 * 1024 * 1024) {
            return {
                success: false,
                error: "Image file too large (max 10MB)",
                detections: [],
                total_detections: 0
            };
        }

        // Read and encode image
        const imageBuffer = await fs.readFile(imagePath);
        const imageData = imageBuffer.toString('base64');

        // API configuration
        const apiUrl = "https://detect.roboflow.com/wild-animal-x055y/1";
        const apiKey = "3lhC7048NqprBfNeQuHo";

        // Make API request to Roboflow
        const response = await axios.post(`${apiUrl}?api_key=${apiKey}`, imageData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 30000
        });

        const result = response.data;

        // Process detections
        const detections = [];
        if (result.predictions && result.predictions.length > 0) {
            for (const prediction of result.predictions) {
                const confidence = prediction.confidence || 0;
                if (confidence >= 0.3) {
                    const detection = {
                        class: prediction.class || 'Unknown',
                        confidence: confidence,
                        x: prediction.x || 0,
                        y: prediction.y || 0,
                        width: prediction.width || 0,
                        height: prediction.height || 0
                    };
                    detections.push(detection);
                }
            }
        }

        return {
            success: true,
            detections: detections,
            total_detections: detections.length,
            image_path: imagePath,
            model_id: "wild-animal-x055y/1",
            timestamp: stats.mtime.getTime().toString()
        };

    } catch (error) {
        // Handle axios errors
        if (error.response) {
            return {
                success: false,
                error: `API request failed with status ${error.response.status}`,
                detections: [],
                total_detections: 0
            };
        }

        return {
            success: false,
            error: `Detection failed: ${error.message}`,
            detections: [],
            total_detections: 0
        };
    }
}

/**
 * Main function to handle command line arguments and return JSON output
 */
async function main() {
    let result;

    if (process.argv.length !== 3) {
        result = {
            success: false,
            error: "Usage: node modelapi.js <image_path>",
            detections: [],
            total_detections: 0
        };
    } else {
        const imagePath = process.argv[2];
        result = await detectWildlife(imagePath);
    }

    console.log(JSON.stringify(result));
}

// Run main function if this script is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { detectWildlife };