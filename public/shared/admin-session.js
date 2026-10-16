export const ADMIN_STORAGE_KEY = 'copart_admin_auth';
const LEGACY_STORAGE_KEY = 'agro_admin_auth';

export function createAdminSession({storage, fetchImpl, onExpired = () => {}}) {
  let refreshPromise;
  const clearAuth = () => {
    storage.removeItem(ADMIN_STORAGE_KEY);
    storage.removeItem(LEGACY_STORAGE_KEY);
  };
  const setAuth = payload => {
    storage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(payload));
    storage.removeItem(LEGACY_STORAGE_KEY);
  };
  const getAuth = () => {
    try {
      const payload = JSON.parse(storage.getItem(ADMIN_STORAGE_KEY) || storage.getItem(LEGACY_STORAGE_KEY) || 'null');
      if (payload) setAuth(payload);
      return payload;
    } catch { clearAuth(); return null; }
  };
  const refresh = () => {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        const auth = getAuth();
        if (!auth?.refreshToken) return false;
        const response = await fetchImpl('/api/auth/refresh', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({refreshToken: auth.refreshToken})
        });
        if (!response.ok) return false;
        const payload = await response.json();
        if (!payload.accessToken || !payload.refreshToken) return false;
        // A logout during the request must not restore the previous session.
        if (getAuth()?.refreshToken !== auth.refreshToken) return false;
        setAuth(payload);
        return true;
      })().finally(() => { refreshPromise = undefined; });
    }
    return refreshPromise;
  };
  const request = async (url, options = {}) => {
    const send = () => {
      const headers = {'Content-Type': 'application/json', ...options.headers};
      const auth = getAuth();
      if (auth?.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
      return fetchImpl(url, {...options, headers});
    };
    let response = await send();
    if (response.status === 401) {
      if (await refresh()) response = await send();
      if (response.status === 401) {
        clearAuth(); onExpired();
        throw new Error('Sua sessão COPART expirou. Entre novamente.');
      }
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Erro ao processar a solicitação.');
    return data;
  };
  const logout = async () => {
    const token = getAuth()?.refreshToken;
    clearAuth();
    if (token) await fetchImpl('/api/auth/logout', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({refreshToken: token})
    });
  };
  return {getAuth, setAuth, clearAuth, request, logout};
}
