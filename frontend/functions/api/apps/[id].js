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
  const { env, params } = context;
  const id = params.id;

  try {
    const app = await env.DB.prepare(`
      SELECT a.id, a.title, a.description, a.r2_key, a.original_filename as file_name, a.download_count, a.created_at,
             u.username as uploader_name, u.id as uploader_id
      FROM apps a
      JOIN users u ON a.uploader_id = u.id
      WHERE a.id = ?
    `).bind(id).first();

    if (!app) {
      return new Response(JSON.stringify({ message: 'Application not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(app), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching app:', error);
    return new Response(JSON.stringify({ message: 'Failed to fetch application' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const id = params.id;

  const user = await authenticate(request, env);
  if (!user || user.role !== 'admin') {
    return new Response(JSON.stringify({ message: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const app = await env.DB.prepare('SELECT * FROM apps WHERE id = ?').bind(id).first();
    if (!app) {
      return new Response(JSON.stringify({ message: 'Application not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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

    let r2Key = app.r2_key;
    let originalFilename = app.original_filename;

    if (file && file.size > 0) {
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

      try {
        await env.FILES.delete(app.r2_key);
      } catch (e) {
        console.error('Failed to delete old file:', e);
      }

      r2Key = generateR2Key(file.name);
      await env.FILES.put(r2Key, file.stream(), {
        httpMetadata: { contentType: file.type || 'application/octet-stream' },
        customMetadata: { originalName: file.name, uploadedBy: user.username },
      });
      originalFilename = file.name;
    }

    await env.DB.prepare(`
      UPDATE apps SET title = ?, description = ?, r2_key = ?, original_filename = ? WHERE id = ?
    `).bind(title, description, r2Key, originalFilename, id).run();

    return new Response(JSON.stringify({
      message: 'Application updated successfully',
      app: {
        id: parseInt(id),
        title,
        description: description || '',
        file_name: originalFilename,
        download_count: app.download_count,
        created_at: app.created_at
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating app:', error);
    return new Response(JSON.stringify({ message: 'Update failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const id = params.id;

  const user = await authenticate(request, env);
  if (!user || user.role !== 'admin') {
    return new Response(JSON.stringify({ message: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const app = await env.DB.prepare('SELECT * FROM apps WHERE id = ?').bind(id).first();
    if (!app) {
      return new Response(JSON.stringify({ message: 'Application not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      await env.FILES.delete(app.r2_key);
    } catch (e) {
      console.error('Failed to delete file from R2:', e);
    }

    await env.DB.prepare('DELETE FROM apps WHERE id = ?').bind(id).run();

    return new Response(JSON.stringify({ message: 'Application deleted' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting app:', error);
    return new Response(JSON.stringify({ message: 'Delete failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}