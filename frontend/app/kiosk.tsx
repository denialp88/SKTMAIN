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
const SCAN_INTERVAL = 3000; // Scan every 3 seconds

export default function Kiosk() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Automatic scanning effect
  useEffect(() => {
    if (permission?.granted && !processing) {
      // Start automatic scanning
      startAutomaticScanning();
    }

    return () => {
      // Cleanup on unmount
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
    };
  }, [permission?.granted]);

  // Handle result animation and cleanup
  useEffect(() => {
    if (result) {
      // Speak the result
      if (result.success && result.name) {
        const message = `Welcome ${result.name}. Punched ${result.action}`;
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
        Animated.delay(4000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setResult(null);
        // Resume scanning after result is dismissed
        if (!processing) {
          startAutomaticScanning();
        }
      });
    }
  }, [result]);

  const startAutomaticScanning = () => {
    // Clear any existing timer
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
    }

    // Schedule next scan
    scanTimerRef.current = setTimeout(() => {
      const now = Date.now();
      // Prevent too frequent scans
      if (now - lastScanTimeRef.current >= SCAN_INTERVAL) {
        handleAutomaticScan();
      } else {
        startAutomaticScanning();
      }
    }, 1000);
  };

  const handleAutomaticScan = async () => {
    if (cameraRef.current && !processing && permission?.granted) {
      setProcessing(true);
      lastScanTimeRef.current = Date.now();

      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
        });

        const base64Image = `data:image/jpeg;base64,${photo.base64}`;

        // Send to backend for real face recognition
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
        } else {
          // Don't show error for "no face detected" to avoid constant error messages
          if (!data.message.includes('No face detected') && !data.message.includes('quality')) {
            setResult({
              success: false,
              message: data.message,
            });
          }
        }
      } catch (error) {
        console.error('Error scanning face:', error);
        // Silent fail for automatic scanning
      } finally {
        setProcessing(false);
        // Continue automatic scanning
        if (!result) {
          startAutomaticScanning();
        }
      }
    } else {
      // Retry if conditions not met
      startAutomaticScanning();
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
      <CameraView ref={cameraRef} style={styles.camera} facing="front">
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
                  Automatic scanning is active
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  instructionContainer: {
    alignItems: 'center',
  },
  faceFrameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  faceFrame: {
    width: 280,
    height: 350,
    borderRadius: 140,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#4CAF50',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 20,
  },
  scanningIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statusContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
    borderRadius: 16,
    minWidth: 300,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  instructionText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionSubtext: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
  },
  resultContainer: {
    position: 'absolute',
    top: '35%',
    left: 20,
    right: 20,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  resultName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
  },
  resultAction: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  resultTimestamp: {
    fontSize: 16,
    color: '#fff',
    marginTop: 12,
    opacity: 0.9,
  },
  resultMessage: {
    fontSize: 16,
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 300,
  },
});
