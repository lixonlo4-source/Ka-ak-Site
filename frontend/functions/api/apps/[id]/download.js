export async function onRequestGet(context) {
  const { env, params } = context;
  const id = params.id;

  try {
    const app = await env.DB.prepare('SELECT * FROM apps WHERE id = ?').bind(id).first();

    if (!app) {
      return new Response(JSON.stringify({ message: 'Application not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const object = await env.FILES.get(app.r2_key);
    if (!object) {
      return new Response(JSON.stringify({ message: 'File not found in storage' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await env.DB.prepare('UPDATE apps SET download_count = download_count + 1 WHERE id = ?').bind(id).run();

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${app.original_filename}"`);
    headers.set('Content-Length', object.size.toString());

    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error downloading app:', error);
    return new Response(JSON.stringify({ message: 'Download failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}