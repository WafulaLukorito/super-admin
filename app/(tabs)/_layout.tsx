import { Tabs } from 'expo-router';
import React from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2ED3A3',
        tabBarInactiveTintColor: '#6E7A75',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1E1E1E',
          borderTopColor: '#2C2C2C',
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Shield',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="security" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          title: 'Limits',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="tune" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="audit"
        options={{
          title: 'Audit Logs',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="history" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="permissions"
        options={{
          title: 'Permissions',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="verified-user" size={size || 24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
