import { Tabs } from 'expo-router';
import { HomeIcon, PlusCircle, Settings } from 'lucide-react-native';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { storageManager } from '@/utils/storageManager';
import { useEffect, useState } from 'react';

export default function TabLayout() {
  const { colors } = useTheme();
  const { isOnline } = useNetworkStatus();
  const [storageMode, setStorageMode] = useState<'local' | 'cloud'>('local');

  // Track storage mode changes
  useEffect(() => {
    const initializeStorageMode = async () => {
      await storageManager.initialize();
      setStorageMode(storageManager.getStorageMode());
    };
    initializeStorageMode();
  }, []);

  // Determine if add tab should be disabled
  const isAddDisabled = !isOnline && storageMode === 'cloud';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.backgroundDark }],
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.tabBarLabel,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Cards',
          tabBarLabel: 'Cards',
          tabBarIcon: ({ color, size }) => <HomeIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add Card',
          tabBarLabel: 'Add',
          tabBarIcon: ({ color, size }) => (
            <PlusCircle 
              size={size} 
              color={isAddDisabled ? colors.textHint : color} 
            />
          ),
          tabBarLabelStyle: [
            styles.tabBarLabel,
            isAddDisabled && { color: colors.textHint }
          ],
          // Disable the tab when offline in cloud mode
          tabBarButton: (props) => {
            if (isAddDisabled) {
              return (
                <View style={[styles.disabledTab, { backgroundColor: colors.backgroundDark }]}>
                  <PlusCircle size={24} color={colors.textHint} />
                  <Text style={[styles.disabledTabLabel, { color: colors.textHint }]}>
                    Add
                  </Text>
                </View>
              );
            }
            return (
              <TouchableOpacity 
                {...props} 
                style={props.style}
                delayLongPress={props.delayLongPress || undefined}
              >
                {props.children}
              </TouchableOpacity>
            );
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 0,
    elevation: 0,
    height: 60,
    paddingBottom: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  disabledTab: {
    flex: 1,
    opacity: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  disabledTabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});