document.addEventListener('DOMContentLoaded', function() {
    // ================= CONFIGURATION =================
    // ⚠️ IMPORTANT: Replace with your Render backend URL
    const BACKEND_URL = 'https://whatsapp-api-backend-1cgh.onrender.com';
    // ================================================
    
    // DOM Elements
    const chatList = document.getElementById('chatList');
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const currentChatName = document.getElementById('currentChatName');
    const currentChatStatus = document.getElementById('currentChatStatus');
    const currentChatAvatar = document.getElementById('currentChatAvatar');
    const backButton = document.getElementById('backButton');
    const emptyState = document.getElementById('emptyState');
    const mainChat = document.getElementById('mainChat');
    const searchInput = document.getElementById('searchInput');
    const newChatBtn = document.getElementById('newChatBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const connectionStatus = document.getElementById('connectionStatus');
    
    // State variables
    let currentChat = null;
    let allChats = [];
    let filteredChats = [];
    let socket = null;
    let isConnected = false;
    
    // ================= INITIALIZATION =================
    initializeApp();
    
    async function initializeApp() {
        showToast('Initializing WhatsApp Dashboard...', 'info');
        
        // Test backend connection first
        if (await testBackendConnection()) {
            setupSocketConnection();
            loadChats();
            setupEventListeners();
        } else {
            showToast('Cannot connect to backend server. Please check if backend is running.', 'error');
            connectionStatus.textContent = 'Disconnected';
            connectionStatus.classList.add('disconnected');
        }
    }
    
    // Test backend connection
    async function testBackendConnection() {
        try {
            const response = await fetch(`${BACKEND_URL}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            });
            
            if (response.ok) {
                connectionStatus.textContent = 'Connected';
                connectionStatus.classList.add('connected');
                isConnected = true;
                console.log('✅ Backend connection successful');
                return true;
            }
        } catch (error) {
            console.error('❌ Backend connection failed:', error);
        }
        
        connectionStatus.textContent = 'Disconnected';
        connectionStatus.classList.add('disconnected');
        isConnected = false;
        return false;
    }
    
    // Setup Socket.IO connection
    function setupSocketConnection() {
        try {
            socket = io(BACKEND_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                timeout: 20000
            });
            
            socket.on('connect', () => {
                console.log('🔌 Socket.IO connected');
                connectionStatus.textContent = 'Connected (Live)';
                connectionStatus.classList.add('connected');
                showToast('Connected to real-time messaging', 'success');
            });
            
            socket.on('disconnect', () => {
                console.log('🔌 Socket.IO disconnected');
                connectionStatus.textContent = 'Disconnected';
                connectionStatus.classList.add('disconnected');
            });
            
            socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                connectionStatus.textContent = 'Connection Error';
                connectionStatus.classList.add('disconnected');
            });
            
            // Listen for new messages
            socket.on('new_message', (data) => {
                console.log('📨 New message via socket:', data);
                
                if (currentChat && data.from === currentChat.number) {
                    addMessageToChat(data.message, 'received', new Date(data.timestamp));
                    scrollToBottom();
                }
                
                // Refresh chat list to update last message
                loadChats();
            });
            
            socket.on('message_sent', (data) => {
                if (currentChat && data.to === currentChat.number) {
                    // Update message status if needed
                    console.log('Message sent confirmation:', data);
                }
            });
            
        } catch (error) {
            console.error('Failed to setup Socket.IO:', error);
            showToast('Real-time connection failed, using polling', 'error');
        }
    }
    
    // ================= CHAT FUNCTIONS =================
    async function loadChats() {
        if (!isConnected) {
            if (!await testBackendConnection()) return;
        }
        
        try {
            chatList.innerHTML = `
                <div class="loading-chats">
                    <div class="loading-spinner"></div>
                    <p>Loading conversations...</p>
                </div>
            `;
            
            const response = await fetch(`${BACKEND_URL}/api/chats`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            allChats = await response.json();
            filteredChats = [...allChats];
            
            renderChatList(filteredChats);
            
        } catch (error) {
            console.error('Error loading chats:', error);
            chatList.innerHTML = `
                <div class="empty-chats">
                    <p><i class="fas fa-exclamation-triangle"></i> Failed to load chats</p>
                    <p style="font-size: 12px; color: #8696a0; margin-top: 10px;">
                        Check backend connection and refresh
                    </p>
                </div>
            `;
        }
    }
    
    function renderChatList(chats) {
        chatList.innerHTML = '';
        
        if (chats.length === 0) {
            chatList.innerHTML = `
                <div class="empty-chats">
                    <i class="fas fa-comments" style="font-size: 40px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>No conversations yet</p>
                    <p style="font-size: 12px; color: #8696a0; margin-top: 10px;">
                        Send a WhatsApp message to get started
                    </p>
                </div>
            `;
            return;
        }
        
        // Sort by last message (newest first)
        chats.sort((a, b) => new Date(b.lastMessage) - new Date(a.lastMessage));
        
        chats.forEach(chat => {
            const lastMsg = chat.messages[chat.messages.length - 1];
            const lastMsgText = lastMsg ? 
                (lastMsg.text.length > 30 ? lastMsg.text.substring(0, 30) + '...' : lastMsg.text) : 
                'No messages';
            
            const lastMsgTime = chat.lastMessage ? formatTime(chat.lastMessage) : '';
            
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${currentChat?.number === chat.number ? 'active' : ''}`;
            chatItem.innerHTML = `
                <div class="avatar">
                    ${chat.name.substring(0, 2).toUpperCase()}
                </div>
                <div class="chat-info">
                    <div class="chat-header">
                        <div class="chat-name" title="${chat.name}">${chat.name}</div>
                        <div class="chat-time">${lastMsgTime}</div>
                    </div>
                    <div class="last-message">
                        <span class="last-message-text" title="${lastMsg ? lastMsg.text : ''}">
                            ${lastMsgText}
                        </span>
                        ${chat.unread > 0 ? `<span class="unread-badge">${chat.unread}</span>` : ''}
                    </div>
                </div>
            `;
            
            chatItem.addEventListener('click', () => {
                selectChat(chat);
                if (window.innerWidth <= 768) {
                    document.querySelector('.sidebar').classList.remove('active');
                    document.querySelector('.main-chat').classList.add('active');
                }
            });
            
            chatList.appendChild(chatItem);
        });
    }
    
    async function selectChat(chat) {
        currentChat = chat;
        currentChatName.textContent = chat.name;
        currentChatStatus.textContent = 'Online • WhatsApp';
        currentChatAvatar.textContent = chat.name.substring(0, 2).toUpperCase();
        
        // Update active state in list
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const chatItems = document.querySelectorAll('.chat-item');
        chatItems.forEach(item => {
            if (item.querySelector('.chat-name').textContent === chat.name) {
                item.classList.add('active');
            }
        });
        
        // Show main chat area
        emptyState.style.display = 'none';
        mainChat.style.display = 'flex';
        
        // Enable input
        messageInput.disabled = false;
        messageInput.placeholder = "Type a message";
        
        // Load messages
        await loadChatMessages(chat.number);
    }
    
    async function loadChatMessages(chatNumber) {
        try {
            chatMessages.innerHTML = `
                <div class="loading-chats" style="margin: auto;">
                    <div class="loading-spinner"></div>
                    <p>Loading messages...</p>
                </div>
            `;
            
            const response = await fetch(`${BACKEND_URL}/api/chats/${chatNumber}/messages`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const messages = await response.json();
            
            chatMessages.innerHTML = '';
            
            if (messages.length === 0) {
                chatMessages.innerHTML = `
                    <div style="text-align: center; color: #8696a0; padding: 40px; margin: auto;">
                        <i class="fas fa-comment" style="font-size: 50px; margin-bottom: 15px; opacity: 0.5;"></i>
                        <p>No messages yet</p>
                        <p style="font-size: 14px; margin-top: 10px;">Send your first message!</p>
                    </div>
                `;
                return;
            }
            
            messages.forEach(msg => {
                addMessageToChat(msg.text, msg.type === 'sent' ? 'sent' : 'received', msg.timestamp);
            });
            
            scrollToBottom();
            
        } catch (error) {
            console.error('Error loading messages:', error);
            chatMessages.innerHTML = `
                <div style="text-align: center; color: #8696a0; padding: 40px;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load messages</p>
                </div>
            `;
        }
    }
    
    function addMessageToChat(text, type, timestamp) {
        const messageContainer = document.createElement('div');
        messageContainer.className = `message-container ${type}`;
        
        const time = new Date(timestamp);
        const timeString = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
        
        let statusIcon = 'fas fa-check-double';
        let statusTitle = 'Delivered';
        
        if (type === 'sent') {
            // For sent messages, show sending animation temporarily
            statusIcon = 'fas fa-check';
            statusTitle = 'Sent';
        }
        
        messageContainer.innerHTML = `
            <div class="message-bubble">
                <div class="message-text">${escapeHtml(text)}</div>
                <div class="message-time">
                    ${timeString}
                    ${type === 'sent' ? 
                        `<span class="message-status" title="${statusTitle}">
                            <i class="${statusIcon}"></i>
                        </span>` : ''
                    }
                </div>
            </div>
        `;
        
        chatMessages.appendChild(messageContainer);
        
        // If it's a received message and user is viewing this chat, scroll
        if (type === 'received') {
            setTimeout(() => {
                if (chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 100) {
                    scrollToBottom();
                }
            }, 100);
        }
    }
    
    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text || !currentChat || !isConnected) return;
        
        // Store original text and clear input
        const originalText = text;
        messageInput.value = '';
        sendButton.disabled = true;
        
        // Add to UI immediately with sending status
        const tempId = 'temp_' + Date.now();
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container sent';
        messageContainer.id = tempId;
        messageContainer.innerHTML = `
            <div class="message-bubble">
                <div class="message-text">${escapeHtml(originalText)}</div>
                <div class="message-time">
                    ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    <span class="message-status" title="Sending...">
                        <i class="fas fa-clock"></i>
                    </span>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(messageContainer);
        scrollToBottom();
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: currentChat.number,
                    message: originalText
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Update status to delivered
                const statusIcon = messageContainer.querySelector('.message-status i');
                statusIcon.className = 'fas fa-check-double';
                statusIcon.title = 'Delivered';
                
                // Remove temp ID
                messageContainer.id = result.data?.messages?.[0]?.id || tempId;
                
                showToast('Message sent successfully!', 'success');
                
                // Refresh chats to update last message
                loadChats();
                
            } else {
                // Show error
                messageContainer.querySelector('.message-status i').className = 'fas fa-exclamation-triangle';
                messageContainer.querySelector('.message-status i').title = 'Failed to send';
                messageContainer.querySelector('.message-status i').style.color = '#ff6b6b';
                
                showToast('Failed to send: ' + (result.error?.message || 'Unknown error'), 'error');
                console.error('Send error:', result.error);
            }
            
        } catch (error) {
            console.error('Network error sending message:', error);
            messageContainer.querySelector('.message-status i').className = 'fas fa-exclamation-triangle';
            messageContainer.querySelector('.message-status i').title = 'Network error';
            messageContainer.querySelector('.message-status i').style.color = '#ff6b6b';
            
            showToast('Network error. Please check connection.', 'error');
            
            // Re-enable input with original text
            messageInput.value = originalText;
        }
        
        sendButton.disabled = messageInput.value.trim() === '';
    }
    
    // ================= EVENT LISTENERS =================
    function setupEventListeners() {
        // Send message
        sendButton.addEventListener('click', sendMessage);
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        messageInput.addEventListener('input', () => {
            sendButton.disabled = messageInput.value.trim() === '' || !currentChat;
        });
        
        // Back button for mobile
        backButton.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                document.querySelector('.sidebar').classList.add('active');
                document.querySelector('.main-chat').classList.remove('active');
            }
        });
        
        // Refresh button
        refreshBtn.addEventListener('click', () => {
            loadChats();
            showToast('Refreshing conversations...', 'info');
        });
        
        // Search functionality
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            
            if (!searchTerm) {
                filteredChats = [...allChats];
            } else {
                filteredChats = allChats.filter(chat => 
                    chat.name.toLowerCase().includes(searchTerm) ||
                    chat.messages.some(msg => 
                        msg.text.toLowerCase().includes(searchTerm)
                    )
                );
            }
            
            renderChatList(filteredChats);
        });
        
        // New chat modal
        newChatBtn.addEventListener('click', () => {
            openNewChatModal();
        });
        
        // Responsive handling
        window.addEventListener('resize', handleResponsiveLayout);
        handleResponsiveLayout();
        
        // Auto refresh chats every 30 seconds
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                loadChats();
            }
        }, 30000);
    }
    
    function openNewChatModal() {
        const modal = document.getElementById('newChatModal');
        const numberInput = document.getElementById('newChatNumber');
        const messageInput = document.getElementById('initialMessage');
        const startBtn = document.getElementById('startChatBtn');
        const closeBtns = document.querySelectorAll('.close-modal');
        
        // Reset form
        numberInput.value = '';
        messageInput.value = '';
        
        // Show modal
        modal.style.display = 'block';
        
        // Close buttons
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        });
        
        // Close on outside click
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Start chat
        startBtn.addEventListener('click', async () => {
            const number = numberInput.value.trim();
            const message = messageInput.value.trim();
            
            if (!number) {
                showToast('Please enter a WhatsApp number', 'error');
                return;
            }
            
            // Basic validation
            if (!/^\d{10,15}$/.test(number)) {
                showToast('Enter a valid number (10-15 digits, no + sign)', 'error');
                return;
            }
            
            if (message) {
                try {
                    const response = await fetch(`${BACKEND_URL}/api/send`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            to: number,
                            message: message
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        showToast('Message sent successfully!', 'success');
                        modal.style.display = 'none';
                        
                        // Select the new chat
                        const newChat = {
                            number: number,
                            name: `+${number}`,
                            messages: [{
                                text: message,
                                type: 'sent',
                                timestamp: new Date()
                            }],
                            unread: 0,
                            lastMessage: new Date()
                        };
                        
                        selectChat(newChat);
                        loadChats();
                        
                    } else {
                        showToast('Error: ' + (result.error?.message || 'Unknown error'), 'error');
                    }
                } catch (error) {
                    showToast('Network error: ' + error.message, 'error');
                }
            } else {
                // Just select the chat without sending
                const newChat = {
                    number: number,
                    name: `+${number}`,
                    messages: [],
                    unread: 0,
                    lastMessage: new Date()
                };
                
                selectChat(newChat);
                modal.style.display = 'none';
                showToast('New chat started', 'info');
            }
        }, { once: true }); // Add event listener only once
    }
    
    function handleResponsiveLayout() {
        if (window.innerWidth <= 768) {
            // Mobile view
            if (!currentChat) {
                document.querySelector('.sidebar').classList.add('active');
                document.querySelector('.main-chat').classList.remove('active');
            }
        } else {
            // Desktop view - show both
            document.querySelector('.sidebar').classList.add('active');
            document.querySelector('.main-chat').classList.add('active');
        }
    }
    
    // ================= HELPER FUNCTIONS =================
    function formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d`;
        
        return date.toLocaleDateString();
    }
    
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 4000);
    }
    
    // Add typing indicator (optional)
    function showTypingIndicator(chatNumber) {
        if (currentChat && currentChat.number === chatNumber) {
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'typing-indicator';
            typingIndicator.innerHTML = `
                <div class="typing-text">typing</div>
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            `;
            
            chatMessages.appendChild(typingIndicator);
            scrollToBottom();
            
            setTimeout(() => {
                if (typingIndicator.parentNode) {
                    typingIndicator.remove();
                }
            }, 3000);
        }
    }
});
