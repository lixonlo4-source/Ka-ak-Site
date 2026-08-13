import { verifyToken, getUserById, validateFileExtension, generateR2Key } from '../../_utils/auth.js';

async function authenticate(request, env) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  
  const payload = await verifyToken(env.JWT_SECRET, token);
  if (!payload || !payload.userId) return null;
  
  const user = await getUserById(env.DB, payload.userId);
  if (!user) return null;
  
  return { id: user.id, username: user.username, role: user.role };
}

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const apps = await env.DB.prepare(`
      SELECT a.id, a.title, a.description, a.original_filename as file_name, a.download_count, a.created_at,
             u.username as uploader_name, u.id as uploader_id
      FROM apps a
      JOIN users u ON a.uploader_id = u.id
      ORDER BY a.created_at DESC
    `).all();

    return new Response(JSON.stringify(apps.results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching apps:', error);
    return new Response(JSON.stringify({ message: 'Failed to fetch applications' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const user = await authenticate(request, env);
  if (!user || user.role !== 'admin') {
    return new Response(JSON.stringify({ message: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await request.formData();
    const title = formData.get('title');
    const description = formData.get('description') || '';
    const file = formData.get('file');

    if (!title || title.trim() === '') {
      return new Response(JSON.stringify({ message: 'Title is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!file) {
      return new Response(JSON.stringify({ message: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!validateFileExtension(file.name)) {
      return new Response(JSON.stringify({ message: 'Invalid file type. Allowed: .exe, .zip, .rar, .apk, .msi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (file.size > 500 * 1024 * 1024) {
      return new Response(JSON.stringify({ message: 'File size exceeds 500MB limit' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const r2Key = generateR2Key(file.name);
    await env.FILES.put(r2Key, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
      customMetadata: {
        originalName: file.name,
        uploadedBy: user.username,
      },
    });

    const result = await env.DB.prepare(`
      INSERT INTO apps (title, description, r2_key, original_filename, uploader_id)
      VALUES (?, ?, ?, ?, ?)
    `).bind(title, description, r2Key, file.name, user.id).run();

    const appId = result.meta.last_row_id;

    return new Response(JSON.stringify({
      message: 'Application uploaded successfully',
      app: {
        id: appId,
        title,
        description,
        file_name: file.name,
        download_count: 0,
        created_at: new Date().toISOString()
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error uploading app:', error);
    return new Response(JSON.stringify({ message: 'Upload failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}