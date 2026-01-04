import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function Index() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Cards Section */}
        <View style={styles.cardsSection}>
          {/* Kiosk Card */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/kiosk')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF8C42', '#FF6B35']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.cardIconContainer}>
                <View style={styles.iconCircle}>
                  <Ionicons name="scan" size={42} color="#FF6B35" />
                </View>
              </View>
              <Text style={styles.cardTitle}>Kiosk Mode</Text>
              <Text style={styles.cardSubtitle}>Scan face for attendance</Text>
              <View style={styles.cardArrow}>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Register Card */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/register')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#1CD4C6', '#06A77D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.cardIconContainer}>
                <View style={styles.iconCircle}>
                  <Ionicons name="person-add" size={42} color="#06A77D" />
                </View>
              </View>
              <Text style={styles.cardTitle}>Register</Text>
              <Text style={styles.cardSubtitle}>Add new employee</Text>
              <View style={styles.cardArrow}>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.featureBadge}>
            <Ionicons name="shield-checkmark" size={18} color="#06A77D" />
            <Text style={styles.featureText}>Secure</Text>
          </View>
          <View style={styles.featureBadge}>
            <Ionicons name="flash" size={18} color="#FF6B35" />
            <Text style={styles.featureText}>Fast</Text>
          </View>
          <View style={styles.featureBadge}>
            <Ionicons name="eye" size={18} color="#7B2CBF" />
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
    backgroundColor: '#F8F9FC',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
  },
  logoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    width: 140,
    height: 140,
  },
  cardsSection: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 20,
  },
  card: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  cardGradient: {
    padding: 28,
    minHeight: 160,
  },
  cardIconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.95,
    fontWeight: '500',
  },
  cardArrow: {
    position: 'absolute',
    bottom: 28,
    right: 28,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FC',
    borderRadius: 12,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
});
