export async function onRequest() {
  return new Response(JSON.stringify({ message: 'API endpoint not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}