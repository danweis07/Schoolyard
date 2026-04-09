import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSchoolConfig } from '../../hooks/useSchoolConfig'
import { isModuleEnabled } from '@schoolyard/config'
import { theme } from '../../lib/theme'

/**
 * Tab navigator. Tabs are conditionally rendered based on enabled modules
 * in school.config.json — disabled modules don't even appear in the tab bar.
 */
export default function TabLayout() {
  const config = useSchoolConfig()

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.color.primary,
        tabBarInactiveTintColor: theme.color.text.muted,
        headerStyle: { backgroundColor: theme.color.primary },
        headerTintColor: theme.color.text.inverse,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          href: isModuleEnabled(config, 'events') ? '/events' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="volunteer"
        options={{
          title: 'Volunteer',
          href: isModuleEnabled(config, 'volunteer') ? '/volunteer' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="hand-left" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          href: isModuleEnabled(config, 'community') ? '/community' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
