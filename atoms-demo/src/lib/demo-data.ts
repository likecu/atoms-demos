export const DEMO_SCRIPT = [
    {
        role: "user",
        content: "帮我生成一个极简风格的 Todo List 应用，需要有添加、删除和完成状态切换功能。颜色用优雅的紫色调。"
    },
    {
        role: "assistant",
        content: "好的！我这就为您创建一个极简风格的紫调 Todo List 应用程序。\n\n我将调用我们的多模型协作团队来完成这个需求..."
    }
];

export const DEMO_CODE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>极简 Todo</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#8b5cf6',
                        primaryHover: '#7c3aed',
                        bgLight: '#f3f4f6',
                        surface: '#ffffff'
                    }
                }
            }
        }
    </script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        .todo-item { transition: all 0.3s ease; }
        .todo-item.completed span { text-decoration: line-through; color: #9ca3af; }
    </style>
</head>
<body class="bg-gray-50 min-h-screen py-10 px-4 sm:px-6 lg:px-8 flex justify-center items-start">
    <div class="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-[fadeIn_0.5s_ease-out]">
        <!-- Header -->
        <div class="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-8 text-white relative overflow-hidden">
            <div class="relative z-10">
                <h1 class="text-3xl font-bold tracking-tight mb-2">我的待办</h1>
                <p class="text-purple-100 opacity-90" id="date-display">Today</p>
            </div>
            <div class="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl"></div>
        </div>

        <!-- Content -->
        <div class="p-6">
            <!-- Add Todo -->
            <form id="add-form" class="relative mb-6">
                <input type="text" id="todo-input" 
                       class="w-full pl-5 pr-14 py-4 bg-gray-50 border-transparent rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all shadow-sm outline-none text-gray-700 placeholder-gray-400" 
                       placeholder="接下来做什么..." required>
                <button type="submit" 
                        class="absolute right-2 top-2 bottom-2 w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex justify-center items-center transition-colors shadow-md">
                    <i class="fas fa-plus"></i>
                </button>
            </form>

            <!-- Todo List -->
            <ul id="todo-list" class="space-y-3">
                <!-- Items will be generated here -->
            </ul>
            
            <!-- Empty State -->
            <div id="empty-state" class="hidden text-center py-10">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-50 text-purple-300 mb-4">
                    <i class="fas fa-check-circle text-2xl"></i>
                </div>
                <p class="text-gray-500 font-medium">一切都完成了！</p>
                <p class="text-gray-400 text-sm mt-1">放松一下吧</p>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            // Set Date
            const options = { weekday: 'long', month: 'long', day: 'numeric' };
            document.getElementById('date-display').textContent = new Date().toLocaleDateString('zh-CN', options);

            const form = document.getElementById('add-form');
            const input = document.getElementById('todo-input');
            const list = document.getElementById('todo-list');
            const emptyState = document.getElementById('empty-state');

            // Initial demo data
            let todos = [
                { id: 1, text: '尝试 Atoms Demo', completed: true },
                { id: 2, text: '规划下一代 AI 产品架构', completed: false },
                { id: 3, text: '喝杯卡布奇诺 ☕️', completed: false }
            ];

            function render() {
                if (todos.length === 0) {
                    list.innerHTML = '';
                    emptyState.classList.remove('hidden');
                    return;
                }
                
                emptyState.classList.add('hidden');
                list.innerHTML = todos.map(todo => \`
                    <li class="todo-item group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md hover:border-purple-100 transition-all cursor-pointer \${todo.completed ? 'completed bg-gray-50' : ''}" data-id="\${todo.id}">
                        <div class="flex items-center gap-3 overflow-hidden flex-1" onclick="toggleTodo(\${todo.id})">
                            <div class="w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors \${todo.completed ? 'bg-purple-500 border-purple-500' : 'border-gray-300 group-hover:border-purple-400'}">
                                \${todo.completed ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
                            </div>
                            <span class="truncate font-medium \${todo.completed ? 'text-gray-400' : 'text-gray-700'}">\${todo.text}</span>
                        </div>
                        <button onclick="deleteTodo(\${todo.id})" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-2 rounded-lg hover:bg-red-50 focus:outline-none">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </li>
                \`).join('');
            }

            window.toggleTodo = (id) => {
                todos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
                render();
            };

            window.deleteTodo = (id) => {
                todos = todos.filter(t => t.id !== id);
                render();
            };

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const text = input.value.trim();
                if (text) {
                    todos.unshift({ id: Date.now(), text, completed: false });
                    input.value = '';
                    render();
                }
            });

            render();
        });
    </script>
</body>
</html>`;
