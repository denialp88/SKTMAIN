import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="finger-print" size={80} color="#4CAF50" />
          <Text style={styles.title}>Employee Attendance</Text>
          <Text style={styles.subtitle}>Face Recognition System</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.kioskButton]}
            onPress={() => router.push('/kiosk')}
          >
            <Ionicons name="camera" size={48} color="#fff" />
            <Text style={styles.buttonText}>Kiosk Mode</Text>
            <Text style={styles.buttonSubtext}>Punch In/Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.registerButton]}
            onPress={() => router.push('/register')}
          >
            <Ionicons name="person-add" size={48} color="#fff" />
            <Text style={styles.buttonText}>Register Employee</Text>
            <Text style={styles.buttonSubtext}>Add new employee</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Face Recognition Attendance System</Text>
          <Text style={styles.footerSubtext}>Secure • Fast • Accurate</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
  },
  buttonContainer: {
    gap: 20,
  },
  button: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  kioskButton: {
    backgroundColor: '#4CAF50',
  },
  registerButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  buttonSubtext: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
