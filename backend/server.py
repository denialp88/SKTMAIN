from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import base64
import cv2
import numpy as np
from PIL import Image
import io
from deepface import DeepFace
import tempfile

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# DeepFace configuration - using VGG-Face for best accuracy
FACE_MODEL = "VGG-Face"  # Options: VGG-Face, Facenet, Facenet512, ArcFace, Dlib
DETECTOR_BACKEND = "opencv"  # Options: opencv, ssd, dlib, mtcnn, retinaface
RECOGNITION_THRESHOLD = 0.4  # Lower = more strict (VGG-Face threshold: 0.4)

def base64_to_temp_file(base64_string):
    """Convert base64 string to temporary file for DeepFace"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_string)
        
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
        temp_file.write(image_data)
        temp_file.flush()
        temp_file.close()
        
        return temp_file.name
    except Exception as e:
        logger.error(f"Error converting base64 to temp file: {str(e)}")
        raise

def check_image_quality(image_path):
    """Check if image has good quality for face recognition"""
    try:
        # Detect faces with quality attributes
        faces = DeepFace.extract_faces(
            img_path=image_path,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True
        )
        
        if not faces or len(faces) == 0:
            return False, "No face detected in image"
        
        if len(faces) > 1:
            return False, "Multiple faces detected. Please use image with single face"
        
        face_data = faces[0]
        confidence = face_data.get('confidence', 0)
        
        # Check face detection confidence
        if confidence < 0.9:
            return False, f"Face detection confidence too low ({confidence:.2f}). Please retake with better lighting"
        
        # Check face size
        facial_area = face_data.get('facial_area', {})
        face_width = facial_area.get('w', 0)
        face_height = facial_area.get('h', 0)
        
        if face_width < 80 or face_height < 80:
            return False, "Face too small. Please move closer to camera"
        
        return True, "Good quality"
        
    except Exception as e:
        if "Face could not be detected" in str(e):
            return False, "No face detected. Please ensure your face is clearly visible"
        logger.error(f"Error checking image quality: {str(e)}")
        return False, str(e)

def extract_face_embedding(image_path):
    """Extract face embedding using DeepFace with VGG-Face model"""
    try:
        # Extract embedding (128-d for VGG-Face, 512-d for Facenet512, etc.)
        embedding_objs = DeepFace.represent(
            img_path=image_path,
            model_name=FACE_MODEL,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True
        )
        
        if not embedding_objs or len(embedding_objs) == 0:
            raise ValueError("No face detected for embedding extraction")
        
        # Get the embedding vector
        embedding = embedding_objs[0]['embedding']
        
        logger.info(f"Extracted face embedding with {len(embedding)} dimensions using {FACE_MODEL}")
        
        return embedding
        
    except Exception as e:
        logger.error(f"Error extracting face embedding: {str(e)}")
        raise

def compare_faces_deepface(embedding1, embedding2):
    """Compare two face embeddings using cosine similarity"""
    try:
        # Convert to numpy arrays
        emb1 = np.array(embedding1)
        emb2 = np.array(embedding2)
        
        # Calculate cosine distance
        from numpy.linalg import norm
        cosine_distance = 1 - np.dot(emb1, emb2) / (norm(emb1) * norm(emb2))
        
        return float(cosine_distance)
        
    except Exception as e:
        logger.error(f"Error comparing embeddings: {str(e)}")
        raise

def verify_faces_with_liveness(image_path):
    """Basic liveness check - detects if image might be a photo of a photo"""
    try:
        # Read image
        image = cv2.imread(image_path)
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Calculate Laplacian variance (blur detection)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Check for blur (photos of photos tend to be blurry)
        if laplacian_var < 100:
            return False, f"Image appears blurry or low quality (score: {laplacian_var:.1f}). Please ensure live face capture"
        
        # Check for uniform color distribution (photos have different color characteristics)
        color_std = np.std(image)
        if color_std < 20:
            return False, "Image appears to lack natural color variation. Please use live camera"
        
        return True, "Liveness check passed"
        
    except Exception as e:
        logger.error(f"Error in liveness check: {str(e)}")
        return True, "Liveness check skipped"  # Don't block on liveness errors

# Define Models
class Employee(BaseModel):
    id: Optional[str] = None
    name: str
    email: EmailStr
    phone: str
    department: str
    facePhoto: str  # base64 encoded
    faceDescriptor: Optional[List[float]] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class EmployeeCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    department: str
    facePhoto: str  # base64 encoded
    faceDescriptor: Optional[List[float]] = None

class EmployeeResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    department: str
    facePhoto: str
    faceDescriptor: Optional[List[float]] = None
    createdAt: datetime

class Attendance(BaseModel):
    id: Optional[str] = None
    employeeId: str
    employeeName: str
    type: str  # "in" or "out"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    facePhoto: Optional[str] = None  # Optional face photo at punch time

class AttendanceCreate(BaseModel):
    employeeId: str
    employeeName: str
    type: str
    facePhoto: Optional[str] = None

class AttendanceResponse(BaseModel):
    id: str
    employeeId: str
    employeeName: str
    type: str
    timestamp: datetime
    facePhoto: Optional[str] = None

class FaceRecognitionRequest(BaseModel):
    facePhoto: str  # base64 encoded photo from kiosk

class FaceRecognitionResponse(BaseModel):
    recognized: bool
    employeeId: Optional[str] = None
    employeeName: Optional[str] = None
    attendanceType: Optional[str] = None  # "in" or "out"
    message: str

# Helper function to convert ObjectId to string
def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

# Employee Routes
@api_router.post("/employees", response_model=EmployeeResponse)
async def create_employee(employee: EmployeeCreate):
    temp_file = None
    try:
        employee_dict = employee.dict()
        employee_dict["createdAt"] = datetime.utcnow()
        
        # Extract real face embedding if facePhoto is provided
        if employee_dict.get("facePhoto"):
            try:
                # Convert base64 to temporary file
                temp_file = base64_to_temp_file(employee_dict["facePhoto"])
                
                # Check image quality with liveness
                liveness_ok, liveness_msg = verify_faces_with_liveness(temp_file)
                if not liveness_ok:
                    raise HTTPException(status_code=400, detail=liveness_msg)
                
                # Check image quality
                quality_ok, quality_msg = check_image_quality(temp_file)
                if not quality_ok:
                    raise HTTPException(status_code=400, detail=quality_msg)
                
                # Extract face embedding using DeepFace
                embedding = extract_face_embedding(temp_file)
                
                # Store the real embedding
                employee_dict["faceDescriptor"] = embedding
                
                logger.info(f"Successfully extracted face embedding with {len(embedding)} features using {FACE_MODEL}")
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error processing face photo: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Failed to process face photo: {str(e)}")
            finally:
                # Clean up temporary file
                if temp_file and os.path.exists(temp_file):
                    os.unlink(temp_file)
        
        result = await db.employees.insert_one(employee_dict)
        employee_dict["id"] = str(result.inserted_id)
        logger.info(f"Employee created: {employee_dict['name']} with high-quality face recognition")
        return EmployeeResponse(**employee_dict)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating employee: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/employees", response_model=List[EmployeeResponse])
async def get_employees():
    try:
        employees = await db.employees.find().to_list(1000)
        # Ensure all employees have createdAt field
        for emp in employees:
            if 'createdAt' not in emp:
                emp['createdAt'] = datetime.utcnow()
        return [EmployeeResponse(**serialize_doc(emp)) for emp in employees]
    except Exception as e:
        logger.error(f"Error fetching employees: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/employees/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: str):
    try:
        employee = await db.employees.find_one({"_id": ObjectId(employee_id)})
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        return EmployeeResponse(**serialize_doc(employee))
    except Exception as e:
        logger.error(f"Error fetching employee: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Attendance Routes
@api_router.post("/attendance", response_model=AttendanceResponse)
async def create_attendance(attendance: AttendanceCreate):
    try:
        attendance_dict = attendance.dict()
        attendance_dict["timestamp"] = datetime.utcnow()
        result = await db.attendance.insert_one(attendance_dict)
        attendance_dict["id"] = str(result.inserted_id)
        logger.info(f"Attendance recorded: {attendance_dict['employeeName']} - {attendance_dict['type']}")
        return AttendanceResponse(**attendance_dict)
    except Exception as e:
        logger.error(f"Error creating attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/attendance/last/{employee_id}")
async def get_last_attendance(employee_id: str):
    try:
        last_attendance = await db.attendance.find_one(
            {"employeeId": employee_id},
            sort=[("timestamp", -1)]
        )
        if not last_attendance:
            return {"type": None, "message": "No previous attendance found"}
        return {
            "type": last_attendance.get("type"),
            "timestamp": last_attendance.get("timestamp"),
            "nextAction": "out" if last_attendance.get("type") == "in" else "in"
        }
    except Exception as e:
        logger.error(f"Error fetching last attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/attendance/employee/{employee_id}", response_model=List[AttendanceResponse])
async def get_employee_attendance(employee_id: str):
    try:
        attendance_records = await db.attendance.find(
            {"employeeId": employee_id}
        ).sort("timestamp", -1).to_list(100)
        # Ensure all attendance records have timestamp field
        for record in attendance_records:
            if 'timestamp' not in record:
                record['timestamp'] = datetime.utcnow()
        return [AttendanceResponse(**serialize_doc(record)) for record in attendance_records]
    except Exception as e:
        logger.error(f"Error fetching employee attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Face Recognition Route
@api_router.post("/attendance/recognize", response_model=FaceRecognitionResponse)
async def recognize_face(request: FaceRecognitionRequest):
    temp_file = None
    try:
        # Convert base64 to temporary file
        temp_file = base64_to_temp_file(request.facePhoto)
        
        # Check image quality with liveness
        liveness_ok, liveness_msg = verify_faces_with_liveness(temp_file)
        if not liveness_ok:
            return FaceRecognitionResponse(
                recognized=False,
                message=liveness_msg
            )
        
        # Check image quality
        quality_ok, quality_msg = check_image_quality(temp_file)
        if not quality_ok:
            return FaceRecognitionResponse(
                recognized=False,
                message=quality_msg
            )
        
        # Extract face embedding using DeepFace
        try:
            probe_embedding = extract_face_embedding(temp_file)
            logger.info(f"Extracted probe face embedding with {len(probe_embedding)} features using {FACE_MODEL}")
        except Exception as e:
            if "Face could not be detected" in str(e):
                return FaceRecognitionResponse(
                    recognized=False,
                    message="No face detected. Please position your face clearly in front of the camera."
                )
            else:
                return FaceRecognitionResponse(
                    recognized=False,
                    message=f"Face processing failed: {str(e)}"
                )
        
        # Get all employees with face descriptors
        employees = await db.employees.find({"faceDescriptor": {"$exists": True, "$ne": None}}).to_list(1000)
        
        if not employees:
            return FaceRecognitionResponse(
                recognized=False,
                message="No registered employees found. Please register first."
            )
        
        # Compare with all stored embeddings using DeepFace comparison
        matched_employee = None
        min_distance = float('inf')
        
        for employee in employees:
            if "faceDescriptor" in employee and employee["faceDescriptor"]:
                try:
                    # Use DeepFace embedding comparison
                    distance = compare_faces_deepface(probe_embedding, employee["faceDescriptor"])
                    logger.info(f"Distance for {employee['name']}: {distance}")
                    
                    if distance < min_distance:
                        min_distance = distance
                        if distance < RECOGNITION_THRESHOLD:
                            matched_employee = employee
                except Exception as e:
                    logger.error(f"Error comparing with {employee['name']}: {str(e)}")
                    continue
        
        if not matched_employee:
            logger.info(f"No match found. Minimum distance was: {min_distance}")
            return FaceRecognitionResponse(
                recognized=False,
                message=f"Face not recognized (confidence too low: {min_distance:.2f}). Please try again or contact admin for registration."
            )
        
        # Get last attendance to determine next action
        employee_id = str(matched_employee["_id"])
        
        # Check if this is the first entry of the day
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        last_attendance = await db.attendance.find_one(
            {
                "employeeId": employee_id,
                "timestamp": {"$gte": today_start}
            },
            sort=[("timestamp", -1)]
        )
        
        # Determine attendance type
        # First entry of the day is always "in"
        if not last_attendance:
            attendance_type = "in"
        else:
            # Toggle between in and out
            attendance_type = "out" if last_attendance.get("type") == "in" else "in"
        
        # Record attendance
        attendance_dict = {
            "employeeId": employee_id,
            "employeeName": matched_employee["name"],
            "type": attendance_type,
            "facePhoto": request.facePhoto,
            "timestamp": datetime.utcnow()
        }
        await db.attendance.insert_one(attendance_dict)
        
        confidence = max(0, min(100, (1 - min_distance / RECOGNITION_THRESHOLD) * 100))
        logger.info(f"Face recognized: {matched_employee['name']} - Punch {attendance_type} (distance: {min_distance:.2f}, confidence: {confidence:.1f}%) using {FACE_MODEL}")
        
        return FaceRecognitionResponse(
            recognized=True,
            employeeId=employee_id,
            employeeName=matched_employee["name"],
            attendanceType=attendance_type,
            message=f"Welcome {matched_employee['name']}! Punched {attendance_type.upper()} successfully (Confidence: {confidence:.0f}%)."
        )
        
    except Exception as e:
        logger.error(f"Error in face recognition: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up temporary file
        if temp_file and os.path.exists(temp_file):
            os.unlink(temp_file)

@api_router.get("/")
async def root():
    return {"message": "Employee Attendance API", "status": "running"}

@api_router.delete("/employees/clear-old")
async def clear_old_employees():
    """Clear employees with old face descriptor format (non-VGG-Face)"""
    try:
        # Delete employees with old 128-d or 3780-d descriptors (not 4096-d VGG-Face)
        result = await db.employees.delete_many({
            "$or": [
                {"faceDescriptor": {"$size": 128}},
                {"faceDescriptor": {"$size": 3780}}
            ]
        })
        
        logger.info(f"Cleared {result.deleted_count} old employees")
        return {
            "success": True,
            "deleted_count": result.deleted_count,
            "message": f"Cleared {result.deleted_count} employees with old face format. Please re-register them."
        }
    except Exception as e:
        logger.error(f"Error clearing old employees: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
