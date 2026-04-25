// create.js - Registration form handling with animations

class RegistrationForm {
    constructor() {
        this.currentRole = null;
        this.currentStep = 1;
        this.totalSteps = 3;
        this.isSubmitting = false;
        
        this.initializeEventListeners();
        this.initializeFirebase();
    }

    initializeFirebase() {
        // Firebase is already initialized in configuration.js
        console.log("Firebase initialized for registration");
    }

    initializeEventListeners() {
        // Role selection
        document.querySelectorAll('.role-select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const roleCard = e.target.closest('.role-card');
                this.selectRole(roleCard.dataset.role);
            });
        });

        // Back to roles
        document.querySelectorAll('.back-to-roles').forEach(btn => {
            btn.addEventListener('click', () => this.showRoleSelection());
        });

        // Step navigation
        document.querySelectorAll('.next-step').forEach(btn => {
            btn.addEventListener('click', () => this.nextStep());
        });

        document.querySelectorAll('.prev-step').forEach(btn => {
            btn.addEventListener('click', () => this.prevStep());
        });

        // Form submissions
        document.getElementById('practitioner-form').addEventListener('submit', (e) => this.handleSubmit(e, 'practitioner'));
        document.getElementById('center-form').addEventListener('submit', (e) => this.handleSubmit(e, 'center'));
        document.getElementById('supplier-form').addEventListener('submit', (e) => this.handleSubmit(e, 'supplier'));

        // Success modal
        document.getElementById('success-ok-btn').addEventListener('click', () => this.redirectToDashboard());

        // File input validation
        this.initializeFileValidation();
    }

    selectRole(role) {
        this.currentRole = role;
        this.currentStep = 1;
        
        // Hide role selection and show appropriate form
        document.querySelector('.role-selection').style.display = 'none';
        document.getElementById(`${role}-form-section`).style.display = 'block';
        
        // Reset form steps
        this.resetFormSteps(role);
        
        // Animate form appearance
        this.animateFormAppearance();
    }

    showRoleSelection() {
        // Hide all form sections
        document.querySelectorAll('.form-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show role selection
        document.querySelector('.role-selection').style.display = 'grid';
        
        // Animate role cards
        this.animateRoleCards();
    }

    resetFormSteps(role) {
        const form = document.getElementById(`${role}-form`);
        const steps = form.querySelectorAll('.step-content');
        const indicators = form.querySelectorAll('.step-indicator');
        
        steps.forEach(step => step.classList.remove('active'));
        indicators.forEach(indicator => indicator.classList.remove('active'));
        
        // Activate first step
        steps[0].classList.add('active');
        indicators[0].classList.add('active');
        
        // Update total steps based on role
        this.totalSteps = role === 'supplier' ? 2 : 3;
    }

    nextStep() {
        if (this.currentStep < this.totalSteps) {
            if (this.validateCurrentStep()) {
                this.currentStep++;
                this.updateStepDisplay();
                this.animateStepTransition('next');
            }
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
            this.animateStepTransition('prev');
        }
    }

    validateCurrentStep() {
        const form = document.getElementById(`${this.currentRole}-form`);
        const currentStep = form.querySelector(`.step-content[data-step="${this.currentStep}"]`);
        const inputs = currentStep.querySelectorAll('input, select, textarea');
        let isValid = true;

        inputs.forEach(input => {
            const formGroup = input.closest('.form-group');
            if (input.hasAttribute('required') && !input.value.trim()) {
                formGroup.classList.add('error');
                isValid = false;
            } else {
                formGroup.classList.remove('error');
            }

            // Email validation
            if (input.type === 'email' && input.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(input.value)) {
                    formGroup.classList.add('error');
                    isValid = false;
                }
            }

            // Password validation
            if (input.type === 'password' && input.value) {
                if (input.value.length < 6) {
                    formGroup.classList.add('error');
                    isValid = false;
                }
            }
        });

        return isValid;
    }

    updateStepDisplay() {
        const form = document.getElementById(`${this.currentRole}-form`);
        const steps = form.querySelectorAll('.step-content');
        const indicators = form.querySelectorAll('.step-indicator');

        steps.forEach(step => {
            step.classList.remove('active');
            if (parseInt(step.dataset.step) === this.currentStep) {
                step.classList.add('active');
            }
        });

        indicators.forEach(indicator => {
            indicator.classList.remove('active');
            if (parseInt(indicator.dataset.step) === this.currentStep) {
                indicator.classList.add('active');
            }
        });
    }

    animateStepTransition(direction) {
        const form = document.getElementById(`${this.currentRole}-form`);
        const currentStep = form.querySelector(`.step-content[data-step="${this.currentStep}"]`);
        
        currentStep.style.animation = `slideIn${direction === 'next' ? 'Left' : 'Right'} 0.5s ease`;
        
        setTimeout(() => {
            currentStep.style.animation = '';
        }, 500);
    }

    async handleSubmit(e, role) {
        e.preventDefault();
        
        if (this.isSubmitting) return;
        
        if (this.validateCurrentStep()) {
            this.isSubmitting = true;
            this.showLoadingAnimation();
            
            try {
                const formData = this.collectFormData(role);
                await this.submitRegistration(formData, role);
                
                this.hideLoadingAnimation();
                this.showSuccessModal();
                
            } catch (error) {
                this.hideLoadingAnimation();
                this.showError(error.message);
                this.isSubmitting = false;
            }
        }
    }

    collectFormData(role) {
        const formData = {
            role: role,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            status: 'pending'
        };

        const form = document.getElementById(`${role}-form`);
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (input.type !== 'file' && input.type !== 'checkbox') {
                formData[input.id] = input.value;
            } else if (input.type === 'checkbox') {
                formData[input.id] = input.checked;
            }
        });

        return formData;
    }

    async submitRegistration(formData, role) {
        return new Promise(async (resolve, reject) => {
            try {
                // Create user account
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(
                    formData[`${role === 'practitioner' ? 'prof' : role === 'center' ? 'center' : 'contact'}-email`],
                    formData[`${role === 'practitioner' ? 'prof' : role === 'supplier' ? 'supplier' : 'center'}-password`]
                );

                const user = userCredential.user;

                // Upload files if any
                const fileUploads = [];
                const fileInputs = document.querySelectorAll(`#${role}-form input[type="file"]`);
                
                for (const fileInput of fileInputs) {
                    if (fileInput.files[0]) {
                        const fileUrl = await this.uploadFile(fileInput.files[0], user.uid, fileInput.id);
                        formData[fileInput.id + 'Url'] = fileUrl;
                        fileUploads.push(fileUrl);
                    }
                }

                // Prepare user data for database
                const userData = {
                    name: formData[`${role === 'practitioner' ? 'prof' : role === 'center' ? 'center' : 'org'}-name`] || formData['org-name'],
                    email: formData[`${role === 'practitioner' ? 'prof' : role === 'center' ? 'center' : 'contact'}-email`],
                    role: role,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };

                // Save to userdata
                await firebase.database().ref('userdata/' + user.uid).set(userData);

                // Save to specific role collection
                let dbPath;
                switch(role) {
                    case 'practitioner':
                        dbPath = 'applications';
                        formData.userID = user.uid;
                        break;
                    case 'center':
                        dbPath = 'applications';
                        formData.userId = user.uid;
                        break;
                    case 'supplier':
                        dbPath = 'applications';
                        formData.userId = user.uid;
                        break;
                }

                await firebase.database().ref(dbPath + '/' + user.uid).set(formData);

                resolve();
                
            } catch (error) {
                reject(error);
            }
        });
    }

    async uploadFile(file, userId, fieldName) {
        return new Promise((resolve, reject) => {
            const storageRef = firebase.storage().ref();
            const fileRef = storageRef.child(`${userId}/${fieldName}/${file.name}`);
            
            const uploadTask = fileRef.put(file);
            
            uploadTask.on('state_changed',
                (snapshot) => {
                    // Progress tracking
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    this.updateUploadProgress(progress);
                },
                (error) => {
                    reject(error);
                },
                async () => {
                    try {
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        resolve(downloadURL);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    updateUploadProgress(progress) {
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
    }

    showLoadingAnimation() {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.display = 'flex';
        
        // Animate progress bar
        this.animateProgressBar();
    }

    hideLoadingAnimation() {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.display = 'none';
    }

    animateProgressBar() {
        const progressFill = document.querySelector('.progress-fill');
        let progress = 0;
        
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress >= 90) {
                progress = 90; // Hold at 90% until actual completion
                clearInterval(interval);
            }
            progressFill.style.width = `${progress}%`;
        }, 200);
    }

    showSuccessModal() {
        const successModal = document.getElementById('success-modal');
        successModal.style.display = 'block';
        
        // Trigger success animation
        this.triggerSuccessAnimation();
    }

    triggerSuccessAnimation() {
        const checkIcon = document.querySelector('.check-icon');
        checkIcon.style.animation = 'none';
        setTimeout(() => {
            checkIcon.style.animation = '';
        }, 10);
    }

    redirectToDashboard() {
        window.location.href = 'users.html';
    }

    showError(message) {
        // Create error toast
        const errorToast = document.createElement('div');
        errorToast.className = 'error-toast';
        errorToast.innerHTML = `
            <i class='bx bx-error'></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(errorToast);
        
        // Animate in
        setTimeout(() => {
            errorToast.classList.add('show');
        }, 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            errorToast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(errorToast);
            }, 300);
        }, 5000);
    }

    initializeFileValidation() {
        document.querySelectorAll('input[type="file"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.validateFile(file, e.target);
                }
            });
        });
    }

    validateFile(file, input) {
        const formGroup = input.closest('.form-group');
        const maxSize = input.id.includes('license') ? 5 : 2; // MB
        const maxSizeBytes = maxSize * 1024 * 1024;

        if (file.size > maxSizeBytes) {
            formGroup.classList.add('error');
            this.showError(`File size must be less than ${maxSize}MB`);
            input.value = '';
            return false;
        }

        formGroup.classList.remove('error');
        return true;
    }

    animateFormAppearance() {
        const formSection = document.getElementById(`${this.currentRole}-form-section`);
        formSection.style.animation = 'slideInUp 0.5s ease';
    }

    animateRoleCards() {
        const roleCards = document.querySelectorAll('.role-card');
        roleCards.forEach((card, index) => {
            card.style.animation = `slideInUp 0.5s ease ${index * 0.1}s both`;
        });
    }
}

// Custom animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInLeft {
        from {
            opacity: 0;
            transform: translateX(-30px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(30px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    .error-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 10px;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        z-index: 1001;
    }
    
    .error-toast.show {
        transform: translateX(0);
    }
    
    .error-toast i {
        font-size: 1.2rem;
    }
`;
document.head.appendChild(style);

// Initialize the registration form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RegistrationForm();
});
