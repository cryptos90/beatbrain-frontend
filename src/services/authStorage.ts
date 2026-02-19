import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const HOST_JWT_STORAGE_KEY = "beatbrain_host_jwt";

type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

let asyncStorageModule: AsyncStorageLike | null | undefined;

function resolveAsyncStorage(): AsyncStorageLike | null {
  if (asyncStorageModule !== undefined) {
    return asyncStorageModule ?? null;
  }

  try {
    const required = require("@react-native-async-storage/async-storage");
    asyncStorageModule = (required?.default ?? required) as AsyncStorageLike;
  } catch {
    asyncStorageModule = null;
  }
  return asyncStorageModule;
}

export async function getStoredHostJwt(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return window.localStorage.getItem(HOST_JWT_STORAGE_KEY);
    }

    const secure = await SecureStore.getItemAsync(HOST_JWT_STORAGE_KEY);
    if (secure) {
      return secure;
    }

    const asyncStorage = resolveAsyncStorage();
    if (asyncStorage) {
      return await asyncStorage.getItem(HOST_JWT_STORAGE_KEY);
    }
  } catch {
    return null;
  }
  return null;
}

export async function setStoredHostJwt(jwt: string | null): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (jwt) {
        window.localStorage.setItem(HOST_JWT_STORAGE_KEY, jwt);
      } else {
        window.localStorage.removeItem(HOST_JWT_STORAGE_KEY);
      }
      return;
    }

    if (jwt) {
      await SecureStore.setItemAsync(HOST_JWT_STORAGE_KEY, jwt);
    } else {
      await SecureStore.deleteItemAsync(HOST_JWT_STORAGE_KEY);
    }

    const asyncStorage = resolveAsyncStorage();
    if (asyncStorage) {
      if (jwt) {
        await asyncStorage.setItem(HOST_JWT_STORAGE_KEY, jwt);
      } else {
        await asyncStorage.removeItem(HOST_JWT_STORAGE_KEY);
      }
    }
  } catch {
    // Intentionally ignore storage errors to keep runtime flow alive.
  }
}
