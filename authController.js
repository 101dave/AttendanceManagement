'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { findByUsername } = require('../models/userModel');

const loginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200),
  role: z.enum(['student', 'teacher'])
});

async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Enter a valid username, password, and role.' });
    }

    const { username, password, role } = parsed.data;
    const user = await findByUsername(username);

    // Use the same response for unknown usernames and wrong passwords.
    if (!user || user.role !== role || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role, name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h', algorithm: 'HS256' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        section: user.section
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login };
