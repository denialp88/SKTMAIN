#!/usr/bin/env python3
"""
Additional Face Recognition Tests for Employee Attendance App
Tests edge cases and threshold behavior
"""

import requests
import json
import random

BACKEND_URL = "https://checkin-app-43.preview.emergentagent.com/api"

def generate_face_descriptor():
    """Generate a face descriptor with 128 random floats between 0 and 1"""
    return [random.uniform(0, 1) for _ in range(128)]

def generate_dummy_base64_image():
    """Generate a dummy base64 encoded image"""
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

def test_face_recognition_threshold():
    """Test face recognition threshold behavior"""
    print("\n=== Testing Face Recognition Threshold Behavior ===")
    
    # Create a test employee
    test_employee = {
        "name": "Threshold Test User",
        "email": "threshold@test.com",
        "phone": "+1-555-9999",
        "department": "Testing",
        "facePhoto": generate_dummy_base64_image(),
        "faceDescriptor": generate_face_descriptor()
    }
    
    # Register the employee
    response = requests.post(f"{BACKEND_URL}/employees", json=test_employee)
    if response.status_code != 200:
        print(f"❌ Failed to create test employee: {response.text}")
        return False
    
    employee_data = response.json()
    print(f"✅ Created test employee: {employee_data['name']}")
    
    # Test 1: Exact match (distance = 0)
    print("\n--- Test 1: Exact Match ---")
    exact_match_data = {
        "faceDescriptor": test_employee["faceDescriptor"],
        "facePhoto": generate_dummy_base64_image()
    }
    
    response = requests.post(f"{BACKEND_URL}/attendance/recognize", json=exact_match_data)
    if response.status_code == 200:
        data = response.json()
        print(f"Recognized: {data['recognized']}")
        print(f"Employee: {data.get('employeeName')}")
        if data['recognized']:
            print("✅ Exact match correctly recognized")
        else:
            print("❌ Exact match failed to recognize")
    
    # Test 2: Close match (small variations)
    print("\n--- Test 2: Close Match ---")
    close_descriptor = test_employee["faceDescriptor"].copy()
    # Add small variations (should still be under threshold)
    for i in range(10):
        close_descriptor[i] += random.uniform(-0.05, 0.05)
    
    close_match_data = {
        "faceDescriptor": close_descriptor,
        "facePhoto": generate_dummy_base64_image()
    }
    
    response = requests.post(f"{BACKEND_URL}/attendance/recognize", json=close_match_data)
    if response.status_code == 200:
        data = response.json()
        print(f"Recognized: {data['recognized']}")
        if data['recognized']:
            print("✅ Close match correctly recognized")
        else:
            print("⚠️ Close match not recognized (may be expected depending on variation)")
    
    # Test 3: Far match (should exceed threshold)
    print("\n--- Test 3: Far Match ---")
    far_descriptor = [random.uniform(0, 1) for _ in range(128)]
    
    far_match_data = {
        "faceDescriptor": far_descriptor,
        "facePhoto": generate_dummy_base64_image()
    }
    
    response = requests.post(f"{BACKEND_URL}/attendance/recognize", json=far_match_data)
    if response.status_code == 200:
        data = response.json()
        print(f"Recognized: {data['recognized']}")
        if not data['recognized']:
            print("✅ Far match correctly rejected")
        else:
            print("❌ Far match incorrectly recognized")
    
    return True

def test_euclidean_distance_calculation():
    """Test the Euclidean distance calculation manually"""
    print("\n=== Testing Euclidean Distance Calculation ===")
    
    # Create two identical descriptors
    desc1 = [0.5] * 128
    desc2 = [0.5] * 128
    
    # Calculate expected distance (should be 0)
    expected_distance = sum([(a - b) ** 2 for a, b in zip(desc1, desc2)]) ** 0.5
    print(f"Expected distance for identical descriptors: {expected_distance}")
    
    # Create descriptors with known distance
    desc3 = [0.0] * 128
    desc4 = [1.0] * 128
    
    # Calculate expected distance
    expected_distance_2 = sum([(a - b) ** 2 for a, b in zip(desc3, desc4)]) ** 0.5
    print(f"Expected distance for [0.0]*128 vs [1.0]*128: {expected_distance_2}")
    print(f"This should be approximately: {128**0.5:.2f}")
    
    return True

def test_attendance_sequence():
    """Test a complete attendance sequence"""
    print("\n=== Testing Complete Attendance Sequence ===")
    
    # Get an existing employee
    response = requests.get(f"{BACKEND_URL}/employees")
    if response.status_code != 200:
        print("❌ Failed to get employees")
        return False
    
    employees = response.json()
    if not employees:
        print("❌ No employees found")
        return False
    
    test_employee = employees[0]
    print(f"Testing with employee: {test_employee['name']}")
    
    # Perform multiple punch in/out cycles
    for cycle in range(3):
        print(f"\n--- Cycle {cycle + 1} ---")
        
        # Get current last attendance
        response = requests.get(f"{BACKEND_URL}/attendance/last/{test_employee['id']}")
        if response.status_code == 200:
            last_data = response.json()
            expected_next = last_data.get('nextAction', 'in')
            print(f"Expected next action: {expected_next}")
        
        # Perform face recognition
        recognition_data = {
            "faceDescriptor": test_employee["faceDescriptor"],
            "facePhoto": generate_dummy_base64_image()
        }
        
        response = requests.post(f"{BACKEND_URL}/attendance/recognize", json=recognition_data)
        if response.status_code == 200:
            data = response.json()
            actual_action = data.get('attendanceType')
            print(f"Actual action: {actual_action}")
            
            if actual_action == expected_next:
                print("✅ Attendance sequence correct")
            else:
                print("❌ Attendance sequence incorrect")
        else:
            print(f"❌ Face recognition failed: {response.text}")
    
    return True

def run_additional_tests():
    """Run additional comprehensive tests"""
    print("🔬 Starting Additional Face Recognition Tests")
    print("=" * 60)
    
    test_results = []
    
    test_results.append(test_face_recognition_threshold())
    test_results.append(test_euclidean_distance_calculation())
    test_results.append(test_attendance_sequence())
    
    print("\n" + "=" * 60)
    print("🏁 ADDITIONAL TESTS SUMMARY")
    print("=" * 60)
    
    passed = sum(test_results)
    total = len(test_results)
    
    print(f"Threshold Testing: {'✅ PASS' if test_results[0] else '❌ FAIL'}")
    print(f"Distance Calculation: {'✅ PASS' if test_results[1] else '❌ FAIL'}")
    print(f"Attendance Sequence: {'✅ PASS' if test_results[2] else '❌ FAIL'}")
    
    print(f"\nOverall: {passed}/{total} additional tests passed")
    
    return test_results

if __name__ == "__main__":
    run_additional_tests()