from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from typing import Optional
import uuid
import os
import shutil
from PIL import Image
import numpy as np
import cv2
from virtual_tryon import VirtualTryOnProcessor

app = FastAPI(title="Virtual Try-On API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize processor
tryon_processor = VirtualTryOnProcessor()

# Ensure directories exist
os.makedirs("uploads/users", exist_ok=True)
os.makedirs("uploads/products", exist_ok=True)
os.makedirs("uploads/results", exist_ok=True)

@app.get("/")
async def root():
    return {"message": "Virtual Try-On API", "status": "running"}

@app.post("/api/tryon")
async def virtual_try_on(
    person_image: UploadFile = File(...),
    garment_image: UploadFile = File(...),
    item_type: str = "shirt"
):
    """Apply virtual try-on to person photo with garment"""
    
    # Validate file types
    if not person_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Person image must be an image")
    if not garment_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Garment image must be an image")
    
    # Save uploaded files temporarily
    person_filename = f"person_{uuid.uuid4().hex}.png"
    garment_filename = f"garment_{uuid.uuid4().hex}.png"
    
    person_path = os.path.join("uploads/users", person_filename)
    garment_path = os.path.join("uploads/products", garment_filename)
    
    # Save files
    with open(person_path, "wb") as buffer:
        shutil.copyfileobj(person_image.file, buffer)
    
    with open(garment_path, "wb") as buffer:
        shutil.copyfileobj(garment_image.file, buffer)
    
    try:
        # Process virtual try-on
        result_path = tryon_processor.apply_tryon(
            user_image_path=person_path,
            product_image_path=garment_path,
            item_type=item_type
        )
        
        # Convert result to base64 for response
        with open(result_path, "rb") as f:
            result_data = f.read()
        
        import base64
        base64_result = base64.b64encode(result_data).decode()
        data_url = f"data:image/png;base64,{base64_result}"
        
        # Clean up temporary files
        os.remove(person_path)
        os.remove(garment_path)
        
        return {
            "success": True,
            "result": data_url,
            "message": "Virtual try-on completed successfully"
        }
    
    except Exception as e:
        # Clean up on error
        if os.path.exists(person_path):
            os.remove(person_path)
        if os.path.exists(garment_path):
            os.remove(garment_path)
        
        raise HTTPException(status_code=500, detail=f"Try-on failed: {str(e)}")

@app.get("/api/results/{filename}")
async def get_result_image(filename: str):
    """Get the result image of virtual try-on"""
    filepath = os.path.join("uploads/results", filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Result not found")
    return FileResponse(filepath)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
