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

# Load OpenCV face detector (Haar Cascade)
face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
face_cascade = cv2.CascadeClassifier(face_cascade_path)

def base64_to_image(base64_string):
    """Convert base64 string to OpenCV image"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_string)
        
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        # Convert to numpy array (OpenCV format)
        image = np.array(pil_image)
        
        # Convert RGB to BGR for OpenCV
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        
        return image
    except Exception as e:
        logger.error(f"Error converting base64 to image: {str(e)}")
        raise

def detect_face(image):
    """Detect face in image using OpenCV Haar Cascade"""
    try:
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(100, 100),
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        
        return faces
    except Exception as e:
        logger.error(f"Error detecting face: {str(e)}")
        raise

def extract_face_descriptor(image, face_rect):
    """Extract face descriptor using histogram of oriented gradients (HOG) features"""
    try:
        x, y, w, h = face_rect
        
        # Extract face region with some padding
        padding = int(w * 0.1)
        face_roi = image[
            max(0, y-padding):min(image.shape[0], y+h+padding),
            max(0, x-padding):min(image.shape[1], x+w+padding)
        ]
        
        if face_roi.size == 0:
            raise ValueError("Invalid face region")
        
        # Resize face to standard size (128x128)
        face_resized = cv2.resize(face_roi, (128, 128))
        
        # Convert to grayscale
        face_gray = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)
        
        # Apply histogram equalization for better feature extraction
        face_equalized = cv2.equalizeHist(face_gray)
        
        # Compute HOG features
        win_size = (128, 128)
        block_size = (16, 16)
        block_stride = (8, 8)
        cell_size = (8, 8)
        nbins = 9
        
        hog = cv2.HOGDescriptor(win_size, block_size, block_stride, cell_size, nbins)
        hog_features = hog.compute(face_equalized)
        
        # Flatten and normalize
        descriptor = hog_features.flatten()
        descriptor = descriptor / (np.linalg.norm(descriptor) + 1e-7)  # Normalize
        
        return descriptor.tolist()
    except Exception as e:
        logger.error(f"Error extracting face descriptor: {str(e)}")
        raise

def compare_descriptors(desc1, desc2):
    """Compare two face descriptors using Euclidean distance"""
    try:
        desc1_array = np.array(desc1)
        desc2_array = np.array(desc2)
        
        # Calculate Euclidean distance
        distance = np.linalg.norm(desc1_array - desc2_array)
        
        return float(distance)
    except Exception as e:
        logger.error(f"Error comparing descriptors: {str(e)}")
        raise

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
    faceDescriptor: List[float]
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
    try:
        employee_dict = employee.dict()
        employee_dict["createdAt"] = datetime.utcnow()
        
        # Extract real face descriptor if facePhoto is provided
        if employee_dict.get("facePhoto"):
            try:
                # Convert base64 to image
                image = base64_to_image(employee_dict["facePhoto"])
                
                # Detect face
                faces = detect_face(image)
                
                if len(faces) == 0:
                    raise HTTPException(status_code=400, detail="No face detected in image. Please ensure face is clearly visible.")
                
                if len(faces) > 1:
                    raise HTTPException(status_code=400, detail="Multiple faces detected. Please use image with single face.")
                
                # Extract face descriptor from the detected face
                face_rect = faces[0]
                descriptor = extract_face_descriptor(image, face_rect)
                
                # Store the real descriptor
                employee_dict["faceDescriptor"] = descriptor
                
                logger.info(f"Successfully extracted face descriptor with {len(descriptor)} features")
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error processing face photo: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Failed to process face photo: {str(e)}")
        
        result = await db.employees.insert_one(employee_dict)
        employee_dict["id"] = str(result.inserted_id)
        logger.info(f"Employee created: {employee_dict['name']}")
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
    try:
        # Get all employees with face descriptors
        employees = await db.employees.find({"faceDescriptor": {"$exists": True}}).to_list(1000)
        
        if not employees:
            return FaceRecognitionResponse(
                recognized=False,
                message="No registered employees found"
            )
        
        # Compare face descriptors (Euclidean distance)
        matched_employee = None
        min_distance = float('inf')
        threshold = 0.6  # Face recognition threshold
        
        for employee in employees:
            if "faceDescriptor" in employee and employee["faceDescriptor"]:
                # Calculate Euclidean distance
                distance = sum([(a - b) ** 2 for a, b in zip(request.faceDescriptor, employee["faceDescriptor"])]) ** 0.5
                logger.info(f"Distance for {employee['name']}: {distance}")
                
                if distance < min_distance and distance < threshold:
                    min_distance = distance
                    matched_employee = employee
        
        if not matched_employee:
            return FaceRecognitionResponse(
                recognized=False,
                message="Face not recognized. Please contact admin for registration."
            )
        
        # Get last attendance to determine next action
        employee_id = str(matched_employee["_id"])
        last_attendance = await db.attendance.find_one(
            {"employeeId": employee_id},
            sort=[("timestamp", -1)]
        )
        
        # Determine attendance type
        attendance_type = "in"
        if last_attendance and last_attendance.get("type") == "in":
            attendance_type = "out"
        
        # Record attendance
        attendance_dict = {
            "employeeId": employee_id,
            "employeeName": matched_employee["name"],
            "type": attendance_type,
            "facePhoto": request.facePhoto,
            "timestamp": datetime.utcnow()
        }
        await db.attendance.insert_one(attendance_dict)
        
        logger.info(f"Face recognized: {matched_employee['name']} - Punch {attendance_type}")
        
        return FaceRecognitionResponse(
            recognized=True,
            employeeId=employee_id,
            employeeName=matched_employee["name"],
            attendanceType=attendance_type,
            message=f"Welcome {matched_employee['name']}! Punched {attendance_type.upper()} successfully."
        )
        
    except Exception as e:
        logger.error(f"Error in face recognition: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/")
async def root():
    return {"message": "Employee Attendance API", "status": "running"}

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
