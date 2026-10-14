import type { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * La Ruta RD — app de clientes. Mismo backend y mismo proyecto Firebase
 * (`la-ruta-rd`) que la app de conductores: la API envia los push con
 * firebase-admin de ese proyecto.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,

  name: 'La Ruta RD',
  slug: 'rutard-cliente',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  // El tema lo elige el cliente en Perfil; «Automatico» sigue al sistema.
  userInterfaceStyle: 'automatic',
  scheme: 'rutardcliente',

  ios: {
    supportsTablet: false,
    bundleIdentifier: 'do.com.flypack.rutardcliente',
    // `google-services.json` y el .plist estan en .gitignore, asi que EAS
    // Build no los recibe del repo: llegan como variable de tipo archivo.
    googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? './GoogleService-Info.plist',
    entitlements: {
      'aps-environment': process.env.IOS_APS_ENVIRONMENT === 'production' ? 'production' : 'development',
    },
    config: {
      usesNonExemptEncryption: false,
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY,
    },
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
      NSLocationWhenInUseUsageDescription:
        'Usamos tu ubicación para proponerte el punto de recogida de tus envíos.',
    },
  },

  android: {
    package: 'do.com.flypack.rutardcliente',
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      backgroundColor: '#E6EEFE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'POST_NOTIFICATIONS'],
    blockedPermissions: ['android.permission.RECORD_AUDIO'],
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY,
      },
    },
  },

  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },

  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#2563EB',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-secure-store',
    '@react-native-firebase/app',
    '@react-native-firebase/messaging',
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'static',
          forceStaticLinking: ['RNFBApp', 'RNFBMessaging'],
        },
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Permite que La Ruta RD use tu ubicación para proponer el punto de recogida.',
        isAndroidBackgroundLocationEnabled: false,
        isIosBackgroundLocationEnabled: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Permite elegir una foto de perfil desde tu galería.',
        cameraPermission: 'Permite tomar una foto de perfil.',
        microphonePermission: false,
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL,
    EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY,
    EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY,
    // `npx eas-cli@latest init` agrega aqui `eas: { projectId }`.
  },
});
