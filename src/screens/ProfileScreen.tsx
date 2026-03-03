import React from 'react';
import { Pressable, SafeAreaView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AppStackParamList } from '@/src/navigation/AppNavigator';

type ProfileNavigation = NativeStackNavigationProp<AppStackParamList, 'Profile'>;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileNavigation>();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 }}>
        <Pressable
          onPress={() => navigation.navigate('Login')}
          style={{ width: '100%', maxWidth: 280, backgroundColor: '#ff2d55', paddingVertical: 14, borderRadius: 10 }}
        >
          <Text style={{ textAlign: 'center', color: '#fff', fontSize: 16, fontWeight: '600' }}>Увійти</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('Registration')}
          style={{ width: '100%', maxWidth: 280, backgroundColor: '#111', paddingVertical: 14, borderRadius: 10 }}
        >
          <Text style={{ textAlign: 'center', color: '#fff', fontSize: 16, fontWeight: '600' }}>Реєстрація</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('Settings')}
          style={{ width: '100%', maxWidth: 280, backgroundColor: '#eee', paddingVertical: 14, borderRadius: 10 }}
        >
          <Text style={{ textAlign: 'center', color: '#111', fontSize: 16, fontWeight: '600' }}>Налаштування</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default ProfileScreen;
