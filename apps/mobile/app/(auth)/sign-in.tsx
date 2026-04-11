/**
 * Magic-link sign-in screen.
 *
 * Guest mode is the default — users only land here when they tap a
 * write action (RSVP, log hours, report a listing, etc.). After the
 * link is sent, the user taps it from their email and the deep-link
 * returns them to the app where Supabase Auth finalizes the session.
 */
import { useState } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { getSupabase } from '../../lib/supabase'

export default function SignIn() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')

  async function sendMagicLink() {
    const supabase = getSupabase()
    if (!supabase) {
      setStatus('error')
      setMessage(
        'Supabase is not configured. Ask an administrator to set EXPO_PUBLIC_SUPABASE_URL.',
      )
      return
    }
    if (!email || !email.includes('@')) {
      setStatus('error')
      setMessage('Please enter a valid email address.')
      return
    }
    setStatus('sending')
    setMessage('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Deep link target — tapping the email on a device opens Expo Router at "/".
        emailRedirectTo: 'schoolyard://',
      },
    })
    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }
    setStatus('sent')
    setMessage('Check your email for a sign-in link.')
  }

  return (
    <View className="flex-1 justify-center bg-white p-6">
      <Text className="mb-2 text-2xl font-bold">Sign in</Text>
      <Text className="mb-6 text-sm text-gray-600">
        Enter your email and we'll send a sign-in link. No password needed.
      </Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        editable={status !== 'sending'}
        className="mb-4 rounded-lg border border-gray-300 px-4 py-3 text-base"
      />
      <Pressable
        onPress={sendMagicLink}
        disabled={status === 'sending'}
        className="rounded-lg bg-blue-600 px-6 py-3 disabled:opacity-50"
      >
        {status === 'sending' ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-center text-base font-semibold text-white">Send sign-in link</Text>
        )}
      </Pressable>
      {message ? (
        <Text className={`mt-4 text-sm ${status === 'error' ? 'text-red-600' : 'text-green-700'}`}>
          {message}
        </Text>
      ) : null}
      <Pressable onPress={() => router.back()} className="mt-6">
        <Text className="text-center text-sm text-gray-500">Skip — continue as guest</Text>
      </Pressable>
    </View>
  )
}
