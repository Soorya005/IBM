
"""
Wildlife Detection API Script
Integrates with Roboflow API for wildlife detection using HTTP requests
"""

import sys
import json
import os
import base64
import requests

def detect_wildlife(image_path):
    """
    Detect wildlife in the given image and return results as JSON
    """
    try:
        # Check if image file exists
        if not os.path.exists(image_path):
            return {
                "success": False,
                "error": f"Image file not found: {image_path}",
                "detections": [],
                "total_detections": 0
            }
        
        # Check file size (max 10MB)
        file_size = os.path.getsize(image_path)
        if file_size > 10 * 1024 * 1024:  
            return {
                "success": False,
                "error": "Image file too large (max 10MB)",
                "detections": [],
                "total_detections": 0
            }
        
        # Read and encode image
        with open(image_path, 'rb') as image_file:
            image_data = base64.b64encode(image_file.read()).decode('utf-8')
        
        # Make API request to Roboflow
        api_url = "https://detect.roboflow.com/wild-animal-x055y/1"
        api_key = "3lhC7048NqprBfNeQuHo"
        
        response = requests.post(
            f"{api_url}?api_key={api_key}",
            data=image_data,
            headers={
                "Content-Type": "application/x-www-form-urlencoded"
            },
            timeout=30
        )
        
        if response.status_code != 200:
            return {
                "success": False,
                "error": f"API request failed with status {response.status_code}",
                "detections": [],
                "total_detections": 0
            }
        
        result = response.json()
        
        # Process detections
        detections = []
        if 'predictions' in result and result['predictions']:
            for prediction in result['predictions']:
                
                
                confidence = prediction.get('confidence', 0)
                if confidence >= 0.3:  
                    
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
    
    
    
    print(json.dumps(result, indent=None, separators=(',', ':')))

if __name__ == "__main__":
    main()