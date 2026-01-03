#!/usr/bin/env python3
"""
Backend API Testing for Employee Attendance App
Tests all backend endpoints with realistic data
"""

import requests
import json
import random
import base64
from datetime import datetime
import time

# Get backend URL from frontend env
BACKEND_URL = "https://checkin-app-43.preview.emergentagent.com/api"

# Test data
def generate_face_descriptor():
    """Generate a face descriptor with 128 random floats between 0 and 1"""
    return [random.uniform(0, 1) for _ in range(128)]

def generate_dummy_base64_image():
    """Generate a dummy base64 encoded image"""
    # Simple 1x1 pixel PNG in base64
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

# Test employees data
test_employees = [
    {
        "name": "John Smith",
        "email": "john.smith@company.com",
        "phone": "+1-555-0101",
        "department": "Engineering",
        "facePhoto": generate_dummy_base64_image(),
        "faceDescriptor": generate_face_descriptor()
    },
    {
        "name": "Sarah Johnson",
        "email": "sarah.johnson@company.com", 
        "phone": "+1-555-0102",
        "department": "Marketing",
        "facePhoto": generate_dummy_base64_image(),
        "faceDescriptor": generate_face_descriptor()
    },
    {
        "name": "Mike Davis",
        "email": "mike.davis@company.com",
        "phone": "+1-555-0103", 
        "department": "Sales",
        "facePhoto": generate_dummy_base64_image(),
        "faceDescriptor": generate_face_descriptor()
    }
]

# Store created employee IDs for testing
created_employee_ids = []

def test_api_health():
    """Test if API is running"""
    print("\n=== Testing API Health ===")
    try:
        response = requests.get(f"{BACKEND_URL}/")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ API Health Check Failed: {e}")
        return False

def test_create_employees():
    """Test POST /api/employees - Register employees"""
    print("\n=== Testing Employee Registration ===")
    success_count = 0
    
    for i, employee in enumerate(test_employees):
        try:
            print(f"\nCreating employee {i+1}: {employee['name']}")
            response = requests.post(f"{BACKEND_URL}/employees", json=employee)
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Employee created successfully")
                print(f"Employee ID: {data['id']}")
                print(f"Name: {data['name']}")
                print(f"Email: {data['email']}")
                print(f"Department: {data['department']}")
                print(f"Face descriptor length: {len(data.get('faceDescriptor', []))}")
                
                created_employee_ids.append(data['id'])
                success_count += 1
            else:
                print(f"❌ Failed to create employee: {response.text}")
                
        except Exception as e:
            print(f"❌ Error creating employee {employee['name']}: {e}")
    
    print(f"\n📊 Employee Creation Summary: {success_count}/{len(test_employees)} successful")
    return success_count == len(test_employees)

def test_get_all_employees():
    """Test GET /api/employees - Get all employees"""
    print("\n=== Testing Get All Employees ===")
    try:
        response = requests.get(f"{BACKEND_URL}/employees")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            employees = response.json()
            print(f"✅ Retrieved {len(employees)} employees")
            
            for emp in employees:
                print(f"- {emp['name']} ({emp['department']}) - ID: {emp['id']}")
                
            return len(employees) >= len(test_employees)
        else:
            print(f"❌ Failed to get employees: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error getting employees: {e}")
        return False

def test_get_employee_by_id():
    """Test GET /api/employees/{employee_id} - Get single employee"""
    print("\n=== Testing Get Employee by ID ===")
    success_count = 0
    
    for emp_id in created_employee_ids:
        try:
            print(f"\nGetting employee with ID: {emp_id}")
            response = requests.get(f"{BACKEND_URL}/employees/{emp_id}")
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                employee = response.json()
                print(f"✅ Employee retrieved successfully")
                print(f"Name: {employee['name']}")
                print(f"Email: {employee['email']}")
                print(f"Department: {employee['department']}")
                print(f"Face descriptor present: {bool(employee.get('faceDescriptor'))}")
                success_count += 1
            else:
                print(f"❌ Failed to get employee: {response.text}")
                
        except Exception as e:
            print(f"❌ Error getting employee {emp_id}: {e}")
    
    print(f"\n📊 Get Employee Summary: {success_count}/{len(created_employee_ids)} successful")
    return success_count == len(created_employee_ids)

