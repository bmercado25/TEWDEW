require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_gng';

// DATABASE MODELS
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const TodoSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    status: { type: String, enum: ['pending', 'done', 'faded', 'cleared'], default: 'pending' },
    order: { type: Number, default: 0 }
});

const User = mongoose.model('User', UserSchema);
const Todo = mongoose.model('Todo', TodoSchema);

// DATABASE CONNECTION (cached for serverless)
let cachedDb = null;

async function connectDB() {
    if (cachedDb) return cachedDb;
    
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI is not defined!');
        return null;
    }
    
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        cachedDb = mongoose.connection;
        console.log('Connected to MongoDB gng');
        return cachedDb;
    } catch (err) {
        console.error('MongoDB connection error:', err);
        return null;
    }
}

connectDB();

// Ensure DB is connected before API calls
app.use('/api', async (req, res, next) => {
    await connectDB();
    next();
});

// AUTH ROUTES
app.post('/api/auth', async (req, res) => {
    const { action, username, password } = req.body;
    try {
        if (action === 'register') {
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = new User({ username, password: hashedPassword });
            await user.save();
            const token = jwt.sign({ userId: user._id }, JWT_SECRET);
            res.status(201).json({ token, username });
        } else {
            const user = await User.findOne({ username });
            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.status(400).json({ error: 'Invalid credentials' });
            }
            const token = jwt.sign({ userId: user._id }, JWT_SECRET);
            res.json({ token, username });
        }
    } catch (err) {
        res.status(500).json({ error: 'Auth failed' });
    }
});

// TODO ROUTES
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

app.get('/api/todos', authenticate, async (req, res) => {
    const todos = await Todo.find({ userId: req.userId, status: { $ne: 'cleared' } }).sort({ order: 1 });
    res.json(todos);
});

app.post('/api/todos', authenticate, async (req, res) => {
    const lastTodo = await Todo.findOne({ userId: req.userId }).sort({ order: -1 });
    const order = lastTodo ? lastTodo.order + 1 : 0;
    const todo = new Todo({ userId: req.userId, title: req.body.title, order });
    await todo.save();
    res.status(201).json(todo);
});

app.patch('/api/todos', authenticate, async (req, res) => {
    const { id, status, title } = req.body;
    const update = {};
    if (status !== undefined) update.status = status;
    if (title !== undefined) update.title = title;
    const todo = await Todo.findOneAndUpdate(
        { _id: id, userId: req.userId },
        update,
        { new: true }
    );
    res.json(todo);
});

app.patch('/api/todos/reorder', authenticate, async (req, res) => {
    const { ids } = req.body;
    try {
        const updates = ids.map((id, index) => 
            Todo.findOneAndUpdate({ _id: id, userId: req.userId }, { order: index })
        );
        await Promise.all(updates);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Reorder failed' });
    }
});

app.delete('/api/todos', authenticate, async (req, res) => {
    if (req.body.clearAll) {
        await Todo.updateMany({ userId: req.userId }, { status: 'cleared' });
    } else {
        await Todo.findOneAndUpdate({ _id: req.body.id, userId: req.userId }, { status: 'cleared' });
    }
    res.json({ success: true });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server (for local dev)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

module.exports = app;
