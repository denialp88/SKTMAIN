import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Register() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
  });
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCapturePhoto = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to capture face photo.');
        return;
      }
    }
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          base64: true,
        });
        setFacePhoto(`data:image/jpeg;base64,${photo.base64}`);
        setShowCamera(false);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to capture photo');
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.department) {
      Alert.alert('Missing Information', 'Please fill all fields');
      return;
    }

    if (!facePhoto) {
      Alert.alert('Missing Photo', 'Please capture face photo');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          facePhoto,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Employee registered successfully with face recognition!', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('Error', data.detail || 'Failed to register employee');
      }
    } catch (error) {
      console.error('Error registering employee:', error);
      Alert.alert('Error', 'Failed to register employee. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
        >
          <View style={styles.cameraOverlay}>
            <LinearGradient
              colors={['rgba(123, 44, 191, 0.7)', 'transparent', 'rgba(123, 44, 191, 0.7)']}
              style={styles.overlayGradient}
            >
              <View style={styles.cameraHeader}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowCamera(false)}
                >
                  <Ionicons name="close" size={32} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.faceFrameWrapper}>
                <View style={styles.faceFrame} />
                <Text style={styles.cameraInstruction}>Position face in the frame</Text>
              </View>

              <View style={styles.cameraFooter}>
                <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                  <LinearGradient
                    colors={['#FF6B35', '#FF8C42']}
                    style={styles.captureButtonGradient}
                  >
                    <Ionicons name="camera" size={32} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#7B2CBF', '#9D4EDD', '#C77DFF']} style={styles.gradient}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Register Employee</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              <View style={styles.photoSection}>
                {facePhoto ? (
                  <View>
                    <Image source={{ uri: facePhoto }} style={styles.photoPreview} />
                    <TouchableOpacity
                      style={styles.retakeButton}
                      onPress={handleCapturePhoto}
                    >
                      <Ionicons name="camera" size={20} color="#FF6B35" />
                      <Text style={styles.retakeText}>Retake Photo</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.photoPlaceholder}
                    onPress={handleCapturePhoto}
                  >
                    <LinearGradient
                      colors={['#FF6B35', '#FF8C42']}
                      style={styles.photoPlaceholderGradient}
                    >
                      <Ionicons name="camera" size={48} color="#fff" />
                      <Text style={styles.photoPlaceholderText}>Capture Face Photo</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  placeholderTextColor="#999"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email address"
                  placeholderTextColor="#999"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  placeholderTextColor="#999"
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Department *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter department"
                  placeholderTextColor="#999"
                  value={formData.department}
                  onChangeText={(text) => setFormData({ ...formData, department: text })}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#06A77D', '#0FB8A8', '#1CD4C6']}
                  style={styles.submitButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={24} color="#fff" />
                      <Text style={styles.submitButtonText}>Register Employee</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7B2CBF',
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FF8C42',
  },
  photoPlaceholderGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    marginTop: 8,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  photoPreview: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#06A77D',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 12,
    borderRadius: 24,
  },
  retakeText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 2,
    borderColor: '#9D4EDD',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
  },
  overlayGradient: {
    flex: 1,
  },
  cameraHeader: {
    padding: 20,
    paddingTop: 60,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,107,53,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceFrameWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceFrame: {
    width: 280,
    height: 350,
    borderRadius: 140,
    borderWidth: 4,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
  },
  cameraInstruction: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cameraFooter: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
