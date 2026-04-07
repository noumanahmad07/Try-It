import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../firebase';

interface CameraSettings {
  photoQuality: 'low' | 'medium' | 'high';
  autoCapture: boolean;
  flashMode: 'auto' | 'on' | 'off';
  gridLines: boolean;
  soundEnabled: boolean;
  hapticFeedback: boolean;
}

interface UserSettings {
  camera: CameraSettings;
  profile: {
    displayName: string;
    photoURL: string;
  };
}

interface SettingsContextType {
  settings: UserSettings;
  updateCameraSettings: (settings: Partial<CameraSettings>) => void;
  updateProfileSettings: (settings: Partial<UserSettings['profile']>) => void;
  resetSettings: () => void;
}

const defaultSettings: UserSettings = {
  camera: {
    photoQuality: 'high',
    autoCapture: true,
    flashMode: 'auto',
    gridLines: true,
    soundEnabled: true,
    hapticFeedback: true,
  },
  profile: {
    displayName: '',
    photoURL: '',
  },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);

  // Load settings from localStorage and Firebase on mount
  useEffect(() => {
    const loadSettings = () => {
      // Load from localStorage
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
        } catch (error) {
          console.error('Failed to load settings:', error);
        }
      }

      // Load profile from Firebase
      const user = auth.currentUser;
      if (user) {
        setSettings(prev => ({
          ...prev,
          profile: {
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
          },
        }));
      }
    };

    loadSettings();

    // Listen for auth changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setSettings(prev => ({
          ...prev,
          profile: {
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
          },
        }));
      }
    });

    return unsubscribe;
  }, []);

  const updateCameraSettings = (newSettings: Partial<CameraSettings>) => {
    const updatedSettings = {
      ...settings,
      camera: { ...settings.camera, ...newSettings },
    };
    setSettings(updatedSettings);
    localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
  };

  const updateProfileSettings = (newSettings: Partial<UserSettings['profile']>) => {
    const updatedSettings = {
      ...settings,
      profile: { ...settings.profile, ...newSettings },
    };
    setSettings(updatedSettings);
    localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('userSettings');
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateCameraSettings,
        updateProfileSettings,
        resetSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
