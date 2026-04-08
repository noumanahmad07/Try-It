# Python Virtual Try-On API Setup

## What We've Built

**Python FastAPI Virtual Try-On Solution:**
- **Real Virtual Try-On**: Uses OpenCV for face/body detection
- **Image Overlay**: Places garments on detected body regions
- **Maintains Person Identity**: Only changes clothing, keeps the same person
- **No AI Generation**: Uses computer vision instead of text-to-image

## Files Created

```
virtual-tryon-api/
  main.py              # FastAPI server
  virtual_tryon.py     # Core virtual try-on logic
  requirements.txt     # Python dependencies
```

## Key Features

### VirtualTryOnProcessor:
- **Face Detection**: OpenCV Haar cascades for glasses/hats
- **Body Estimation**: Simplified body landmark detection
- **Image Overlay**: Alpha blending for realistic placement
- **Multiple Items**: Supports shirts, glasses, hats

### API Endpoints:
- `POST /api/tryon` - Main virtual try-on endpoint
- `GET /api/results/{filename}` - Serve result images

## Integration with React App

### Updated server.ts:
- Calls Python API at `http://localhost:8000/api/tryon`
- Falls back to Hugging Face if Python API unavailable
- Maintains existing React frontend interface

## How It Works

1. **Upload Images**: Person + Garment images
2. **Detect Features**: Face/body landmarks using OpenCV
3. **Calculate Position**: Based on detected landmarks
4. **Overlay Garment**: Resize and place on person
5. **Return Result**: Base64 encoded image

## Advantages Over Hugging Face

- **Maintains Identity**: Keeps original person
- **Real Virtual Try-On**: Not AI generation
- **Better Control**: Precise garment placement
- **No API Limits**: Local processing

## Next Steps

1. **Install Dependencies**: `pip install -r requirements.txt`
2. **Start Python Server**: `python main.py`
3. **Test Integration**: Try virtual try-on in React app

## Dependencies (Simplified)

- fastapi - Web framework
- uvicorn - ASGI server  
- opencv-python - Computer vision
- pillow - Image processing
- numpy - Numerical operations
- python-multipart - File uploads
- python-dotenv - Environment variables

**Note**: Removed MediaPipe due to compatibility issues. Uses OpenCV instead.
