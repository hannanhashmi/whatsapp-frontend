// auth.js - Authentication utilities

// Check if user is logged in
function isLoggedIn() {
    const user = localStorage.getItem('whatsapp_user');
    return user !== null;
}

// Get current user
function getCurrentUser() {
    const user = localStorage.getItem('whatsapp_user');
    return user ? JSON.parse(user) : null;
}

// Check user role
function getUserRole() {
    const user = getCurrentUser();
    return user ? user.role : null;
}

// Check permissions
function hasPermission(requiredPermission) {
    const user = getCurrentUser();
    if (!user) return false;
    
    if (user.role === 'admin') return true;
    
    return user.permissions?.includes(requiredPermission) || false;
}

// Logout
function logout() {
    localStorage.removeItem('whatsapp_user');
    window.location.href = 'login.html';
}

// Protect route - call this on dashboard pages
function protectRoute() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Add user info to header
function addUserInfoToHeader() {
    const user = getCurrentUser();
    if (!user) return;
    
    const header = document.querySelector('.header');
    if (!header) return;
    
    // Remove existing user badge if any
    const existingBadge = header.querySelector('.user-badge');
    if (existingBadge) existingBadge.remove();
    
    // Create user badge
    const userBadge = document.createElement('div');
    userBadge.className = 'user-badge';
    userBadge.innerHTML = `
        <i class="fas fa-user"></i> 
        ${user.name}
        <button id="logoutBtn" style="
            margin-left: 10px; 
            background: none; 
            border: none; 
            color: #ff6b6b; 
            cursor: pointer;
            font-size: 12px;
        ">
            <i class="fas fa-sign-out-alt"></i> Logout
        </button>
    `;
    
    // Add to header
    const headerActions = header.querySelector('.header-actions');
    if (headerActions) {
        headerActions.appendChild(userBadge);
    } else {
        header.appendChild(userBadge);
    }
    
    // Add logout event
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.stopPropagation();
        if (confirm('Are you sure you want to logout?')) {
            logout();
        }
    });
}

// Apply role-based restrictions
function applyRoleRestrictions() {
    const user = getCurrentUser();
    if (!user) return;
    
    if (user.role === 'executive') {
        // Hide admin/manager only features
        document.querySelectorAll('.admin-only, .manager-only').forEach(el => {
            el.style.display = 'none';
        });
    } else if (user.role === 'manager') {
        // Hide admin only features
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
        });
    }
}
