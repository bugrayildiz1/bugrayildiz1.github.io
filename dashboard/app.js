// Dashboard state
let messages = [];
let ws = null;
let reconnectInterval = null;
let selectedPhone = null;

// DOM elements
const contactsList = document.getElementById('contactsList');
const messagesContainer = document.getElementById('messagesContainer');
const messageCount = document.getElementById('messageCount');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const clearBtn = document.getElementById('clearBtn');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const selectedContactName = document.getElementById('selectedContactName');
const selectedContactPhone = document.getElementById('selectedContactPhone');
const chatMessageCount = document.getElementById('chatMessageCount');
const totalContacts = document.getElementById('totalContacts');
const incomingCount = document.getElementById('incomingCount');
const todayCount = document.getElementById('todayCount');

// Initialize
init();

function init() {
    connectWebSocket();
    setupEventListeners();
    fetchInitialMessages();
}

// WebSocket connection
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:${window.location.port || 3000}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('WebSocket connected');
        updateStatus('connected', 'Connected');
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    };
    
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'message') {
                addMessage(data.message);
            } else if (data.type === 'messages') {
                messages = data.messages;
                renderUI();
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateStatus('disconnected', 'Error');
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected');
        updateStatus('disconnected', 'Disconnected');
        
        // Attempt to reconnect
        if (!reconnectInterval) {
            reconnectInterval = setInterval(() => {
                console.log('Attempting to reconnect...');
                connectWebSocket();
            }, 5000);
        }
    };
}

// Fetch initial messages from API
async function fetchInitialMessages() {
    try {
        const response = await fetch('/api/messages');
        const data = await response.json();
        messages = data.messages || [];
        console.log('Loaded messages:', messages.length);
        renderUI();
    } catch (error) {
        console.error('Error fetching messages:', error);
    }
}

// Update connection status
function updateStatus(status, text) {
    statusDot.className = `status-dot ${status}`;
    statusText.textContent = text;
}

// Add new message to the list
function addMessage(message) {
    messages.unshift(message);
    renderUI();
}

// Get unique contacts
function getUniqueContacts() {
    const contactMap = new Map();
    
    console.log('Getting contacts from messages:', messages);
    
    messages.forEach(msg => {
        const phoneNumber = msg.meta?.fromNumber;
        console.log('Message:', msg.from, 'Phone:', phoneNumber);
        
        if (phoneNumber && !contactMap.has(phoneNumber)) {
            const contact = {
                phoneNumber: phoneNumber,
                name: msg.from || 'Unknown',
                lastMessage: msg.content,
                lastTime: msg.timestamp,
                messageCount: 0
            };
            contactMap.set(phoneNumber, contact);
        }
    });
    
    // Count messages per contact
    messages.forEach(msg => {
        const phoneNumber = msg.meta?.fromNumber;
        if (phoneNumber && contactMap.has(phoneNumber)) {
            contactMap.get(phoneNumber).messageCount++;
        }
    });
    
    const contactsArray = Array.from(contactMap.values()).sort((a, b) => 
        new Date(b.lastTime) - new Date(a.lastTime)
    );
    
    console.log('Contacts:', contactsArray);
    return contactsArray;
}

// Get messages for a specific contact
function getContactMessages(phoneNumber) {
    return messages.filter(msg => {
        const msgPhone = msg.meta?.fromNumber;
        return msgPhone === phoneNumber;
    });
}

// Render all UI
function renderUI() {
    const searchTerm = searchInput.value.toLowerCase();
    const contacts = getUniqueContacts();
    
    // Filter contacts
    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm) ||
        contact.phoneNumber.includes(searchTerm)
    );
    
    renderContacts(filteredContacts);
    
    if (selectedPhone) {
        renderConversation(selectedPhone);
    } else if (contacts.length > 0) {
        // Auto-select first contact if none selected
        selectContact(contacts[0].phoneNumber);
    }
    
    updateStats(contacts);
}

// Render contacts list
function renderContacts(contacts) {
    if (contacts.length === 0) {
        contactsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #9ca3af;">No contacts yet</div>';
        return;
    }
    
    contactsList.innerHTML = contacts.map(contact => {
        const initials = contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const preview = contact.lastMessage.substring(0, 40) + (contact.lastMessage.length > 40 ? '...' : '');
        const isActive = selectedPhone === contact.phoneNumber ? 'active' : '';
        
        return `
            <div class="contact-item ${isActive}" onclick="selectContact('${contact.phoneNumber}')">
                <div class="contact-avatar">${initials}</div>
                <div class="contact-info">
                    <div class="contact-name">${escapeHtml(contact.name)}</div>
                    <div class="contact-preview">${escapeHtml(preview)}</div>
                </div>
                <div class="contact-time">${formatTime(contact.lastTime)}</div>
            </div>
        `;
    }).join('');
}

// Select a contact
function selectContact(phoneNumber) {
    selectedPhone = phoneNumber;
    renderUI();
}

// Render conversation for selected contact
function renderConversation(phoneNumber) {
    const contactMessages = getContactMessages(phoneNumber).reverse();
    const contact = getUniqueContacts().find(c => c.phoneNumber === phoneNumber);
    
    if (!contact) return;
    
    // Update header
    selectedContactName.textContent = contact.name;
    selectedContactPhone.textContent = `+${phoneNumber}`;
    chatMessageCount.textContent = `${contactMessages.length} messages`;
    
    // Render messages
    if (contactMessages.length === 0) {
        messagesContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💬</div>
                <div class="empty-text">No messages in this conversation</div>
            </div>
        `;
    } else {
        messagesContainer.innerHTML = contactMessages.map(msg => createMessageCard(msg)).join('');
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Create message card HTML
function createMessageCard(message) {
    const date = new Date(message.timestamp);
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const fullDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const type = message.type || 'incoming';
    
    return `
        <div class="message-bubble-container ${type}">
            <div class="message-bubble ${type}">
                <div class="message-text">${escapeHtml(message.content || '')}</div>
                <div class="message-timestamp">
                    <span class="date">${fullDate}</span>
                    <span class="time">${time}</span>
                </div>
            </div>
        </div>
    `;
}

// Update statistics
function updateStats(contacts) {
    messageCount.textContent = messages.length;
    totalContacts.textContent = contacts.length;
    
    const incoming = messages.filter(m => m.type === 'incoming').length;
    incomingCount.textContent = incoming;
    
    // Today
    const today = new Date().setHours(0, 0, 0, 0);
    const todayMessages = messages.filter(m => new Date(m.timestamp).getTime() > today).length;
    todayCount.textContent = todayMessages;
}

// Setup event listeners
function setupEventListeners() {
    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all messages?')) {
            messages = [];
            selectedPhone = null;
            renderUI();
        }
    });
    
    refreshBtn.addEventListener('click', () => {
        fetchInitialMessages();
    });
    
    searchInput.addEventListener('input', () => {
        renderUI();
    });
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format time for contact list
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
