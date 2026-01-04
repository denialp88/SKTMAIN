import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function Index() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#7B2CBF', '#9D4EDD', '#C77DFF']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Sanskar Saloon</Text>
            <Text style={styles.subtitle}>Employee Attendance System</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.kioskButton}
              onPress={() => router.push('/kiosk')}
            >
              <LinearGradient
                colors={['#FF6B35', '#FF8C42', '#FFA562']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="scan" size={56} color="#fff" />
                <Text style={styles.buttonText}>Kiosk Mode</Text>
                <Text style={styles.buttonSubtext}>Face Recognition</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => router.push('/register')}
            >
              <LinearGradient
                colors={['#06A77D', '#0FB8A8', '#1CD4C6']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="person-add" size={56} color="#fff" />
                <Text style={styles.buttonText}>Register</Text>
                <Text style={styles.buttonSubtext}>New Employee</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <View style={styles.featureRow}>
              <View style={styles.featureItem}>
                <Ionicons name="shield-checkmark" size={24} color="#fff" />
                <Text style={styles.featureText}>Secure</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="flash" size={24} color="#fff" />
                <Text style={styles.featureText}>Fast</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="eye" size={24} color="#fff" />
                <Text style={styles.featureText}>Accurate</Text>
              </View>
            </View>
          </View>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    marginTop: 8,
    opacity: 0.9,
  },
  buttonContainer: {
    gap: 20,
  },
  kioskButton: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  registerButton: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    padding: 32,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 28,
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
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});
