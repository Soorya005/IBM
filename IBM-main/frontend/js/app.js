// Wildlife Detection System - Frontend JavaScript
// Author: Wildlife Detection Team
// Version: 1.0.0

class WildlifeDetectionApp {
    constructor() {
        this.API_BASE = 'https://wildguard-7vhc.onrender.com/api/stats';
        this.initializeEventListeners();
        this.initializeFileUpload();
        this.testServerConnection();
    }

    // Initialize all event listeners
    initializeEventListeners() {
        // Registration form
        const registrationForm = document.getElementById('registrationForm');
        if (registrationForm) {
            registrationForm.addEventListener('submit', this.handleRegistration.bind(this));
        }

        // Detection form
        const detectionForm = document.getElementById('detectionForm');
        if (detectionForm) {
            detectionForm.addEventListener('submit', this.handleDetection.bind(this));
        }

        // Input validation
        const pincodeInput = document.getElementById('pincode');
        if (pincodeInput) {
            pincodeInput.addEventListener('input', this.validatePincode.bind(this));
        }

        // Clear results when forms change
        const formInputs = document.querySelectorAll('input');
        formInputs.forEach(input => {
            input.addEventListener('input', this.clearOldResults.bind(this));
        });
    }

    // Initialize file upload functionality
    initializeFileUpload() {
        const fileInput = document.getElementById('imageFile');
        const fileUploadArea = document.getElementById('fileUploadArea');
        const filePreview = document.getElementById('filePreview');

        if (!fileInput || !fileUploadArea) return;

        // Click to upload
        fileUploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // File selection
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files[0]);
        });

        // Drag and drop functionality
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });

        fileUploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
        });

        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (this.validateImageFile(file)) {
                    fileInput.files = files;
                    this.handleFileSelection(file);
                }
            }
        });
    }

    // Handle file selection and preview
    handleFileSelection(file) {
        if (!file) return;

        if (!this.validateImageFile(file)) {
            this.showMessage('detectionResult', 'Please select a valid image file (JPG, PNG, GIF, WebP)', 'error');
            return;
        }

        const fileUploadArea = document.getElementById('fileUploadArea');
        const filePreview = document.getElementById('filePreview');

        // Update upload area
        fileUploadArea.innerHTML = `
            <div class="file-info">
                <i class="fas fa-check-circle"></i>
                <div>
                    <strong>${file.name}</strong><br>
                    <span>${this.formatFileSize(file.size)} • ${file.type}</span>
                </div>
            </div>
        `;

        // Show image preview
        const reader = new FileReader();
        reader.onload = (e) => {
            filePreview.innerHTML = `
                <img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            `;
            filePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    // Validate image file
    validateImageFile(file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.type)) {
            this.showMessage('detectionResult', 'Invalid file type. Please select JPG, PNG, GIF, or WebP image.', 'error');
            return false;
        }

        if (file.size > maxSize) {
            this.showMessage('detectionResult', 'File too large. Please select an image smaller than 5MB.', 'error');
            return false;
        }

        return true;
    }

    // Format file size for display
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Validate pincode input
    validatePincode(e) {
        const pincode = e.target.value;
        const isValid = /^\d{0,6}$/.test(pincode);

        if (!isValid) {
            e.target.value = pincode.replace(/\D/g, '').slice(0, 6);
        }

        // Visual feedback
        if (pincode.length === 6) {
            e.target.style.borderColor = '#28a745';
        } else if (pincode.length > 0) {
            e.target.style.borderColor = '#ffc107';
        } else {
            e.target.style.borderColor = '#e1e5e9';
        }
    }

    // Handle user registration
    async handleRegistration(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name').trim(),
            email: formData.get('email').trim().toLowerCase(),
            pincode: formData.get('pincode').trim()
        };

        // Validation
        if (!this.validateRegistrationData(data)) {
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        this.setButtonLoading(submitBtn, true);

        try {
            console.log('🔄 Registering user:', data.email);

            const response = await fetch(`${this.API_BASE}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showMessage('registrationResult',
                    `✅ Registration successful! Welcome ${data.name}. You will receive wildlife alerts for pincode ${data.pincode}.`,
                    'success'
                );
                e.target.reset();
                console.log('✅ User registered successfully');

                // Auto-fill email in detection form
                const testEmailInput = document.getElementById('testEmail');
                if (testEmailInput) {
                    testEmailInput.value = data.email;
                }
            } else {
                this.showMessage('registrationResult',
                    `❌ Registration failed: ${result.message || 'Unknown error'}`,
                    'error'
                );
                console.error('❌ Registration failed:', result);
            }
        } catch (error) {
            console.error('❌ Registration error:', error);
            this.showMessage('registrationResult',
                '❌ Registration failed. Please check your internet connection and try again.',
                'error'
            );
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    // Handle wildlife detection
    async handleDetection(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const email = formData.get('email').trim().toLowerCase();
        const imageFile = formData.get('image');

        // Validation
        if (!email) {
            this.showMessage('detectionResult', 'Please enter your email address.', 'error');
            return;
        }

        if (!imageFile || imageFile.size === 0) {
            this.showMessage('detectionResult', 'Please select an image file.', 'error');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        this.setButtonLoading(submitBtn, true);
        this.showLoadingOverlay(true);

        try {
            console.log('🔍 Starting wildlife detection for:', email);

            const response = await fetch(`${this.API_BASE}/detect-wildlife`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success) {
                if (result.alert && result.data.detections.length > 0) {
                    // Wildlife detected
                    const detectionList = result.data.detections.map(d =>
                        `<li style="margin: 8px 0;"><strong>${d.class}</strong> (${(d.confidence * 100).toFixed(1)}% confidence)</li>`
                    ).join('');

                    this.showMessage('detectionResult', `
                        <div style="text-align: left;">
                            <strong>🚨 WILDLIFE ALERT!</strong><br><br>
                            <strong>Detected Animals:</strong>
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                ${detectionList}
                            </ul>
                            <strong>📧 Alerts Sent:</strong> ${result.data.alertsSent} users in pincode ${result.data.location}<br>
                            <strong>⏰ Time:</strong> ${new Date(result.data.timestamp).toLocaleString()}<br><br>
                            <em>📱 Check your email for detailed safety instructions!</em>
                        </div>
                    `, 'warning');

                    console.log('🚨 Wildlife detected! Alerts sent to', result.data.alertsSent, 'users');
                } else {
                    // No wildlife detected
                    this.showMessage('detectionResult',
                        '✅ No wildlife detected in the uploaded image. The area appears safe.',
                        'success'
                    );
                    console.log('✅ No wildlife detected');
                }
            } else {
                this.showMessage('detectionResult',
                    `❌ Detection failed: ${result.message || 'Unknown error'}`,
                    'error'
                );
                console.error('❌ Detection failed:', result);
            }
        } catch (error) {
            console.error('❌ Detection error:', error);
            this.showMessage('detectionResult',
                '❌ Detection failed. Please check your internet connection and try again.',
                'error'
            );
        } finally {
            this.setButtonLoading(submitBtn, false);
            this.showLoadingOverlay(false);
        }
    }

    // Validate registration data
    validateRegistrationData(data) {
        if (!data.name || data.name.length < 2) {
            this.showMessage('registrationResult', 'Please enter a valid name (at least 2 characters).', 'error');
            return false;
        }

        if (!this.isValidEmail(data.email)) {
            this.showMessage('registrationResult', 'Please enter a valid email address.', 'error');
            return false;
        }

        if (!/^\d{6}$/.test(data.pincode)) {
            this.showMessage('registrationResult', 'Please enter a valid 6-digit pincode.', 'error');
            return false;
        }

        return true;
    }

    // Email validation
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Show messages to user
    showMessage(elementId, message, type) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.innerHTML = message;
        element.className = `result-message ${type} show`;

        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                element.classList.remove('show');
            }, 5000);
        }

        // Scroll to message
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Set button loading state
    setButtonLoading(button, loading) {
        if (!button) return;

        if (loading) {
            button.disabled = true;
            button.classList.add('btn-loading');
        } else {
            button.disabled = false;
            button.classList.remove('btn-loading');
        }
    }

    // Show/hide loading overlay
    showLoadingOverlay(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (!overlay) return;

        if (show) {
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    }

    // Clear old result messages
    clearOldResults() {
        const resultElements = document.querySelectorAll('.result-message');
        resultElements.forEach(element => {
            if (element.classList.contains('show')) {
                element.classList.remove('show');
            }
        });
    }

    // Test server connection
    async testServerConnection() {
        try {
            const response = await fetch(`${this.API_BASE.replace('/api', '')}/health`);
            if (response.ok) {
                console.log('✅ Server connection successful');
            } else {
                console.warn('⚠️ Server connection issues');
            }
        } catch (error) {
            console.error('❌ Server connection failed:', error);
            // Show connection warning to user
            setTimeout(() => {
                this.showConnectionWarning();
            }, 2000);
        }
    }

    // Show connection warning
    showConnectionWarning() {
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6b6b;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
        `;
        warningDiv.innerHTML = `
            <strong>⚠️ Server Connection Issue</strong><br>
            Please make sure the backend server is running on port 5000.
        `;

        document.body.appendChild(warningDiv);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (warningDiv.parentNode) {
                warningDiv.parentNode.removeChild(warningDiv);
            }
        }, 10000);
    }

    // Utility function to show notifications
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            max-width: 350px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideInRight 0.3s ease;
        `;

        const colors = {
            info: '#3498db',
            success: '#27ae60',
            warning: '#f39c12',
            error: '#e74c3c'
        };

        notification.style.background = colors[type] || colors.info;
        notification.innerHTML = message;

        document.body.appendChild(notification);

        // Auto-remove
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Wildlife Detection System Initialized');
    new WildlifeDetectionApp();
});

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
