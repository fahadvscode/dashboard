'use client'

import { useState, useEffect } from 'react'
import { CheckSquare, Square, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

const STORAGE_KEY = 'propdash-tasks'

type Task = {
  id: string
  text: string
  done: boolean
}

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [input, setInput] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setTasks(JSON.parse(stored))
      }
    } catch {
      setTasks([])
    }
  }, [])

  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
    }
  }, [tasks])

  const addTask = () => {
    const text = input.trim()
    if (!text) return
    setTasks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, done: false }
    ])
    setInput('')
  }

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    )
  }

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="border-t border-gray-200 mt-2 pt-2">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-blue-600" />
          Tasks ({tasks.length})
        </span>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder="Add task..."
              className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
            <button
              onClick={addTask}
              className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              title="Add task"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-2 group text-sm"
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {task.done ? (
                    <CheckSquare className="h-4 w-4 text-green-600" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
                <span
                  className={`flex-1 truncate ${
                    task.done ? 'text-gray-500 line-through' : 'text-gray-800'
                  }`}
                >
                  {task.text}
                </span>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="flex-shrink-0 p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          {tasks.length === 0 && (
            <p className="text-xs text-gray-400 py-1">No tasks yet</p>
          )}
        </div>
      )}
    </div>
  )
}
