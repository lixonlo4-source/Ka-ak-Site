export async function onRequestGet(context) {
  const { env } = context;

  try {
    await env.DB.prepare('SELECT 1').first();
    
    return new Response(JSON.stringify({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return new Response(JSON.stringify({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}