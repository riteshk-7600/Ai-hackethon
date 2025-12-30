import fs from 'fs/promises'
import path from 'path'
import bcrypt from 'bcryptjs'
import { logger } from '../utils/logger.js'

class UserService {
    constructor() {
        this.usersFile = path.resolve(process.cwd(), 'data', 'users.json')
        this.init()
    }

    async init() {
        try {
            const dataDir = path.dirname(this.usersFile)
            await fs.mkdir(dataDir, { recursive: true })

            try {
                await fs.access(this.usersFile)
            } catch {
                await fs.writeFile(this.usersFile, JSON.stringify([], null, 2))
                logger.info('Users storage initialized')
            }
        } catch (err) {
            logger.error('Error initializing UserService:', err)
        }
    }

    async getUsers() {
        try {
            const data = await fs.readFile(this.usersFile, 'utf8')
            return JSON.parse(data)
        } catch (err) {
            return []
        }
    }

    async saveUsers(users) {
        await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2))
    }

    async findByEmail(email) {
        const users = await this.getUsers()
        return users.find(u => u.email.toLowerCase() === email.toLowerCase())
    }

    async findById(id) {
        const users = await this.getUsers()
        return users.find(u => u.id === id)
    }

    async createUser({ name, email, password }) {
        const users = await this.getUsers()

        if (users.find(u => u.email === email)) {
            throw new Error('User already exists')
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const newUser = {
            id: Date.now().toString(),
            name,
            email,
            password: hashedPassword,
            role: 'user',
            verified: false,
            createdAt: new Date().toISOString(),
            sessions: []
        }

        users.push(newUser)
        await this.saveUsers(users)

        const { password: _, ...userWithoutPassword } = newUser
        return userWithoutPassword
    }

    async verifyPassword(user, password) {
        return bcrypt.compare(password, user.password)
    }

    async updateUser(id, updates) {
        const users = await this.getUsers()
        const index = users.findIndex(u => u.id === id)

        if (index === -1) throw new Error('User not found')

        // If email is changing, ensure it's unique
        if (updates.email && updates.email !== users[index].email) {
            if (users.find(u => u.email === updates.email)) {
                throw new Error('Email already in use')
            }
        }

        // If password is changing, hash it
        if (updates.password) {
            updates.password = await bcrypt.hash(updates.password, 10)
        }

        users[index] = { ...users[index], ...updates, updatedAt: new Date().toISOString() }
        await this.saveUsers(users)

        const { password: _, ...userWithoutPassword } = users[index]
        return userWithoutPassword
    }

    async addSession(userId, sessionData) {
        const users = await this.getUsers()
        const index = users.findIndex(u => u.id === userId)
        if (index === -1) return

        users[index].sessions = [
            { id: Date.now().toString(), ...sessionData, lastActive: new Date().toISOString() },
            ...(users[index].sessions || []).slice(0, 4) // Keep last 5 sessions
        ]

        await this.saveUsers(users)
    }
}

export default new UserService()
