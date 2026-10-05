// Headless Android starts the JS entry without mounting Expo Router layouts.
// Register tasks before the router so killed-process refresh can execute.
import './src/services/background-refresh';
import { AppRegistry, Platform } from 'react-native';
import 'expo-router/entry';

if (Platform.OS === 'android') {
  // TaskService owns this keep-alive task and finishes it after all Expo tasks.
  // Resolving the SDK's no-op immediately disables RN timers mid-refresh.
  AppRegistry.registerHeadlessTask(
    'expo-task-manager',
    () => () => new Promise(() => {}),
  );
}
