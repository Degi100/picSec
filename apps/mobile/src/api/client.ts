/**
 * API Client
 *
 * HTTP Client fuer die PicSec API.
 * Automatisches Token Handling und Refresh.
 */

import Constants from 'expo-constants';

import { getAccessToken, getRefreshToken, useAuthStore } from '@/stores/authStore';

// ============================================================================
// Config (aus Environment Variables)
// ============================================================================

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl
  || process.env.EXPO_PUBLIC_API_URL
  || (__DEV__ ? 'http://192.168.1.100:3000/api/v1' : 'https://api.picsec.de/api/v1');

// ============================================================================
// Types
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

// ============================================================================
// Base Fetch
// ============================================================================

class ApiError extends Error {
  code: string;
  details?: Record<string, string>;

  constructor(message: string, code: string, details?: Record<string, string>) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

const request = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options;

  // Headers vorbereiten
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Auth Header hinzufuegen
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  // Request ausfuehren
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data: ApiResponse<T> = await response.json();

  // Token abgelaufen - Refresh versuchen
  if (response.status === 401 && data.error?.code === 'TOKEN_EXPIRED' && !skipAuth) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      // Request wiederholen mit neuem Token
      return request<T>(endpoint, options);
    }
  }

  // Fehler werfen
  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error?.message ?? 'Ein Fehler ist aufgetreten',
      data.error?.code ?? 'UNKNOWN_ERROR',
      data.error?.details
    );
  }

  return data;
};

// ============================================================================
// Token Refresh
// ============================================================================

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

const refreshTokens = async (): Promise<boolean> => {
  // Bereits am Refreshen
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      await useAuthStore.getState().logout();
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await useAuthStore.getState().updateTokens(data.data.tokens);
        return true;
      }

      // Refresh fehlgeschlagen - Logout
      await useAuthStore.getState().logout();
      return false;
    } catch {
      await useAuthStore.getState().logout();
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// ============================================================================
// API Endpoints
// ============================================================================

export const api = {
  // Auth
  auth: {
    register: (data: {
      email: string;
      password: string;
      displayName: string;
      publicKey: string;
      inviteCode?: string;
    }) => request<{
      user: {
        id: string;
        email: string;
        displayName: string;
        publicKey: string;
        appRole: string;
      };
      tokens: {
        accessToken: string;
        refreshToken: string;
      };
    }>('/auth/register', { method: 'POST', body: data, skipAuth: true }),

    login: (data: { email: string; password: string }) =>
      request<{
        user: {
          id: string;
          email: string;
          displayName: string;
          publicKey: string;
          appRole: string;
        };
        tokens: {
          accessToken: string;
          refreshToken: string;
        };
      }>('/auth/login', { method: 'POST', body: data, skipAuth: true }),

    validateInviteCode: (code: string) =>
      request<{ valid: boolean; reason?: string; description?: string }>(
        '/auth/validate-invite-code',
        { method: 'POST', body: { code }, skipAuth: true }
      ),

    logout: (refreshToken: string) =>
      request<{ message: string }>('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
      }),

    google: (data: { idToken: string; publicKey: string }) =>
      request<{
        user: {
          id: string;
          email: string;
          displayName: string;
          publicKey: string;
          appRole: string;
        };
        tokens: {
          accessToken: string;
          refreshToken: string;
        };
      }>('/auth/google', { method: 'POST', body: data, skipAuth: true }),
  },

  // Galleries
  galleries: {
    list: () =>
      request<{
        galleries: Array<{
          id: string;
          name: string;
          description: string | null;
          imageCount: number;
          memberCount: number;
          myRole: string;
          ownerId: string;
          createdAt: string;
        }>;
      }>('/galleries'),

    get: (id: string) =>
      request<{
        gallery: {
          id: string;
          name: string;
          description: string | null;
          isPublic: boolean;
          ownerId: string;
          imageCount: number;
          myRole: string | null;
          encryptedGalleryKey: string | null;
          members: Array<{
            userId: string;
            role: string;
            user: {
              id: string;
              displayName: string;
              publicKey: string;
            } | null;
          }>;
          createdAt: string;
        };
      }>(`/galleries/${id}`),

    create: (data: {
      name: string;
      description?: string;
      isPublic?: boolean;
      encryptedGalleryKey: string;
    }) =>
      request<{
        gallery: {
          id: string;
          name: string;
          myRole: string;
        };
      }>('/galleries', { method: 'POST', body: data }),
  },

  // Images
  images: {
    list: (galleryId: string, cursor?: string) =>
      request<{
        images: Array<{
          id: string;
          thumbnailPath: string;
          thumbnailSizeBytes: number;
          width: number;
          height: number;
          createdAt: string;
        }>;
        nextCursor: string | null;
        hasMore: boolean;
      }>(`/galleries/${galleryId}/images${cursor ? `?cursor=${cursor}` : ''}`),

    get: (id: string) =>
      request<{
        image: {
          id: string;
          galleryId: string;
          mimeType: string;
          variants: Array<{
            variant: string;
            storagePath: string;
            sizeBytes: number;
            width: number;
            height: number;
          }>;
          commentCount: number;
          createdAt: string;
        };
      }>(`/images/${id}`),
  },

  // Comments
  comments: {
    list: (imageId: string, cursor?: string, parentId?: string) =>
      request<{
        comments: Array<{
          id: string;
          encryptedContent: string;
          parentId: string | null;
          replyCount: number;
          isOwn: boolean;
          author: {
            id: string;
            displayName: string;
            publicKey: string;
          } | null;
          createdAt: string;
        }>;
        nextCursor: string | null;
        hasMore: boolean;
      }>(
        `/images/${imageId}/comments${cursor ? `?cursor=${cursor}` : ''}${
          parentId ? `&parentId=${parentId}` : ''
        }`
      ),

    create: (imageId: string, encryptedContent: string, parentId?: string) =>
      request<{
        comment: {
          id: string;
          imageId: string;
          parentId: string | null;
          createdAt: string;
        };
      }>(`/images/${imageId}/comments`, {
        method: 'POST',
        body: { encryptedContent, parentId },
      }),
  },

  // Invites
  invites: {
    // User per Email zur Galerie einladen
    inviteByEmail: (galleryId: string, email: string, role: 'photoshoter' | 'viewer') =>
      request<{
        invite: {
          id: string;
          galleryId: string;
          targetUser: {
            id: string;
            displayName: string;
            email: string;
          };
          role: string;
          expiresAt: string;
          createdAt: string;
        };
      }>(`/galleries/${galleryId}/invite-by-email`, {
        method: 'POST',
        body: { email, role },
      }),

    // Eigene offene Einladungen abrufen
    pending: () =>
      request<{
        invites: Array<{
          id: string;
          gallery: {
            id: string;
            name: string;
            description: string | null;
          } | null;
          inviter: {
            id: string;
            displayName: string;
          } | null;
          role: string;
          expiresAt: string;
          createdAt: string;
        }>;
      }>('/invites/pending'),

    // Einladung annehmen
    accept: (inviteId: string, encryptedGalleryKey: string) =>
      request<{
        message: string;
        gallery: {
          id: string;
          name: string;
          myRole: string;
        };
      }>(`/invites/${inviteId}/accept`, {
        method: 'POST',
        body: { encryptedGalleryKey },
      }),

    // Einladung ablehnen
    decline: (inviteId: string) =>
      request<{
        message: string;
      }>(`/invites/${inviteId}/decline`, {
        method: 'POST',
      }),
  },
};
