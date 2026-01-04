import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SCAN_INTERVAL = 1500; // Scan every 1.5 seconds (faster)

export default function Kiosk() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Automatic scanning effect
  useEffect(() => {
    if (permission?.granted) {
      startAutomaticScanning();
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [permission?.granted]);

  // Handle result animation and cleanup
  useEffect(() => {
    if (result) {
      // Speak only the name (no punch in/out)
      if (result.success && result.name) {
        const message = `Welcome ${result.name}`;
        Speech.speak(message, {
          language: 'en-US',
          pitch: 1.0,
          rate: 0.9,
        });
      }

      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setResult(null);
      });
    }
  }, [result]);

  const startAutomaticScanning = () => {
    // Clear any existing interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    // Start interval-based scanning
    scanIntervalRef.current = setInterval(() => {
      if (!processing && !result) {
        handleAutomaticScan();
      }
    }, SCAN_INTERVAL);
  };

  const handleAutomaticScan = async () => {
    if (!cameraRef.current || processing || result || !permission?.granted) {
      return;
    }

    setProcessing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        base64: true,
        skipProcessing: true, // Skip sound and processing
      });

      const base64Image = `data:image/jpeg;base64,${photo.base64}`;

      // Send to backend for face recognition
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/attendance/recognize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facePhoto: base64Image,
        }),
      });

      const data = await response.json();

      if (data.recognized) {
        setResult({
          success: true,
          name: data.employeeName,
          action: data.attendanceType,
          message: data.message,
        });
      }
      // Don't show errors to avoid constant notifications
    } catch (error) {
      console.error('Scan error:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color="#999" />
          <Text style={styles.permissionText}>Camera permission is required</Text>
          <Text style={styles.permissionSubtext}>
            This kiosk app requires camera access for automatic face recognition
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        ref={cameraRef} 
        style={styles.camera} 
        facing="front"
        enableTorch={false}
      >
        <SafeAreaView style={styles.overlay}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Ionicons name="shield-checkmark" size={32} color="#fff" />
              <Text style={styles.headerTitle}>Attendance Kiosk</Text>
            </View>
            <Text style={styles.headerSubtitle}>Automatic Face Recognition</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.instructionContainer}>
              <View style={styles.faceFrameContainer}>
                <View style={styles.faceFrame}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                  
                  {processing && (
                    <View style={styles.scanningIndicator}>
                      <ActivityIndicator size="large" color="#4CAF50" />
                      <Text style={styles.scanningText}>Scanning...</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.statusContainer}>
                <View style={styles.statusIndicator}>
                  <Ionicons 
                    name={processing ? "scan-circle" : "checkmark-circle"} 
                    size={24} 
                    color={processing ? "#FFC107" : "#4CAF50"} 
                  />
                  <Text style={styles.statusText}>
                    {processing ? "Processing..." : "Ready to scan"}
                  </Text>
                </View>
                <Text style={styles.instructionText}>
                  Position your face in the frame
                </Text>
                <Text style={styles.instructionSubtext}>
                  Automatic scanning every 1.5s
                </Text>
              </View>
            </View>
          </View>

          {result && (
            <Animated.View
              style={[
                styles.resultContainer,
                {
                  opacity: fadeAnim,
                  backgroundColor: result.success ? 'rgba(76, 175, 80, 0.95)' : 'rgba(244, 67, 54, 0.95)',
                },
              ]}
            >
              <Ionicons
                name={result.success ? 'checkmark-circle' : 'close-circle'}
                size={64}
                color="#fff"
              />
              {result.success ? (
                <>
                  <Text style={styles.resultName}>{result.name}</Text>
                  <Text style={styles.resultAction}>
                    Punched {result.action?.toUpperCase()}
                  </Text>
                  <Text style={styles.resultTimestamp}>
                    {new Date().toLocaleTimeString()}
                  </Text>
                </>
              ) : (
                <Text style={styles.resultMessage}>{result.message}</Text>
              )}
            </Animated.View>
          )}
        </SafeAreaView>
      </CameraView>
    </View>
  );
}
