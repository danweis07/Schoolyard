import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSchoolConfig } from '../../hooks/useSchoolConfig'
import { useTranslate } from '../../hooks/useLocale'
import { isModuleEnabled } from '@schoolyard/config'
import { theme } from '../../lib/theme'

/**
 * Tab navigator. Tabs are conditionally rendered based on enabled modules
 * in school.config.json — disabled modules don't even appear in the tab bar.
 */
export default function TabLayout() {
  const config = useSchoolConfig()
  const t = useTranslate()

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
          title: t('nav.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: t('nav.events'),
          href: isModuleEnabled(config, 'events') ? '/events' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: t('nav.news'),
          href: isModuleEnabled(config, 'news') ? '/news' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="newspaper" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="volunteer"
        options={{
          title: t('nav.volunteer'),
          href: isModuleEnabled(config, 'volunteer') ? '/volunteer' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="hand-left" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: t('nav.community'),
          href: isModuleEnabled(config, 'community') ? '/community' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('nav.more'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
