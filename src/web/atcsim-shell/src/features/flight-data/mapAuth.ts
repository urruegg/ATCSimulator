export async function fetchMapsToken(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/maps/token`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Maps token request failed: ${res.status}`);
  const data = (await res.json()) as { token: string };
  return data.token;
}
