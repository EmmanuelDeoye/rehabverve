// settings.js
document.addEventListener('DOMContentLoaded', function() {
    const auth = firebase.auth();
    const database = firebase.database();
    let currentUser = null;

    // DOM Elements
    const cartItemsCard = document.getElementById('cart-items-card');
    const ordersCard = document.getElementById('orders-card');
    const wishlistCard = document.getElementById('wishlist-card');
    const editProfileCard = document.getElementById('edit-profile-card');
    const shareProfileCard = document.getElementById('share-profile-card');
    const professionalRegisterCard = document.getElementById('professional-register-card');
    const changePasswordCard = document.getElementById('change-password-card');
    const logoutCard = document.getElementById('logout-card');

    // Modal Elements
    const ordersModal = document.getElementById('orders-modal');
    const wishlistModal = document.getElementById('wishlist-modal');
    const changePasswordModal = document.getElementById('change-password-modal');
    const logoutModal = document.getElementById('logout-modal');

    // Initialize settings
    function initializeSettings() {
        auth.onAuthStateChanged(user => {
            currentUser = user;
            if (user) {
                loadCounts();
                setupEventListeners();
            } else {
                // Redirect to login if not authenticated
                window.location.href = 'index.html';
            }
        });
    }

    // Load counts for cart, orders, wishlist
    function loadCounts() {
        // Cart count
        const cart = JSON.parse(localStorage.getItem('rehabverve_cart')) || [];
        const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
        document.getElementById('cart-count').textContent = `${cartCount} ${cartCount === 1 ? 'item' : 'items'}`;

        // Orders count
        loadOrdersCount();

        // Wishlist count
        loadWishlistCount();
    }

    // Load orders count
    function loadOrdersCount() {
        if (!currentUser) return;

        const ordersRef = database.ref('orders');
        ordersRef.orderByChild('userId').equalTo(currentUser.uid).once('value')
            .then(snapshot => {
                const orders = snapshot.val() || {};
                const ordersCount = Object.keys(orders).length;
                document.getElementById('orders-count').textContent = `${ordersCount} ${ordersCount === 1 ? 'order' : 'orders'}`;
            })
            .catch(error => {
                console.error('Error loading orders count:', error);
                document.getElementById('orders-count').textContent = '0 orders';
            });
    }

    // Load wishlist count
    function loadWishlistCount() {
        if (!currentUser) return;

        const wishlistRef = database.ref('wishlist/' + currentUser.uid);
        wishlistRef.once('value')
            .then(snapshot => {
                const wishlist = snapshot.val() || {};
                const wishlistCount = Object.keys(wishlist).length;
                document.getElementById('wishlist-count').textContent = `${wishlistCount} ${wishlistCount === 1 ? 'item' : 'items'}`;
            })
            .catch(error => {
                console.error('Error loading wishlist count:', error);
                document.getElementById('wishlist-count').textContent = '0 items';
            });
    }

    // Setup event listeners
    function setupEventListeners() {
        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', hideAllModals);
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                hideAllModals();
            }
        });

        // Card click events
        cartItemsCard.addEventListener('click', showCartModal);
        ordersCard.addEventListener('click', showOrdersModal);
        wishlistCard.addEventListener('click', showWishlistModal);
        editProfileCard.addEventListener('click', editProfile);
        shareProfileCard.addEventListener('click', shareProfile);
        professionalRegisterCard.addEventListener('click', registerProfessional);
        changePasswordCard.addEventListener('click', showChangePasswordModal);
        logoutCard.addEventListener('click', showLogoutModal);
    }

    // Show cart modal - using existing cart modal and functions from cart.js
    function showCartModal() {
        hideAllModals();
        
        // Use the existing cart modal from cart.js
        const existingCartModal = document.getElementById('cart-modal');
        if (existingCartModal) {
            existingCartModal.style.display = 'block';
            
            // Render cart items using the function from cart.js
            if (typeof renderCartItems === 'function') {
                renderCartItems();
            }
        }
    }

    // Show orders modal
    function showOrdersModal() {
        hideAllModals();
        ordersModal.style.display = 'block';
        loadOrders();
    }

    // Load orders
    function loadOrders() {
        if (!currentUser) return;

        const container = document.getElementById('orders-container');
        container.innerHTML = '<div class="empty-state"><i class="bx bx-loader-circle bx-spin"></i><p>Loading orders...</p></div>';

        const ordersRef = database.ref('orders');
        ordersRef.orderByChild('userId').equalTo(currentUser.uid).once('value')
            .then(snapshot => {
                const orders = snapshot.val() || {};

                if (Object.keys(orders).length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class='bx bx-package'></i>
                            <h3>No orders yet</h3>
                            <p>Your order history will appear here</p>
                        </div>
                    `;
                    return;
                }

                let html = '';
                Object.keys(orders).forEach(orderId => {
                    const order = orders[orderId];
                    const orderDate = order.timestamp ? new Date(order.timestamp).toLocaleDateString() : 'Unknown date';
                    const statusClass = `status-${order.status || 'pending'}`;

                    html += `
                        <div class="order-item">
                            <div class="item-details">
                                <h4>Order #${orderId.substring(0, 8)}</h4>
                                <p>Total: ${order.totalAmount || 'N/A'}</p>
                                <div class="item-meta">
                                    <span>Date: ${orderDate}</span>
                                    <span class="order-status ${statusClass}">${(order.status || 'pending').toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                    `;
                });

                container.innerHTML = html;
            })
            .catch(error => {
                console.error('Error loading orders:', error);
                container.innerHTML = `
                    <div class="empty-state">
                        <i class='bx bx-error'></i>
                        <h3>Error loading orders</h3>
                        <p>Please try again later</p>
                    </div>
                `;
            });
    }

    // Show wishlist modal
    function showWishlistModal() {
        hideAllModals();
        wishlistModal.style.display = 'block';
        loadWishlist();
    }

    // Load wishlist
    function loadWishlist() {
        if (!currentUser) return;

        const container = document.getElementById('wishlist-container');
        container.innerHTML = '<div class="empty-state"><i class="bx bx-loader-circle bx-spin"></i><p>Loading wishlist...</p></div>';

        const wishlistRef = database.ref('wishlist/' + currentUser.uid);
        wishlistRef.once('value')
            .then(snapshot => {
                const wishlist = snapshot.val() || {};

                if (Object.keys(wishlist).length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class='bx bx-heart'></i>
                            <h3>Wishlist is empty</h3>
                            <p>Add items to your wishlist to see them here</p>
                        </div>
                    `;
                    return;
                }

                let html = '';
                Object.keys(wishlist).forEach(itemId => {
                    const item = wishlist[itemId];
                    const addedDate = item.addedAt ? new Date(item.addedAt).toLocaleDateString() : 'Unknown date';

                    html += `
                        <div class="wishlist-item">
                            <img src="${item.img || 'assets/img/default-product.jpg'}" alt="${item.title}">
                            <div class="item-details">
                                <h4>${item.title}</h4>
                                <p>${item.price}</p>
                                <div class="item-meta">Added: ${addedDate}</div>
                            </div>
                        </div>
                    `;
                });

                container.innerHTML = html;
            })
            .catch(error => {
                console.error('Error loading wishlist:', error);
                container.innerHTML = `
                    <div class="empty-state">
                        <i class='bx bx-error'></i>
                        <h3>Error loading wishlist</h3>
                        <p>Please try again later</p>
                    </div>
                `;
            });
    }

    // Edit profile function
    function editProfile() {
        window.location.href = `users.html?id=${currentUser.uid}`;
    }

    // Share profile function
    function shareProfile() {
        const profileUrl = `${window.location.origin}/users.html?id=${currentUser.uid}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'My Rehabverve Profile',
                text: 'Check out my profile on Rehabverve',
                url: profileUrl
            }).catch(error => {
                console.log('Error sharing:', error);
                copyToClipboard(profileUrl);
            });
        } else {
            copyToClipboard(profileUrl);
        }
    }

    // Copy to clipboard helper
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Profile link copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            showToast('Failed to copy link');
        });
    }

    // Register professional function
    function registerProfessional() {
        window.location.href = 'registration.html';
    }

    // Show change password modal
    function showChangePasswordModal() {
        hideAllModals();
        changePasswordModal.style.display = 'block';
        
        // Reset form
        document.getElementById('change-password-form').reset();
        document.getElementById('password-error').textContent = '';
        document.getElementById('password-success').style.display = 'none';
    }

    // Change password function
    function changePassword(e) {
        e.preventDefault();

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const errorElement = document.getElementById('password-error');
        const successElement = document.getElementById('password-success');

        // Reset messages
        errorElement.textContent = '';
        successElement.style.display = 'none';

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            errorElement.textContent = 'All fields are required';
            return;
        }

        if (newPassword.length < 6) {
            errorElement.textContent = 'New password must be at least 6 characters';
            return;
        }

        if (newPassword !== confirmPassword) {
            errorElement.textContent = 'New passwords do not match';
            return;
        }

        // Reauthenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
        );

        currentUser.reauthenticateWithCredential(credential)
            .then(() => {
                // Update password
                return currentUser.updatePassword(newPassword);
            })
            .then(() => {
                successElement.textContent = 'Password updated successfully!';
                successElement.style.display = 'block';
                
                // Clear form
                document.getElementById('change-password-form').reset();
                
                // Hide modal after 2 seconds
                setTimeout(() => {
                    hideAllModals();
                }, 2000);
            })
            .catch(error => {
                console.error('Password change error:', error);
                if (error.code === 'auth/wrong-password') {
                    errorElement.textContent = 'Current password is incorrect';
                } else if (error.code === 'auth/weak-password') {
                    errorElement.textContent = 'New password is too weak';
                } else {
                    errorElement.textContent = 'Error changing password. Please try again.';
                }
            });
    }

    // Show logout modal
    function showLogoutModal() {
        hideAllModals();
        logoutModal.style.display = 'block';
    }

    // Logout function
    function logout() {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        }).catch(error => {
            console.error('Logout error:', error);
            showToast('Logout failed. Please try again.');
        });
    }

    // Hide all modals
    function hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // Show toast notification
    function showToast(message) {
        // Remove existing toast if any
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create new toast
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerText = message;
        toast.style.cssText = `
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            background-color: #333; color: white; padding: 12px 24px; border-radius: 25px;
            z-index: 3000; animation: fadeIn 0.5s, fadeOut 0.5s 2.5s forwards;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // Form submission for change password
    document.getElementById('change-password-form').addEventListener('submit', changePassword);
    document.getElementById('confirm-logout').addEventListener('click', logout);
    document.getElementById('cancel-logout').addEventListener('click', hideAllModals);

    // Initialize the settings page
    initializeSettings();
});