export const TEST_API_KEY = '0f047ab2a85506283762e82d7d99329bb0a8ec7b3dc8a6d990b67e1e17805f89';

export function getAuthHeader(): { Authorization: string } {
  return {
    Authorization: `Bearer ${TEST_API_KEY}`,
  };
}
