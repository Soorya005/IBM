#!/usr/bin/env python3
"""
Wildlife Detection API Script
Integrates with Roboflow API for wildlife detection
"""

import sys
import json
import os
from inference_sdk import InferenceHTTPClient

def detect_wildlife(image_path):
    """
    Detect wildlife in the given image and return results as JSON
    """
    try:
        # Initialize the Roboflow client
        CLIENT = InferenceHTTPClient(
            api_url="https://serverless.roboflow.com",
            api_key="3lhC7048NqprBfNeQuHo"
        )
        
        # Validate image file
        if not os.path.exists(image_path):
            return {
                "success": False,
                "error": f"Image file not found: {image_path}",
                "detections": [],
                "total_detections": 0
            }
        
        # Check file size (optional)
        file_size = os.path.getsize(image_path)
        if file_size > 10 * 1024 * 1024:  # 10MB limit
            return {
                "success": False,
                "error": "Image file too large (max 10MB)",
                "detections": [],
                "total_detections": 0
            }
        
        # Get predictions from Roboflow
        result = CLIENT.infer(image_path, model_id="wild-animal-x055y/1")
        
        # Process detections
        detections = []
        if 'predictions' in result and result['predictions']:
            for prediction in result['predictions']:
                # Filter detections by confidence threshold
                confidence = prediction.get('confidence', 0)
                if confidence >= 0.3:  # Only include detections with >30% confidence
                    detection = {
                        "class": prediction.get('class', 'Unknown'),
                        "confidence": confidence,
                        "x": prediction.get('x', 0),
                        "y": prediction.get('y', 0),
                        "width": prediction.get('width', 0),
                        "height": prediction.get('height', 0)
                    }
                    detections.append(detection)
        
        return {
            "success": True,
            "detections": detections,
            "total_detections": len(detections),
            "image_path": image_path,
            "model_id": "wild-animal-x055y/1",
            "timestamp": str(os.path.getmtime(image_path))
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Detection failed: {str(e)}",
            "detections": [],
            "total_detections": 0
        }

def main():
    """
    Main function to handle command line arguments and return JSON output
    """
    if len(sys.argv) != 2:
        result = {
            "success": False,
            "error": "Usage: python modelapi.py <image_path>",
            "detections": [],
            "total_detections": 0
        }
    else:
        image_path = sys.argv[1]
        result = detect_wildlife(image_path)
    
    # Output JSON result to stdout for Node.js to capture
    print(json.dumps(result, indent=None, separators=(',', ':')))

if __name__ == "__main__":
    main()