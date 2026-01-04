import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SCAN_INTERVAL = 1500;

export default function Kiosk() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    if (result) {
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
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

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
        skipProcessing: true,
      });

      const base64Image = `data:image/jpeg;base64,${photo.base64}`;

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
    } catch (error) {
      console.error('Scan error:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <Ionicons name="camera-outline" size={80} color="#FF6B35" />
          <Text style={styles.permissionText}>Camera Access Required</Text>
          <Text style={styles.permissionSubtext}>
            Enable camera for automatic face recognition
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
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
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
                      <ActivityIndicator size="large" color="#FF6B35" />
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
                    color={processing ? "#FF6B35" : "#06A77D"} 
                  />
                  <Text style={styles.statusText}>
                    {processing ? "Processing..." : "Ready to Scan"}
                  </Text>
                </View>
                <Text style={styles.instructionText}>
                  Position your face in the frame
                </Text>
                <Text style={styles.instructionSubtext}>
                  Automatic scanning • 1.5s interval
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
                  backgroundColor: result.success ? '#06A77D' : '#FF6B35',
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  logo: {
    width: 70,
    height: 70,
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
    marginBottom: 40,
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
    borderColor: '#FF6B35',
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
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statusContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 24,
    borderRadius: 20,
    minWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  instructionText: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    marginBottom: 6,
    fontWeight: '500',
  },
  instructionSubtext: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  resultContainer: {
    position: 'absolute',
    top: '35%',
    left: 20,
    right: 20,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
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
    backgroundColor: '#FFF',
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 20,
    color: '#1A1A1A',
    marginTop: 24,
    textAlign: 'center',
    fontWeight: '700',
  },
  permissionSubtext: {
    fontSize: 15,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
    maxWidth: 300,
  },
});
