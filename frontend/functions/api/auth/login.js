import { verifyPassword, createToken, getUserByUsername, createAdminIfNotExists } from '../../_utils/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    await createAdminIfNotExists(env.DB, env.ADMIN_USERNAME, env.ADMIN_PASSWORD);

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return new Response(JSON.stringify({ message: 'Username and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await getUserByUsername(env.DB, username);
    if (!user) {
      return new Response(JSON.stringify({ message: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return new Response(JSON.stringify({ message: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = await createToken(env.JWT_SECRET, { userId: user.id, role: user.role });

    return new Response(JSON.stringify({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, role: user.role }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ message: 'Login failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}