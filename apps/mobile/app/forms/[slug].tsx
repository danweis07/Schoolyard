import { useState } from 'react'
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useForms } from '../../hooks/useForms'
import { useLocale, useTranslate } from '../../hooks/useLocale'
import { getSupabase } from '../../lib/supabase'
import type { FormFieldDefinition } from '@schoolyard/content-api'

export default function FormFillScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const locale = useLocale()
  const t = useTranslate(locale)
  const router = useRouter()
  const { data: forms, isLoading, error } = useForms()
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-4">
        <ActivityIndicator />
        <Text className="mt-3 text-muted">{t('common.loading')}</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-4">
        <Text className="text-center text-muted">{(error as Error).message}</Text>
      </View>
    )
  }

  const form = forms?.find((f) => f.slug === slug)

  if (!form) {
    return (
      <View className="flex-1 items-center justify-center bg-surface p-4">
        <Text className="text-lg font-semibold">{t('errors.notFound')}</Text>
      </View>
    )
  }

  const setValue = (fieldName: string, value: string) => {
    setResponses((prev) => ({ ...prev, [fieldName]: value }))
  }

  const handleSubmit = async () => {
    // Validate required fields
    for (const field of form.fields) {
      if (field.required && !responses[field.name]?.trim()) {
        Alert.alert(t('forms.required'), `${field.label} ${t('forms.isRequired')}`)
        return
      }
    }

    setSubmitting(true)
    try {
      const supabase = getSupabase()
      if (!supabase) {
        Alert.alert(t('errors.generic'), t('forms.signInRequired'))
        return
      }

      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) {
        Alert.alert(t('errors.generic'), t('forms.signInRequired'))
        return
      }

      const gatewayUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
      const res = await fetch(
        `${gatewayUrl}/functions/v1/gateway/user/form-response`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            formSlug: form.slug,
            responses,
          }),
        },
      )

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text)
      }

      Alert.alert(t('forms.submitted'), t('forms.submittedMessage'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ])
    } catch (err) {
      Alert.alert(t('errors.generic'), (err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const renderField = (field: FormFieldDefinition) => {
    switch (field.type) {
      case 'textarea':
        return (
          <TextInput
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            placeholder={field.placeholder}
            value={responses[field.name] ?? ''}
            onChangeText={(v) => setValue(field.name, v)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={{ minHeight: 100 }}
          />
        )
      case 'select':
        // Render as a simple list of pressable options
        return (
          <View className="rounded-lg border border-border bg-surface">
            {(field.options ?? []).map((opt) => (
              <Pressable
                key={opt}
                onPress={() => setValue(field.name, opt)}
                className="border-b border-border px-3 py-2 last:border-b-0 active:bg-muted/10"
              >
                <Text
                  className={
                    responses[field.name] === opt
                      ? 'text-sm font-semibold text-primary'
                      : 'text-sm'
                  }
                >
                  {responses[field.name] === opt ? '\u2713 ' : ''}
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>
        )
      case 'checkbox':
        return (
          <Pressable
            onPress={() =>
              setValue(field.name, responses[field.name] === 'true' ? 'false' : 'true')
            }
            className="flex-row items-center gap-2"
          >
            <View
              className={`h-5 w-5 items-center justify-center rounded border ${
                responses[field.name] === 'true'
                  ? 'border-primary bg-primary'
                  : 'border-border bg-surface'
              }`}
            >
              {responses[field.name] === 'true' && (
                <Text className="text-xs font-bold text-inverse">{'\u2713'}</Text>
              )}
            </View>
            <Text className="text-sm">{field.label}</Text>
          </Pressable>
        )
      case 'date':
        return (
          <TextInput
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            placeholder={field.placeholder ?? 'YYYY-MM-DD'}
            value={responses[field.name] ?? ''}
            onChangeText={(v) => setValue(field.name, v)}
            keyboardType="numbers-and-punctuation"
          />
        )
      case 'signature':
        return (
          <TextInput
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm italic"
            placeholder={field.placeholder ?? t('forms.typeSignature')}
            value={responses[field.name] ?? ''}
            onChangeText={(v) => setValue(field.name, v)}
          />
        )
      case 'text':
      default:
        return (
          <TextInput
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            placeholder={field.placeholder}
            value={responses[field.name] ?? ''}
            onChangeText={(v) => setValue(field.name, v)}
          />
        )
    }
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
      <Text className="text-2xl font-bold">{form.title}</Text>
      {form.description ? (
        <Text className="mt-2 text-sm text-muted">{form.description}</Text>
      ) : null}
      {form.dueDate ? (
        <Text className="mt-1 text-xs text-muted">
          {t('forms.dueBy')}{' '}
          {new Intl.DateTimeFormat(locale, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }).format(new Date(form.dueDate))}
        </Text>
      ) : null}

      <View className="mt-6">
        {form.fields.map((field) => (
          <View key={field.name} className="mb-5">
            {field.type !== 'checkbox' && (
              <Text className="mb-1 text-sm font-medium">
                {field.label}
                {field.required && <Text className="text-red-500"> *</Text>}
              </Text>
            )}
            {renderField(field)}
          </View>
        ))}
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={submitting}
        className="mt-4 items-center rounded-lg bg-primary px-4 py-3 active:opacity-80"
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-inverse">{t('forms.submit')}</Text>
        )}
      </Pressable>
    </ScrollView>
  )
}
