import cv2
import numpy as np
from PIL import Image
import os
import uuid
from typing import Tuple

class VirtualTryOnProcessor:
    def __init__(self):
        pass
    
    def detect_face_landmarks(self, image: np.ndarray) -> np.ndarray:
        """Simple face detection using OpenCV for glasses/hat placement"""
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Load face classifier
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Detect faces
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        if len(faces) > 0:
            # Use the first detected face
            x, y, w, h = faces[0]
            
            # Create simple landmark points around the face
            face_points = [
                (x + w//2, y),  # top center
                (x + w//4, y + h//3),  # left eye area
                (x + 3*w//4, y + h//3),  # right eye area
                (x + w//2, y + h//2),  # nose center
                (x + w//2, y + h),  # chin center
            ]
            return np.array(face_points)
        return None
    
    def detect_body_landmarks(self, image: np.ndarray) -> np.ndarray:
        """Simple body region estimation for clothing placement"""
        h, w = image.shape[:2]
        
        # Estimate body landmarks based on image dimensions
        # This is a simplified approach without pose detection
        body_points = [
            (w//4, h//3),      # left shoulder
            (3*w//4, h//3),    # right shoulder
            (w//2, h//2),      # chest center
            (w//3, 2*h//3),    # left hip
            (2*w//3, 2*h//3),  # right hip
        ]
        return np.array(body_points)
    
    def overlay_image(self, background: np.ndarray, overlay: np.ndarray, 
                      position: Tuple[int, int], size: Tuple[int, int]) -> np.ndarray:
        """Overlay a product image onto the user photo"""
        # Validate size parameters
        width, height = size
        if width <= 0 or height <= 0:
            # Fallback to original size if invalid
            height, width = overlay.shape[:2]
        
        # Ensure minimum size
        width = max(1, width)
        height = max(1, height)
        
        try:
            overlay_resized = cv2.resize(overlay, (width, height))
        except cv2.error:
            # Fallback to original size if resize fails
            overlay_resized = overlay.copy()
        
        x, y = position
        h, w = overlay_resized.shape[:2]
        
        # Ensure overlay fits within background
        if y + h > background.shape[0]:
            h = background.shape[0] - y
            overlay_resized = overlay_resized[:h, :]
        if x + w > background.shape[1]:
            w = background.shape[1] - x
            overlay_resized = overlay_resized[:, :w]
        
        # Create mask from alpha channel if exists
        if overlay_resized.shape[2] == 4:
            alpha = overlay_resized[:, :, 3] / 255.0
            for c in range(3):
                background[y:y+h, x:x+w, c] = \
                    (1 - alpha) * background[y:y+h, x:x+w, c] + \
                    alpha * overlay_resized[:, :, c]
        else:
            background[y:y+h, x:x+w] = overlay_resized
        
        return background
    
    def apply_tryon(self, user_image_path: str, product_image_path: str, 
                    item_type: str) -> str:
        """Main function to apply virtual try-on"""
        
        # Debug: Print file paths and check if they exist
        print(f"DEBUG: user_image_path={user_image_path}")
        print(f"DEBUG: product_image_path={product_image_path}")
        print(f"DEBUG: user_image exists={os.path.exists(user_image_path) if user_image_path else False}")
        print(f"DEBUG: product_image exists={os.path.exists(product_image_path) if product_image_path else False}")
        
        # Load images using PIL first to avoid libpng errors, then convert to OpenCV
        try:
            from PIL import Image
            
            # Load with PIL first
            user_pil = Image.open(user_image_path)
            product_pil = Image.open(product_image_path)
            
            # Convert PIL to OpenCV format
            user_image = cv2.cvtColor(np.array(user_pil), cv2.COLOR_RGB2BGR)
            product_image = cv2.cvtColor(np.array(product_pil), cv2.COLOR_RGB2BGR)
            
            print(f"DEBUG: user_image shape={user_image.shape}")
            print(f"DEBUG: product_image shape={product_image.shape}")
            
        except Exception as e:
            print(f"DEBUG: PIL loading failed: {e}")
            # Fallback to OpenCV
            user_image = cv2.imread(user_image_path, cv2.IMREAD_COLOR)
            product_image = cv2.imread(product_image_path, cv2.IMREAD_COLOR)
            
            if user_image is None or product_image is None:
                raise ValueError(f"Could not load images with either PIL or OpenCV. User: {user_image is not None}, Product: {product_image is not None}")
        
        result_image = user_image.copy()
        
        # Apply different positioning based on item type
        if item_type == "glasses":
            landmarks = self.detect_face_landmarks(user_image)
            if landmarks is not None:
                # Calculate glasses position based on eye landmarks
                left_eye = landmarks[33]  # Approximate left eye index
                right_eye = landmarks[263]  # Approximate right eye index
                eye_center = ((left_eye[0] + right_eye[0]) // 2, 
                             (left_eye[1] + right_eye[1]) // 2)
                eye_distance = abs(right_eye[0] - left_eye[0])
                
                # Resize glasses to fit face
                glasses_width = int(eye_distance * 1.5)
                glasses_height = int(product_image.shape[0] * glasses_width / product_image.shape[1])
                
                position = (eye_center[0] - glasses_width // 2, 
                           eye_center[1] - glasses_height // 3)
                size = (glasses_width, glasses_height)
                
                result_image = self.overlay_image(result_image, product_image, position, size)
        
        elif item_type == "hat":
            landmarks = self.detect_face_landmarks(user_image)
            if landmarks is not None:
                # Get top of head from face landmarks
                top_head_y = min([p[1] for p in landmarks[:100]])
                head_center_x = landmarks[168][0]  # Nose bridge approximate
                
                # Calculate hat size
                hat_width = int((landmarks[454][0] - landmarks[234][0]) * 1.2)
                hat_height = int(product_image.shape[0] * hat_width / product_image.shape[1])
                
                position = (head_center_x - hat_width // 2, 
                           top_head_y - hat_height + 50)
                size = (hat_width, hat_height)
                
                result_image = self.overlay_image(result_image, product_image, position, size)
        
        elif item_type == "shirt":
            landmarks = self.detect_body_landmarks(user_image)
            if landmarks is not None and len(landmarks) >= 2:
                # Get shoulder positions using our simplified landmarks
                left_shoulder = landmarks[0]  # Our first landmark (left shoulder)
                right_shoulder = landmarks[1]  # Our second landmark (right shoulder)
                
                # Calculate shirt position and size
                shoulder_width = abs(right_shoulder[0] - left_shoulder[0])
                shirt_width = max(50, int(shoulder_width * 1.2))  # Minimum width of 50px
                
                # Calculate height based on aspect ratio
                if product_image.shape[1] > 0:
                    shirt_height = int(product_image.shape[0] * shirt_width / product_image.shape[1])
                else:
                    shirt_height = 100  # Fallback height
                
                shirt_height = max(50, shirt_height)  # Minimum height of 50px
                
                position = (left_shoulder[0] - (shirt_width - shoulder_width) // 2,
                           left_shoulder[1] - 20)
                size = (shirt_width, shirt_height)
                
                result_image = self.overlay_image(result_image, product_image, position, size)
        
        # Save result
        result_filename = f"result_{uuid.uuid4().hex}.png"
        result_path = os.path.join("uploads/results", result_filename)
        cv2.imwrite(result_path, result_image)
        
        return result_path