def test_manual_attendance():
    """Test POST /api/attendance - Record attendance manually"""
    print("\n=== Testing Manual Attendance Recording ===")
    success_count = 0
    
    for i, emp_id in enumerate(created_employee_ids):
        try:
            employee_name = test_employees[i]['name']
            attendance_data = {
                "employeeId": emp_id,
                "employeeName": employee_name,
                "type": "in",
                "facePhoto": generate_dummy_base64_image()
            }
            
            print(f"\nRecording attendance for {employee_name}")
            response = requests.post(f"{BACKEND_URL}/attendance", json=attendance_data)
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Attendance recorded successfully")
                print(f"Attendance ID: {data['id']}")
                print(f"Employee: {data['employeeName']}")
                print(f"Type: {data['type']}")
                print(f"Timestamp: {data['timestamp']}")
                success_count += 1
            else:
                print(f"❌ Failed to record attendance: {response.text}")
                
        except Exception as e:
            print(f"❌ Error recording attendance for {employee_name}: {e}")
    
    print(f"\n📊 Manual Attendance Summary: {success_count}/{len(created_employee_ids)} successful")
    return success_count == len(created_employee_ids)

def test_get_last_attendance():
    """Test GET /api/attendance/last/{employee_id} - Get last attendance"""
    print("\n=== Testing Get Last Attendance ===")
    success_count = 0
    
    for i, emp_id in enumerate(created_employee_ids):
        try:
            employee_name = test_employees[i]['name']
            print(f"\nGetting last attendance for {employee_name}")
            response = requests.get(f"{BACKEND_URL}/attendance/last/{emp_id}")
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Last attendance retrieved successfully")
                print(f"Last type: {data.get('type')}")
                print(f"Next action: {data.get('nextAction')}")
                print(f"Timestamp: {data.get('timestamp')}")
                success_count += 1
            else:
                print(f"❌ Failed to get last attendance: {response.text}")
                
        except Exception as e:
            print(f"❌ Error getting last attendance for {employee_name}: {e}")
    
    print(f"\n📊 Get Last Attendance Summary: {success_count}/{len(created_employee_ids)} successful")
    return success_count == len(created_employee_ids)

def test_get_employee_attendance_history():
    """Test GET /api/attendance/employee/{employee_id} - Get attendance history"""
    print("\n=== Testing Get Employee Attendance History ===")
    success_count = 0
    
    for i, emp_id in enumerate(created_employee_ids):
        try:
            employee_name = test_employees[i]['name']
            print(f"\nGetting attendance history for {employee_name}")
            response = requests.get(f"{BACKEND_URL}/attendance/employee/{emp_id}")
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                history = response.json()
                print(f"✅ Attendance history retrieved successfully")
                print(f"Records found: {len(history)}")
                
                for record in history:
                    print(f"- {record['type'].upper()} at {record['timestamp']}")
                    
                success_count += 1
            else:
                print(f"❌ Failed to get attendance history: {response.text}")
                
        except Exception as e:
            print(f"❌ Error getting attendance history for {employee_name}: {e}")
    
    print(f"\n📊 Attendance History Summary: {success_count}/{len(created_employee_ids)} successful")
    return success_count == len(created_employee_ids)

