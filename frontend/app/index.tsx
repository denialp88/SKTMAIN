import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Image 
            source={require('../assets/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.kioskCard}
            onPress={() => router.push('/kiosk')}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="scan-outline" size={64} color="#FF6B35" />
            </View>
            <Text style={styles.cardTitle}>Kiosk Mode</Text>
            <Text style={styles.cardSubtitle}>Automatic Face Recognition</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerCard}
            onPress={() => router.push('/register')}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="person-add-outline" size={64} color="#06A77D" />
            </View>
            <Text style={styles.cardTitle}>Register Employee</Text>
            <Text style={styles.cardSubtitle}>Add New Team Member</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <View style={styles.featureItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#666" />
            <Text style={styles.featureText}>Secure</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.featureItem}>
            <Ionicons name="flash-outline" size={20} color="#666" />
            <Text style={styles.featureText}>Fast</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.featureItem}>
            <Ionicons name="eye-outline" size={20} color="#666" />
            <Text style={styles.featureText}>Accurate</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  logo: {
    width: 180,
    height: 180,
  },
  buttonContainer: {
    flex: 1,
    gap: 20,
    justifyContent: 'center',
    marginBottom: 40,
  },
  kioskCard: {
    backgroundColor: '#FFF5F0',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  registerCard: {
    backgroundColor: '#F0FFF9',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#06A77D',
    shadowColor: '#06A77D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  iconContainer: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#DDD',
  },
});
