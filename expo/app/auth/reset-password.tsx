import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { lightHaptic } from '@/utils/feedback';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validatePassword = (pass: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(pass);
    const hasLowerCase = /[a-z]/.test(pass);
    const hasNumbers = /\d/.test(pass);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pass);

    return (
      pass.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChar
    );
  };

  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      setError(t('auth.validation.allFieldsRequired'));
      return;
    }

    if (!validatePassword(password)) {
      setError(t('auth.validation.passwordRequirements'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.validation.passwordsDoNotMatch'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      await lightHaptic();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.backgroundDark }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('auth.resetPassword.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('auth.resetPassword.subtitle')}
          </Text>
        </View>

        {success ? (
          <View style={styles.successContainer}>
            <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
              {t('auth.resetPassword.success')}
            </Text>
            <Text style={[styles.successText, { color: colors.textSecondary }]}>
              {t('auth.resetPassword.successMessage')}
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.accent }]}
              onPress={() => router.replace('/login')}
            >
              <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
                {t('auth.resetPassword.backToLogin')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, { backgroundColor: colors.backgroundMedium }]}>
                <Lock size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder={t('auth.fields.newPassword')}
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, { backgroundColor: colors.backgroundMedium }]}>
                <Lock size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder={t('auth.fields.confirmPassword')}
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color={colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.requirements, { color: colors.textSecondary }]}>
              {t('auth.validation.passwordRequirementsText')}
            </Text>

            {error ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.accent },
                (loading || !password || !confirmPassword) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
                  {t('auth.resetPassword.resetPassword')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    marginTop: 20,
    padding: 8,
    marginLeft: -8,
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  requirements: {
    fontSize: 12,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
});