def test_face_recognition():
    """Test POST /api/attendance/recognize - Face recognition and auto punch"""
    print("\n=== Testing Face Recognition and Auto Punch ===")
    
    # Test 1: Matching face descriptor (should recognize)
    print("\n--- Test 1: Matching Face Recognition ---")
    try:
        # Use the first employee's face descriptor
        matching_descriptor = test_employees[0]['faceDescriptor']
        recognition_data = {
            "faceDescriptor": matching_descriptor,
            "facePhoto": generate_dummy_base64_image()
        }
        
        print(f"Testing recognition with {test_employees[0]['name']}'s face descriptor")
        response = requests.post(f"{BACKEND_URL}/attendance/recognize", json=recognition_data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Face recognition response received")
            print(f"Recognized: {data['recognized']}")
            print(f"Employee: {data.get('employeeName')}")
            print(f"Attendance Type: {data.get('attendanceType')}")
            print(f"Message: {data['message']}")
            
            if data['recognized']:
                print("✅ Face recognition successful - employee identified")
                test1_success = True
            else:
                print("❌ Face recognition failed - employee not identified")
                test1_success = False
        else:
            print(f"❌ Face recognition request failed: {response.text}")
            test1_success = False
            
    except Exception as e:
        print(f"❌ Error in face recognition test 1: {e}")
        test1_success = False
    
    # Test 2: Non-matching face descriptor (should not recognize)
    print("\n--- Test 2: Non-Matching Face Recognition ---")
    try:
        # Generate a completely different face descriptor
        non_matching_descriptor = generate_face_descriptor()
        recognition_data = {
            "faceDescriptor": non_matching_descriptor,
            "facePhoto": generate_dummy_base64_image()
        }
        
        print("Testing recognition with unknown face descriptor")
        response = requests.post(f"{BACKEND_URL}/attendance/recognize", json=recognition_data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Face recognition response received")
            print(f"Recognized: {data['recognized']}")
            print(f"Message: {data['message']}")
            
            if not data['recognized']:
                print("✅ Face recognition correctly rejected unknown face")
                test2_success = True
            else:
                print("❌ Face recognition incorrectly identified unknown face")
                test2_success = False
        else:
            print(f"❌ Face recognition request failed: {response.text}")
            test2_success = False
            
    except Exception as e:
        print(f"❌ Error in face recognition test 2: {e}")
        test2_success = False
    
    # Test 3: Auto punch in/out logic
    print("\n--- Test 3: Auto Punch In/Out Logic ---")
    try:
        # Use second employee for punch in/out testing
        employee_descriptor = test_employees[1]['faceDescriptor']
        employee_name = test_employees[1]['name']
        
        print(f"Testing auto punch logic with {employee_name}")
        
        # First scan should be "in"
        recognition_data = {
            "faceDescriptor": employee_descriptor,
            "facePhoto": generate_dummy_base64_image()
        }
        
        print("First scan (should be IN):")
        response1 = requests.post(f"{BACKEND_URL}/attendance/recognize", json=recognition_data)
        
        if response1.status_code == 200:
            data1 = response1.json()
            print(f"Attendance Type: {data1.get('attendanceType')}")
            first_punch_correct = data1.get('attendanceType') == 'out'  # Should be 'out' since we already punched 'in' manually
        else:
            first_punch_correct = False
            
        time.sleep(1)  # Small delay between requests
        
        # Second scan should be opposite of first
        print("Second scan (should be opposite of first):")
        response2 = requests.post(f"{BACKEND_URL}/attendance/recognize", json=recognition_data)
        
        if response2.status_code == 200:
            data2 = response2.json()
            print(f"Attendance Type: {data2.get('attendanceType')}")
            second_punch_correct = data2.get('attendanceType') != data1.get('attendanceType')
        else:
            second_punch_correct = False
            
        test3_success = first_punch_correct and second_punch_correct
        if test3_success:
            print("✅ Auto punch in/out logic working correctly")
        else:
            print("❌ Auto punch in/out logic not working correctly")
            
    except Exception as e:
        print(f"❌ Error in auto punch logic test: {e}")
        test3_success = False
    
    print(f"\n📊 Face Recognition Summary:")
    print(f"- Matching face recognition: {'✅' if test1_success else '❌'}")
    print(f"- Non-matching face rejection: {'✅' if test2_success else '❌'}")
    print(f"- Auto punch in/out logic: {'✅' if test3_success else '❌'}")
    
    return test1_success and test2_success and test3_success

def run_all_tests():
    """Run all backend API tests"""
    print("🚀 Starting Employee Attendance App Backend API Tests")
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 60)
    
    test_results = {}
    
    # Test API health first
    test_results['api_health'] = test_api_health()
    if not test_results['api_health']:
        print("❌ API is not responding. Stopping tests.")
        return test_results
    
    # Run all tests in order
    test_results['employee_registration'] = test_create_employees()
    test_results['get_all_employees'] = test_get_all_employees()
    test_results['get_employee_by_id'] = test_get_employee_by_id()
    test_results['manual_attendance'] = test_manual_attendance()
    test_results['get_last_attendance'] = test_get_last_attendance()
    test_results['attendance_history'] = test_get_employee_attendance_history()
    test_results['face_recognition'] = test_face_recognition()
    
    # Print final summary
    print("\n" + "=" * 60)
    print("🏁 FINAL TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend APIs are working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the detailed output above.")
    
    return test_results

if __name__ == "__main__":
    run_all_tests()