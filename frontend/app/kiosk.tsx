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
import { LinearGradient } from 'expo-linear-gradient';

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
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#7B2CBF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#7B2CBF', '#9D4EDD']} style={styles.gradient}>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={80} color="#fff" />
            <Text style={styles.permissionText}>Camera permission required</Text>
            <Text style={styles.permissionSubtext}>
              Enable camera for automatic face recognition
            </Text>
          </View>
        </LinearGradient>
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
          <LinearGradient
            colors={['rgba(123, 44, 191, 0.7)', 'transparent', 'rgba(123, 44, 191, 0.7)']}
            style={styles.overlayGradient}
          >
            <View style={styles.header}>
              <Image 
                source={require('../assets/logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.headerTitle}>Sanskar Saloon</Text>
              <Text style={styles.headerSubtitle}>Attendance Kiosk</Text>
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
                      color={processing ? "#FFA562" : "#06A77D"} 
                    />
                    <Text style={styles.statusText}>
                      {processing ? "Processing..." : "Ready to scan"}
                    </Text>
                  </View>
                  <Text style={styles.instructionText}>
                    Position your face in the frame
                  </Text>
                  <Text style={styles.instructionSubtext}>
                    Auto-scanning every 1.5s
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
                  },
                ]}
              >
                <LinearGradient
                  colors={result.success ? ['#06A77D', '#0FB8A8'] : ['#FF6B35', '#FF8C42']}
                  style={styles.resultGradient}
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
                </LinearGradient>
              </Animated.View>
            )}
          </LinearGradient>
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
  },
  gradient: {
    flex: 1,
  },
  overlayGradient: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFA562',
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
    backgroundColor: 'rgba(123,44,191,0.8)',
    padding: 20,
    borderRadius: 16,
    minWidth: 300,
    borderWidth: 2,
    borderColor: '#9D4EDD',
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
    color: '#FFA562',
    textAlign: 'center',
  },
  resultContainer: {
    position: 'absolute',
    top: '35%',
    left: 20,
    right: 20,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  resultGradient: {
    padding: 32,
    alignItems: 'center',
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
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 300,
    opacity: 0.9,
  },
});
