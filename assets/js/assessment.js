// assessment.js - Client/Patient Questionnaire Generator with Clinical Report

// ==================== GLOBAL STATE ====================
let currentQuestionnaireState = {
    id: null,
    timestamp: null,
    userData: {
        name: '',
        age: '',
        gender: 'Male',
        condition: ''
    },
    config: {
        category: 'General',
        questionCount: 15
    },
    generatedForm: '',
    evaluationReport: '',
    formData: {},
    isComplete: false,
    hasEvaluation: false
};

let currentUser = null;
let githubToken = null;
let apiEndpoint = null;
let isGenerating = false;

// ==================== MAIN INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Questionnaire Generator Initializing...');
    
    // Wait a bit to ensure DOM is fully loaded
    setTimeout(() => {
        initializeComponents();
        setupAllEventListeners();
        loadSavedQuestionnaires();
        loadLocalProgress();
        
        // Check for URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const questionnaireId = urlParams.get('questionnaireId');
        if (questionnaireId) {
            loadQuestionnaireFromStorage(questionnaireId);
        }
        
        console.log('Questionnaire Generator Ready');
    }, 100);
});

function initializeComponents() {
    console.log('Initializing components...');
    
    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    
    // Check authentication
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            console.log('User authenticated:', user.email);
        } else {
            currentUser = null;
            console.log('No user authenticated');
        }
    });
    
    // Fetch API tokens
    fetchTokens();
}

async function fetchTokens() {
    try {
        const database = firebase.database();
        const snapshot = await database.ref('tokens/openAI').once('value');
        const data = snapshot.val();
        if (data) {
            githubToken = data.openai_token;
            apiEndpoint = data.github_endpoint;
            console.log('Tokens fetched successfully');
        } else {
            console.warn('No tokens found in database');
        }
    } catch (error) {
        console.error("Credential Error:", error);
    }
}

// ==================== EVENT LISTENERS SETUP ====================
function setupAllEventListeners() {
    console.log('Setting up event listeners...');
    
    // Get DOM elements
    const aiSidebar = document.getElementById('aiSidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const generateBtn = document.getElementById('generateBtn');
    const newQuestionnaireBtn = document.getElementById('newAssessmentBtn');
    const evaluateBtn = document.getElementById('evaluateBtn');
    const saveBtn = document.getElementById('saveBtn');
    const printBtn = document.getElementById('printBtn');
    
    // Debug: Check if elements exist
    console.log('Sidebar Toggle exists:', !!sidebarToggle);
    console.log('Close Drawer exists:', !!closeDrawerBtn);
    console.log('Generate Button exists:', !!generateBtn);
    console.log('New Questionnaire Button exists:', !!newQuestionnaireBtn);
    console.log('Evaluate Button exists:', !!evaluateBtn);
    console.log('Save Button exists:', !!saveBtn);
    console.log('Print Button exists:', !!printBtn);
    
    // Sidebar toggle functionality
    if (sidebarToggle && aiSidebar) {
        sidebarToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            console.log('Sidebar toggle clicked');
            aiSidebar.classList.toggle('active');
            // Update icon
            const icon = this.querySelector('i');
            if (icon) {
                if (aiSidebar.classList.contains('active')) {
                    icon.className = 'fas fa-times';
                } else {
                    icon.className = 'fas fa-history';
                }
            }
        });
    } else {
        console.error('Sidebar toggle or aiSidebar not found');
    }
    
    // Close drawer button
    if (closeDrawerBtn && aiSidebar) {
        closeDrawerBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            console.log('Close drawer clicked');
            aiSidebar.classList.remove('active');
            // Reset sidebar toggle icon
            const sidebarToggleIcon = sidebarToggle?.querySelector('i');
            if (sidebarToggleIcon) {
                sidebarToggleIcon.className = 'fas fa-history';
            }
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        const aiSidebar = document.getElementById('aiSidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        
        if (window.innerWidth <= 992 && 
            aiSidebar && 
            aiSidebar.classList.contains('active') &&
            !aiSidebar.contains(e.target) &&
            e.target !== sidebarToggle &&
            !sidebarToggle.contains(e.target)) {
            
            aiSidebar.classList.remove('active');
            const icon = sidebarToggle.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-history';
            }
        }
    });
    
    // Generate questionnaire button
    if (generateBtn) {
        generateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Generate questionnaire clicked');
            generateQuestionnaire();
        });
    }
    
    // New questionnaire button
    if (newQuestionnaireBtn) {
        newQuestionnaireBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('New questionnaire clicked');
            if (confirm("Clear current form and start new questionnaire?")) {
                createNewQuestionnaire();
            }
        });
    }
    
    // Evaluate button (Clinical Report & Referrals)
    if (evaluateBtn) {
        evaluateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Generate Clinical Report & Referrals clicked');
            evaluateClinicalData();
        });
    }
    
    // Save button
    if (saveBtn) {
        saveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Save clicked');
            saveQuestionnaire();
        });
    }
    
    // Print button
    if (printBtn) {
        printBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Print clicked');
            generatePDF();
        });
    }
    
    // Question count slider
    const questionCount = document.getElementById('questionCount');
    const questionVal = document.getElementById('questionVal');
    if (questionCount && questionVal) {
        questionCount.addEventListener('input', function() {
            questionVal.textContent = this.value;
            saveLocalProgress();
        });
    }
    
    // Form input auto-save
    setupFormAutoSave();
    
    console.log('Event listeners setup complete');
}

function setupFormAutoSave() {
    const inputs = [
        document.getElementById('patientName'),
        document.getElementById('patientAge'),
        document.getElementById('patientGender'),
        document.getElementById('patientDiagnosis'),
        document.getElementById('categorySelect'),
        document.getElementById('questionCount')
    ];
    
    inputs.forEach(input => {
        if (input) {
            input.addEventListener('input', saveLocalProgress);
            input.addEventListener('change', saveLocalProgress);
        }
    });
    
    // Auto-save generated form inputs
    document.addEventListener('input', function(e) {
        if (e.target.closest('.paper')) {
            saveFormData();
        }
    });
}

// ==================== LOCAL PROGRESS MANAGEMENT ====================
function saveLocalProgress() {
    console.log('Saving local progress...');
    
    const patientName = document.getElementById('patientName');
    const patientAge = document.getElementById('patientAge');
    const patientGender = document.getElementById('patientGender');
    const patientCondition = document.getElementById('patientDiagnosis');
    const categorySelect = document.getElementById('categorySelect');
    const questionCount = document.getElementById('questionCount');
    
    if (!patientName || !patientAge || !patientGender) return;
    
    const draft = {
        name: patientName.value || '',
        age: patientAge.value || '',
        gender: patientGender.value || 'Male',
        condition: patientCondition.value || '',
        cat: categorySelect.value || 'General',
        questions: questionCount.value || 15
    };
    
    localStorage.setItem('questionnaire_draft', JSON.stringify(draft));
    
    // Update current state
    currentQuestionnaireState.userData = {
        name: draft.name,
        age: draft.age,
        gender: draft.gender,
        condition: draft.condition
    };
    
    currentQuestionnaireState.config = {
        category: draft.cat,
        questionCount: draft.questions
    };
    
    currentQuestionnaireState.timestamp = Date.now();
    
    // Generate ID if needed
    if (!currentQuestionnaireState.id) {
        currentQuestionnaireState.id = 'temp_' + Date.now();
    }
    
    saveToLocalStorage();
}

function loadLocalProgress() {
    const saved = localStorage.getItem('questionnaire_draft');
    if (saved) {
        const draft = JSON.parse(saved);
        const patientName = document.getElementById('patientName');
        const patientAge = document.getElementById('patientAge');
        const patientGender = document.getElementById('patientGender');
        const patientCondition = document.getElementById('patientDiagnosis');
        const categorySelect = document.getElementById('categorySelect');
        const questionCount = document.getElementById('questionCount');
        const questionVal = document.getElementById('questionVal');
        
        if (patientName) patientName.value = draft.name || '';
        if (patientAge) patientAge.value = draft.age || '';
        if (patientGender) patientGender.value = draft.gender || 'Male';
        if (patientCondition) patientCondition.value = draft.condition || '';
        if (categorySelect) categorySelect.value = draft.cat || 'General';
        if (questionCount) questionCount.value = draft.questions || 15;
        if (questionVal) questionVal.textContent = draft.questions || 15;
        
        console.log('Local progress loaded');
    }
}

// ==================== AI GENERATION FUNCTION (QUESTIONNAIRE) ====================
async function generateQuestionnaire() {
    console.log('Starting questionnaire generation...');
    
    if (isGenerating) {
        console.warn('Already generating');
        return;
    }
    
    if (!githubToken) {
        console.log('Fetching tokens...');
        await fetchTokens();
        if (!githubToken) {
            alert("AI Service initializing. Please try again in 2 seconds.");
            return;
        }
    }
    
    // Get form values
    const patientName = document.getElementById('patientName');
    const patientAge = document.getElementById('patientAge');
    const patientGender = document.getElementById('patientGender');
    const patientCondition = document.getElementById('patientDiagnosis');
    const categorySelect = document.getElementById('categorySelect');
    const questionCount = document.getElementById('questionCount');
    
    if (!patientName || !patientCondition) {
        updateStatusIndicator('Please fill in required fields', true);
        return;
    }
    
    if (!patientName.value.trim()) {
        updateStatusIndicator('Please fill in your name', true);
        return;
    }
    
    isGenerating = true;
    
    // Show loading state
    const configPanel = document.getElementById('configPanel');
    const loadingState = document.getElementById('loadingState');
    const documentPreview = document.getElementById('documentPreview');
    const actionButtons = document.getElementById('actionButtons');
    
    if (configPanel) configPanel.style.display = 'none';
    if (loadingState) loadingState.style.display = 'flex';
    if (documentPreview) documentPreview.style.display = 'none';
    if (actionButtons) actionButtons.style.display = 'none';
    
    const prompt = `
    Generate a user-friendly, self-assessment questionnaire for clients/patients.
    
    CONTEXT: ${patientName.value} (${patientAge.value}yo ${patientGender.value}) wants to assess: ${patientCondition.value}.
    FORMAT: Exactly ${questionCount.value} questions.
    
    REQUIREMENTS:
    1. Return ONLY pure HTML. No markdown backticks.
    2. Use a clean, simple design with clear instructions.
    3. Question types to include:
       - Radio buttons for Yes/No, True/False options (use <input type="radio">)
       - Likert scales (Strongly Agree, Agree, Neutral, Disagree, Strongly Disagree)
       - Frequency scales (Never, Rarely, Sometimes, Often, Always)
       - Numerical scales (0 to 10, where 0=Not at all, 10=Extremely)
       - Checkbox lists for multiple symptoms/conditions (use <input type="checkbox">)
    4. Group related questions logically with clear section headers.
    5. Include a progress indicator at the top showing completion percentage.
    6. The LAST question should be: "Any additional information or concerns you'd like to share?" with a <textarea>.
    7. Include a privacy note: "Your responses are confidential and for self-assessment purposes only."
    8. Make it mobile-responsive with clear touch targets.
    9. Use friendly, non-clinical language that anyone can understand.
    10. Format each question clearly with proper spacing.
    
    Structure:
    - Start with brief instructions
    - Progress bar
    - Questions grouped by theme
    - Clear response options
    - Privacy assurance at the end
    
    Design: Use soft colors, plenty of white space, and easy-to-read typography.
    `;

    try {
        const response = await fetch(`${apiEndpoint}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${githubToken}`
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: "You are a patient-centered healthcare advisor creating user-friendly self-assessment questionnaires." },
                    { role: "user", content: prompt }
                ],
                model: "openai/gpt-4.1",
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        let html = data.choices[0].message.content;

        // Clean up the HTML
        html = html.replace(/```html/g, '').replace(/```/g, '').trim();
        
        // Enhance the generated HTML with our styling
        html = enhanceQuestionnaireHTML(html);
        
        // Save to current state
        currentQuestionnaireState.generatedForm = html;
        currentQuestionnaireState.userData = {
            name: patientName.value.trim(),
            age: patientAge.value.trim(),
            gender: patientGender.value,
            condition: patientCondition.value.trim()
        };
        
        currentQuestionnaireState.config = {
            category: categorySelect.value,
            questionCount: parseInt(questionCount.value)
        };
        
        currentQuestionnaireState.timestamp = Date.now();
        
        if (!currentQuestionnaireState.id || currentQuestionnaireState.id.startsWith('temp_')) {
            currentQuestionnaireState.id = 'questionnaire_' + Date.now();
        }
        
        // Display the form
        const printableArea = document.getElementById('printableArea');
        if (printableArea) {
            printableArea.innerHTML = html;
            
            // Add event listeners for interactive elements
            setTimeout(() => {
                addQuestionnaireInteractivity();
            }, 100);
        }
        
        // Hide loading state
        if (loadingState) loadingState.style.display = 'none';
        if (documentPreview) documentPreview.style.display = 'flex';
        if (actionButtons) actionButtons.style.display = 'flex';
        
        // Show evaluation controls
        const evaluationControls = document.getElementById('evaluationControls');
        const evaluateBtn = document.getElementById('evaluateBtn');
        if (evaluationControls) evaluationControls.style.display = 'block';
        if (evaluateBtn) {
            evaluateBtn.style.display = 'block';
            evaluateBtn.innerText = "Generate Clinical Report & Referrals";
        }
        
        // Auto-save
        saveToLocalStorage();
        loadSavedQuestionnaires();
        
        updateStatusIndicator('Questionnaire generated successfully');
        console.log('Questionnaire generated successfully');

    } catch (error) {
        console.error("Error generating questionnaire:", error);
        updateStatusIndicator('Error generating questionnaire. Please try again.', true);
        
        const loadingState = document.getElementById('loadingState');
        const configPanel = document.getElementById('configPanel');
        if (loadingState) loadingState.style.display = 'none';
        if (configPanel) configPanel.style.display = 'block';
    } finally {
        isGenerating = false;
    }
}

// ==================== HELPER FUNCTIONS ====================
function enhanceQuestionnaireHTML(html) {
    // Add CSS for questionnaire styling
    const style = `
    <style>
        .questionnaire-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 30px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }
        
        .progress-container {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
            border: 1px solid #e9ecef;
        }
        
        .progress-bar {
            background: #e9ecef;
            height: 10px;
            border-radius: 5px;
            margin-bottom: 10px;
            overflow: hidden;
        }
        
        .progress-fill {
            background: linear-gradient(90deg, #00BCD4, #28a745);
            height: 100%;
            width: 0%;
            transition: width 0.5s ease;
            border-radius: 5px;
        }
        
        .progress-text {
            display: flex;
            justify-content: space-between;
            color: #6c757d;
            font-size: 0.9em;
        }
        
        .question-section {
            margin-bottom: 40px;
            padding: 25px;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            border: 1px solid #eaeaea;
        }
        
        .section-header {
            color: #2c3e50;
            font-size: 1.3em;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f0f9ff;
            font-weight: 600;
        }
        
        .question-item {
            margin-bottom: 25px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            transition: all 0.3s ease;
            border: 1px solid #e9ecef;
        }
        
        .question-item:hover {
            background: #f0f9ff;
            border-color: #c2e7ff;
        }
        
        .question-text {
            font-size: 1.1em;
            color: #34495e;
            margin-bottom: 15px;
            font-weight: 500;
            line-height: 1.5;
        }
        
        .question-number {
            display: inline-block;
            background: #00BCD4;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            text-align: center;
            line-height: 28px;
            font-size: 0.9em;
            margin-right: 10px;
            font-weight: 600;
        }
        
        .response-options {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 15px;
        }
        
        .scale-options {
            display: flex;
            justify-content: space-between;
            max-width: 600px;
            margin-top: 15px;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
        }
        
        .scale-item {
            text-align: center;
            flex: 1;
            padding: 10px 5px;
        }
        
        .scale-label {
            display: block;
            font-size: 0.85em;
            color: #666;
            margin-top: 8px;
            font-weight: 500;
        }
        
        input[type="radio"], input[type="checkbox"] {
            margin-right: 10px;
            transform: scale(1.2);
            cursor: pointer;
        }
        
        .likert-scale {
            display: flex;
            gap: 10px;
            margin-top: 15px;
            flex-wrap: wrap;
        }
        
        .likert-option {
            flex: 1;
            text-align: center;
            padding: 12px 8px;
            background: #fff;
            border: 2px solid #dee2e6;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: 120px;
        }
        
        .likert-option:hover {
            background: #f0f9ff;
            border-color: #00BCD4;
            transform: translateY(-2px);
        }
        
        .likert-option input[type="radio"] {
            display: none;
        }
        
        .likert-option.selected {
            background: #e6fffa;
            border-color: #28a745;
            color: #047481;
            font-weight: 600;
            box-shadow: 0 4px 6px rgba(40, 167, 69, 0.1);
        }
        
        .numerical-scale {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .scale-range {
            flex: 1;
            -webkit-appearance: none;
            height: 10px;
            background: linear-gradient(to right, #ff6b6b, #ffd166, #06d6a0);
            border-radius: 5px;
            outline: none;
        }
        
        .scale-range::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #00BCD4;
            cursor: pointer;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            transition: all 0.2s ease;
        }
        
        .scale-range::-webkit-slider-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
        
        .scale-value-display {
            min-width: 50px;
            text-align: center;
            font-weight: bold;
            color: #00BCD4;
            font-size: 1.2em;
            background: white;
            padding: 8px 12px;
            border-radius: 6px;
            border: 2px solid #e9ecef;
        }
        
        .additional-info {
            margin-top: 40px;
            padding: 25px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 4px solid #00BCD4;
        }
        
        .privacy-note {
            margin-top: 40px;
            padding: 20px;
            background: #f0f9ff;
            border-radius: 8px;
            font-size: 0.9em;
            color: #495057;
            text-align: center;
            border: 1px solid #c2e7ff;
            line-height: 1.6;
        }
        
        .privacy-note i {
            color: #00BCD4;
            margin-right: 8px;
        }
        
        textarea {
            width: 100%;
            min-height: 150px;
            padding: 15px;
            border: 2px solid #dee2e6;
            border-radius: 8px;
            font-size: 1em;
            line-height: 1.5;
            resize: vertical;
            transition: all 0.3s ease;
            font-family: inherit;
        }
        
        textarea:focus {
            outline: none;
            border-color: #00BCD4;
            box-shadow: 0 0 0 3px rgba(0,188,212,0.1);
        }
        
        label {
            cursor: pointer;
            display: flex;
            align-items: center;
            padding: 10px 15px;
            border-radius: 6px;
            transition: all 0.2s ease;
            margin-bottom: 5px;
            background: white;
            border: 1px solid #e9ecef;
        }
        
        label:hover {
            background: #edf2f7;
            border-color: #c2d6e6;
        }
        
        .checkbox-group, .radio-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 10px;
        }
        
        .instructions {
            background: #e6fffa;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            border-left: 4px solid #28a745;
            color: #047481;
            line-height: 1.6;
        }
        
        .instructions i {
            margin-right: 10px;
            color: #28a745;
        }
        
        @media (max-width: 768px) {
            .questionnaire-container {
                padding: 15px;
            }
            
            .question-section {
                padding: 15px;
            }
            
            .scale-options, .likert-scale {
                flex-direction: column;
                gap: 8px;
            }
            
            .likert-option {
                min-width: 100%;
            }
            
            .numerical-scale {
                flex-direction: column;
                align-items: stretch;
                gap: 15px;
            }
            
            .scale-value-display {
                align-self: center;
            }
            
            .question-item {
                padding: 15px;
            }
        }
    </style>
    `;
    
    // Add progress bar and instructions if not present
    if (!html.includes('progress-bar')) {
        html = `
        <div class="questionnaire-container">
            <div class="instructions">
                <i class="fas fa-info-circle"></i>
                Please answer all questions honestly. Your responses are completely anonymous and will help you better understand your current situation.
            </div>
            
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <div class="progress-text">
                    <span>Progress</span>
                    <span id="progressPercentage">0%</span>
                </div>
            </div>
            
            ${html}
            
            <div class="privacy-note">
                <i class="fas fa-lock"></i>
                Your responses are confidential and for self-assessment purposes only. No personal data is stored without your permission.
            </div>
        </div>`;
    }
    
    return style + html;
}

function addQuestionnaireInteractivity() {
    // Update progress bar
    updateProgressBar();
    
    // Add Likert scale interactivity
    document.querySelectorAll('.likert-option').forEach(option => {
        option.addEventListener('click', function() {
            const parent = this.parentElement;
            const radioName = this.querySelector('input')?.name;
            
            // Find all options with same radio name and deselect
            document.querySelectorAll(`.likert-option input[name="${radioName}"]`).forEach(input => {
                input.parentElement?.classList.remove('selected');
            });
            
            this.classList.add('selected');
            if (this.querySelector('input')) {
                this.querySelector('input').checked = true;
            }
            updateProgressBar();
        });
    });
    
    // Add numerical scale interactivity
    document.querySelectorAll('.scale-range').forEach(range => {
        const valueDisplay = range.nextElementSibling;
        if (valueDisplay && valueDisplay.classList.contains('scale-value-display')) {
            // Set initial value
            valueDisplay.textContent = range.value;
            
            range.addEventListener('input', function() {
                valueDisplay.textContent = this.value;
                updateProgressBar();
            });
        }
    });
    
    // Add radio/checkbox interactivity
    document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
        input.addEventListener('change', function() {
            // For Likert scales, update visual state
            if (this.type === 'radio' && this.closest('.likert-option')) {
                const parent = this.closest('.likert-scale');
                if (parent) {
                    parent.querySelectorAll('.likert-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    this.closest('.likert-option')?.classList.add('selected');
                }
            }
            updateProgressBar();
        });
    });
    
    // Add textarea change listener
    document.querySelectorAll('textarea').forEach(textarea => {
        textarea.addEventListener('input', updateProgressBar);
    });
}

function updateProgressBar() {
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');
    
    if (!progressFill || !progressPercentage) return;
    
    // Count all questions
    const allQuestions = document.querySelectorAll('.question-item');
    let answeredQuestions = new Set();
    
    allQuestions.forEach((question, index) => {
        // Check for any answered field in this question
        const hasRadio = question.querySelector('input[type="radio"]:checked');
        const hasCheckbox = question.querySelector('input[type="checkbox"]:checked');
        const hasLikert = question.querySelector('.likert-option.selected');
        const hasScale = question.querySelector('.scale-range');
        const hasTextarea = question.querySelector('textarea');
        
        let isAnswered = false;
        
        if (hasRadio || hasCheckbox) {
            isAnswered = true;
        } else if (hasLikert) {
            isAnswered = true;
        } else if (hasScale) {
            const scaleValue = parseInt(hasScale.value);
            if (!isNaN(scaleValue) && scaleValue > 0) {
                isAnswered = true;
            }
        } else if (hasTextarea && hasTextarea.value.trim().length > 0) {
            isAnswered = true;
        }
        
        if (isAnswered) {
            answeredQuestions.add(index);
        }
    });
    
    const totalQuestions = allQuestions.length;
    const answeredCount = answeredQuestions.size;
    const percentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
    
    progressFill.style.width = `${percentage}%`;
    progressPercentage.textContent = `${percentage}%`;
    
    // Change color based on completion
    if (percentage === 100) {
        progressFill.style.background = 'linear-gradient(90deg, #28a745, #06d6a0)';
    } else if (percentage >= 50) {
        progressFill.style.background = 'linear-gradient(90deg, #ffd166, #06d6a0)';
    } else {
        progressFill.style.background = 'linear-gradient(90deg, #00BCD4, #28a745)';
    }
}

// ==================== CLINICAL EVALUATION FUNCTION ====================
async function evaluateClinicalData() {
    console.log('Starting clinical evaluation...');
    
    if (isGenerating) {
        console.warn('Already processing');
        return;
    }
    
    if (!githubToken) {
        await fetchTokens();
        if (!githubToken) {
            alert("AI Service initializing. Please try again.");
            return;
        }
    }
    
    const filledData = scrapeFormData();
    
    if(filledData.length < 50) {
        if(!confirm("The questionnaire seems mostly empty. The clinical report might not be accurate. Continue?")) return;
    }

    isGenerating = true;
    
    const evaluateBtn = document.getElementById('evaluateBtn');
    const evalLoading = document.getElementById('evalLoading');
    const evaluationReport = document.getElementById('evaluationReport');
    
    if (evaluateBtn) evaluateBtn.style.display = 'none';
    if (evalLoading) evalLoading.style.display = 'block';
    if (evaluationReport) evaluationReport.style.display = 'none';

    const patientName = document.getElementById('patientName');
    const patientCondition = document.getElementById('patientDiagnosis');
    
    const prompt = `
    Act as a Senior Clinical Supervisor. Analyze this questionnaire data:
    ${filledData}

    Patient: ${patientName.value}
    Condition/Concern: ${patientCondition.value}

    Provide a Clinical Report HTML with these exact sections:
    1. <h3>Clinical Impression/Summary</h3>: Based on the questionnaire responses, provide a professional summary of the patient's condition.
    2. <h3>Key Findings</h3>: List the most important observations from the questionnaire.
    3. <h3>Recommendations</h3>: Suggest appropriate next steps or interventions.
    4. <h3>Recommended Referrals</h3>: 
       Create a list of professionals who could help based on the responses.
       Format links exactly like:
       <a href="professionals.html?category=Physiotherapist" class="referral-card">
          <i class="fas fa-user-md"></i>
          <span>Physiotherapist</span>
       </a>
       
    5. <h3>Standardized Assessment Tools</h3>: List 3 relevant standardized assessment tools for this condition as clickable links.

    Keep tone professional but compassionate. Return ONLY HTML code.
    `;

    try {
        const response = await fetch(`${apiEndpoint}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${githubToken}`
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: "You are a senior rehabilitation consultant analyzing patient questionnaires." }, 
                    { role: "user", content: prompt }
                ],
                model: "openai/gpt-4.1",
                temperature: 0.5
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const reportHtml = data.choices[0].message.content.replace(/```html/g, '').replace(/```/g, '');

        // Create report with dismiss button
        if (evaluationReport) {
            evaluationReport.innerHTML = `
                <div class="report-header" style="display:flex; justify-content:space-between; align-items:center; padding: 20px; background: linear-gradient(135deg, #00BCD4 0%, #28a745 100%); color: white; border-radius: 12px 12px 0 0;">
                    <div>
                        <h2 style="margin:0; font-size: 1.5em;"><i class="fas fa-clipboard-check"></i> Clinical Assessment Report</h2>
                        <p style="margin:5px 0 0 0; opacity:0.9; font-size: 0.9em;">Generated for ${patientName.value}</p>
                    </div>
                    <button id="dismissReportBtn" style="background:rgba(255,255,255,0.2); border:none; color:white; font-size:1.5rem; cursor:pointer; padding:5px 10px; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">&times;</button>
                </div>
                <div style="padding: 25px; background: white; border-radius: 0 0 12px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                    ${reportHtml}
                </div>
            `;
            evaluationReport.style.display = 'block';
            
            // Add Dismiss Logic
            const dismissBtn = document.getElementById('dismissReportBtn');
            if (dismissBtn) {
                dismissBtn.addEventListener('click', function() {
                    evaluationReport.style.display = 'none';
                    if (evaluateBtn) {
                        evaluateBtn.style.display = 'block';
                        evaluateBtn.innerText = "Show Report";
                    }
                });
            }
        }

        if (evalLoading) evalLoading.style.display = 'none';
        if (evaluateBtn) {
            evaluateBtn.style.display = 'block';
            evaluateBtn.innerText = "Regenerate Report";
        }
        
        if (evaluationReport) {
            evaluationReport.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Save evaluation report to state
        currentQuestionnaireState.evaluationReport = evaluationReport ? evaluationReport.innerHTML : '';
        currentQuestionnaireState.isComplete = true;
        currentQuestionnaireState.hasEvaluation = true;
        currentQuestionnaireState.timestamp = Date.now();
        
        // Auto-save
        saveToLocalStorage();
        
        updateStatusIndicator('Clinical report generated successfully');
        console.log('Clinical evaluation complete');

    } catch (error) {
        console.error("Error evaluating data:", error);
        updateStatusIndicator('Error analyzing data. Please try again.', true);
        
        if (evalLoading) evalLoading.style.display = 'none';
        if (evaluateBtn) {
            evaluateBtn.style.display = 'block';
            evaluateBtn.innerText = "Generate Clinical Report & Referrals";
        }
    } finally {
        isGenerating = false;
    }
}

function scrapeFormData() {
    const patientName = document.getElementById('patientName');
    const patientAge = document.getElementById('patientAge');
    const patientCondition = document.getElementById('patientDiagnosis');
    
    let textData = `Patient: ${patientName ? patientName.value : 'N/A'}, Age: ${patientAge ? patientAge.value : 'N/A'}, Condition: ${patientCondition ? patientCondition.value : 'N/A'}\n---\n`;
    
    const container = document.querySelector('.paper');
    if (!container) return textData;
    
    // Get all questions
    const questions = container.querySelectorAll('.question-item');
    
    questions.forEach((question, index) => {
        const questionText = question.querySelector('.question-text')?.textContent || 
                            question.textContent.substring(0, 150).replace(/\d+\.\s*/, '').trim() || 
                            `Question ${index + 1}`;
        
        let answer = 'Not answered';
        
        // Check for radio button selection
        const selectedRadio = question.querySelector('input[type="radio"]:checked');
        if (selectedRadio) {
            answer = selectedRadio.nextElementSibling?.textContent || 'Selected';
        }
        
        // Check for checkbox selection
        const checkboxes = question.querySelectorAll('input[type="checkbox"]:checked');
        if (checkboxes.length > 0) {
            answer = Array.from(checkboxes).map(cb => 
                cb.nextElementSibling?.textContent || 'Checked'
            ).join(', ');
        }
        
        // Check for Likert scale
        const likertSelected = question.querySelector('.likert-option.selected');
        if (likertSelected) {
            answer = likertSelected.textContent.trim();
        }
        
        // Check for numerical scale
        const scaleRange = question.querySelector('.scale-range');
        if (scaleRange) {
            answer = `${scaleRange.value}/10`;
        }
        
        // Check for textarea
        const textarea = question.querySelector('textarea');
        if (textarea && textarea.value.trim()) {
            answer = textarea.value.trim();
        }
        
        textData += `Q${index + 1}: ${questionText}\n`;
        textData += `Answer: ${answer}\n\n`;
    });
    
    return textData;
}

// ==================== SAVED QUESTIONNAIRES ====================
function loadSavedQuestionnaires() {
    const savedList = document.getElementById('savedList');
    if (!savedList) return;
    
    const questionnaires = JSON.parse(localStorage.getItem('rehabverve_questionnaires') || '[]');
    
    if (questionnaires.length === 0) {
        savedList.innerHTML = `
            <div class="history-item" style="text-align: center; color: var(--text-tertiary); padding: 30px 20px;">
                <i class="fas fa-file-medical-alt" style="font-size: 2em; margin-bottom: 10px; opacity: 0.5;"></i>
                <p>No saved questionnaires yet</p>
                <small>Create your first questionnaire to get started</small>
            </div>
        `;
        return;
    }
    
    savedList.innerHTML = questionnaires.map(questionnaire => `
        <div class="history-item" data-id="${questionnaire.id}">
            <div class="item-content">
                <div class="item-title">
                    ${questionnaire.userName || 'Untitled Questionnaire'}
                    ${questionnaire.hasEvaluation ? '<i class="fas fa-file-medical-alt" style="color: #28a745; font-size: 0.8em; margin-left: 5px;"></i>' : ''}
                </div>
                <div class="item-sub">
                    <i class="far fa-calendar"></i>
                    ${new Date(questionnaire.timestamp).toLocaleDateString()}
                    <span style="margin-left: 8px; background: ${getCategoryColor(questionnaire.category)}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; font-weight: 500;">
                        ${questionnaire.category || 'General'}
                    </span>
                </div>
                <div style="font-size: 0.75em; color: var(--text-tertiary); margin-top: 4px;">
                    ${questionnaire.condition ? questionnaire.condition.substring(0, 30) + (questionnaire.condition.length > 30 ? '...' : '') : 'No condition specified'}
                </div>
                <div style="font-size: 0.7em; color: #666; margin-top: 2px;">
                    ${questionnaire.questionCount || 15} questions
                </div>
            </div>
            <button class="delete-history-btn" onclick="deleteQuestionnaire('${questionnaire.id}', event)" title="Delete questionnaire">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `).join('');
    
    // Add click listeners to load questionnaires
    savedList.querySelectorAll('.history-item').forEach(item => {
        const id = item.getAttribute('data-id');
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-history-btn')) {
                loadQuestionnaireFromStorage(id);
                // Close sidebar on mobile
                const aiSidebar = document.getElementById('aiSidebar');
                if (window.innerWidth <= 992 && aiSidebar) {
                    aiSidebar.classList.remove('active');
                    const sidebarToggleIcon = document.querySelector('#sidebarToggle i');
                    if (sidebarToggleIcon) {
                        sidebarToggleIcon.className = 'fas fa-history';
                    }
                }
            }
        });
    });
}

// ==================== LOAD/SAVE FUNCTIONS ====================
function loadQuestionnaireFromStorage(questionnaireId) {
    try {
        const savedState = JSON.parse(localStorage.getItem(questionnaireId));
        if (!savedState) {
            console.error('Questionnaire not found:', questionnaireId);
            updateStatusIndicator('Questionnaire not found', true);
            return;
        }
        
        currentQuestionnaireState = savedState;
        
        // Restore form inputs
        const patientName = document.getElementById('patientName');
        const patientAge = document.getElementById('patientAge');
        const patientGender = document.getElementById('patientGender');
        const patientCondition = document.getElementById('patientDiagnosis');
        const categorySelect = document.getElementById('categorySelect');
        const questionCount = document.getElementById('questionCount');
        const questionVal = document.getElementById('questionVal');
        
        if (patientName) patientName.value = savedState.userData?.name || '';
        if (patientAge) patientAge.value = savedState.userData?.age || '';
        if (patientGender) patientGender.value = savedState.userData?.gender || 'Male';
        if (patientCondition) patientCondition.value = savedState.userData?.condition || '';
        if (categorySelect) categorySelect.value = savedState.config?.category || 'General';
        if (questionCount) questionCount.value = savedState.config?.questionCount || 15;
        if (questionVal) questionVal.textContent = savedState.config?.questionCount || 15;
        
        // If there's a generated form, show it
        if (savedState.generatedForm && savedState.generatedForm.trim() !== '') {
            const configPanel = document.getElementById('configPanel');
            const documentPreview = document.getElementById('documentPreview');
            const printableArea = document.getElementById('printableArea');
            const actionButtons = document.getElementById('actionButtons');
            const evaluationControls = document.getElementById('evaluationControls');
            const evaluateBtn = document.getElementById('evaluateBtn');
            const evaluationReport = document.getElementById('evaluationReport');
            
            if (configPanel) configPanel.style.display = 'none';
            if (documentPreview) documentPreview.style.display = 'flex';
            if (printableArea) printableArea.innerHTML = savedState.generatedForm;
            if (actionButtons) actionButtons.style.display = 'flex';
            if (evaluationControls) evaluationControls.style.display = 'block';
            if (evaluateBtn) evaluateBtn.style.display = 'block';
            
            // Restore form data if saved
            if (savedState.formData && Object.keys(savedState.formData).length > 0) {
                setTimeout(() => {
                    restoreFormData(savedState.formData);
                    addQuestionnaireInteractivity();
                }, 100);
            } else {
                setTimeout(() => {
                    addQuestionnaireInteractivity();
                }, 100);
            }
            
            // If there's an evaluation report, show it
            if (savedState.evaluationReport && savedState.evaluationReport.trim() !== '' && evaluationReport) {
                evaluationReport.innerHTML = savedState.evaluationReport;
                evaluationReport.style.display = 'block';
                
                // Add event listener to dismiss button
                const dismissBtn = document.getElementById('dismissReportBtn');
                if (dismissBtn) {
                    dismissBtn.addEventListener('click', () => {
                        evaluationReport.style.display = 'none';
                        if (evaluateBtn) {
                            evaluateBtn.innerText = "Show Report";
                        }
                    });
                }
            }
        }
        
        updateStatusIndicator('Questionnaire loaded successfully');
        console.log('Questionnaire loaded:', questionnaireId);
        
    } catch (error) {
        console.error('Error loading questionnaire:', error);
        updateStatusIndicator('Error loading questionnaire', true);
    }
}

function restoreFormData(formData) {
    const container = document.querySelector('.paper');
    if (!container) return;
    
    Object.keys(formData).forEach(fieldName => {
        const element = container.querySelector(`[name="${fieldName}"], [data-field="${fieldName}"]`);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = formData[fieldName];
            } else if (element.type === 'radio') {
                if (formData[fieldName]) {
                    element.checked = true;
                    // Update visual state for Likert
                    if (element.closest('.likert-option')) {
                        element.closest('.likert-option').classList.add('selected');
                    }
                }
            } else if (element.type === 'range') {
                element.value = formData[fieldName];
                const valueDisplay = element.nextElementSibling;
                if (valueDisplay && valueDisplay.classList.contains('scale-value-display')) {
                    valueDisplay.textContent = formData[fieldName];
                }
            } else {
                element.value = formData[fieldName];
            }
        }
    });
}

function saveFormData() {
    const paper = document.querySelector('.paper');
    if (!paper) return;
    
    const formData = {};
    
    // Save all form inputs
    const inputs = paper.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        const name = input.name || input.id || input.getAttribute('data-field');
        if (name && name.trim() !== '') {
            const fieldName = name.trim();
            if (input.type === 'checkbox' || input.type === 'radio') {
                formData[fieldName] = input.checked;
            } else if (input.type === 'range') {
                formData[fieldName] = input.value;
            } else {
                formData[fieldName] = input.value;
            }
        }
    });
    
    currentQuestionnaireState.formData = formData;
    currentQuestionnaireState.timestamp = Date.now();
    
    saveToLocalStorage();
}

function saveToLocalStorage() {
    if (!currentQuestionnaireState.id) {
        currentQuestionnaireState.id = 'questionnaire_' + Date.now();
    }
    
    try {
        // Save the current state
        localStorage.setItem(currentQuestionnaireState.id, JSON.stringify(currentQuestionnaireState));
        
        // Update the questionnaires list
        const questionnaires = JSON.parse(localStorage.getItem('rehabverve_questionnaires') || '[]');
        const existingIndex = questionnaires.findIndex(q => q.id === currentQuestionnaireState.id);
        
        const questionnaireInfo = {
            id: currentQuestionnaireState.id,
            timestamp: currentQuestionnaireState.timestamp,
            userName: currentQuestionnaireState.userData.name || 'Untitled Questionnaire',
            condition: currentQuestionnaireState.userData.condition || '',
            category: currentQuestionnaireState.config.category || 'General',
            questionCount: currentQuestionnaireState.config.questionCount || 15,
            isComplete: currentQuestionnaireState.isComplete,
            hasEvaluation: currentQuestionnaireState.hasEvaluation
        };
        
        if (existingIndex >= 0) {
            questionnaires[existingIndex] = questionnaireInfo;
        } else {
            questionnaires.push(questionnaireInfo);
        }
        
        // Sort by timestamp (newest first)
        questionnaires.sort((a, b) => b.timestamp - a.timestamp);
        
        // Keep only last 50 questionnaires
        if (questionnaires.length > 50) {
            questionnaires.splice(50);
        }
        
        localStorage.setItem('rehabverve_questionnaires', JSON.stringify(questionnaires));
        
        console.log('Saved to localStorage:', currentQuestionnaireState.id);
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
}

// ==================== UI FUNCTIONS ====================
function createNewQuestionnaire() {
    console.log('Creating new questionnaire...');
    
    // Reset form inputs
    const patientName = document.getElementById('patientName');
    const patientAge = document.getElementById('patientAge');
    const patientGender = document.getElementById('patientGender');
    const patientCondition = document.getElementById('patientDiagnosis');
    const categorySelect = document.getElementById('categorySelect');
    const questionCount = document.getElementById('questionCount');
    const questionVal = document.getElementById('questionVal');
    
    if (patientName) patientName.value = '';
    if (patientAge) patientAge.value = '';
    if (patientGender) patientGender.value = 'Male';
    if (patientCondition) patientCondition.value = '';
    if (categorySelect) categorySelect.value = 'General';
    if (questionCount) questionCount.value = 15;
    if (questionVal) questionVal.textContent = '15';
    
    // Reset UI
    const configPanel = document.getElementById('configPanel');
    const documentPreview = document.getElementById('documentPreview');
    const actionButtons = document.getElementById('actionButtons');
    const printableArea = document.getElementById('printableArea');
    const evaluationControls = document.getElementById('evaluationControls');
    const evaluationReport = document.getElementById('evaluationReport');
    
    if (configPanel) configPanel.style.display = 'block';
    if (documentPreview) documentPreview.style.display = 'none';
    if (actionButtons) actionButtons.style.display = 'none';
    if (printableArea) printableArea.innerHTML = '';
    if (evaluationControls) evaluationControls.style.display = 'none';
    if (evaluationReport) {
        evaluationReport.style.display = 'none';
        evaluationReport.innerHTML = '';
    }
    
    // Reset state
    currentQuestionnaireState = {
        id: null,
        timestamp: null,
        userData: {
            name: '',
            age: '',
            gender: 'Male',
            condition: ''
        },
        config: {
            category: 'General',
            questionCount: 15
        },
        generatedForm: '',
        evaluationReport: '',
        formData: {},
        isComplete: false,
        hasEvaluation: false
    };
    
    // Clear local draft
    localStorage.removeItem('questionnaire_draft');
    
    updateStatusIndicator('New questionnaire started');
    console.log('New questionnaire created');
}

function saveQuestionnaire() {
    console.log('Saving questionnaire...');
    
    if (!currentQuestionnaireState.id) {
        currentQuestionnaireState.id = 'questionnaire_' + Date.now();
    }
    
    // Save generated form HTML if it exists
    const printableArea = document.getElementById('printableArea');
    if (printableArea) {
        currentQuestionnaireState.generatedForm = printableArea.innerHTML;
    }
    
    // Save evaluation report if it exists
    const evaluationReport = document.getElementById('evaluationReport');
    if (evaluationReport && evaluationReport.innerHTML.trim()) {
        currentQuestionnaireState.evaluationReport = evaluationReport.innerHTML;
        currentQuestionnaireState.hasEvaluation = true;
        currentQuestionnaireState.isComplete = true;
    }
    
    saveToLocalStorage();
    loadSavedQuestionnaires();
    
    updateStatusIndicator('Questionnaire saved successfully!');
    console.log('Questionnaire saved:', currentQuestionnaireState.id);
}

function generatePDF() {
    console.log('Generating PDF...');
    
    const printableArea = document.getElementById('printableArea');
    if (!printableArea || printableArea.innerHTML.trim() === '') {
        updateStatusIndicator('No content to generate PDF', true);
        return;
    }
    
    updateStatusIndicator('Preparing PDF...');
    
    html2canvas(printableArea, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: printableArea.scrollWidth,
        windowHeight: printableArea.scrollHeight
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        // Add new pages if content is too long
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        const fileName = `Questionnaire_${currentQuestionnaireState.userData.name || 'User'}_${new Date().toISOString().slice(0,10)}.pdf`;
        pdf.save(fileName);
        
        updateStatusIndicator('PDF downloaded: ' + fileName);
        console.log('PDF generated:', fileName);
        
    }).catch(error => {
        console.error('PDF generation error:', error);
        updateStatusIndicator('Error generating PDF', true);
    });
}

function updateStatusIndicator(message, isError = false) {
    const indicator = document.getElementById('statusIndicator');
    if (!indicator) return;
    
    indicator.textContent = message;
    indicator.style.display = 'flex';
    indicator.style.background = isError ? 
        'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' : 
        'linear-gradient(135deg, #28a745 0%, #00BCD4 100%)';
    indicator.style.color = 'white';
    indicator.style.padding = '12px 24px';
    indicator.style.borderRadius = '8px';
    indicator.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    indicator.style.zIndex = '1000';
    
    setTimeout(() => {
        indicator.style.display = 'none';
    }, 3000);
}

function getCategoryColor(category) {
    const colors = {
        'General': '#00BCD4',
        'Medical': '#2196F3',
        'Orthopaedic': '#FF9800',
        'Paediatric': '#9C27B0',
        'Psychiatry': '#E91E63',
        'Wellness': '#4CAF50',
        'Mental Health': '#3F51B5',
        'Physical Health': '#FF5722',
        'Lifestyle': '#795548',
        'Screening': '#673AB7'
    };
    
    return colors[category] || '#00BCD4';
}

// ==================== GLOBAL FUNCTIONS ====================
window.deleteQuestionnaire = function(questionnaireId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    if (confirm('Are you sure you want to delete this questionnaire? This action cannot be undone.')) {
        try {
            // Remove from questionnaires list
            let questionnaires = JSON.parse(localStorage.getItem('rehabverve_questionnaires') || '[]');
            questionnaires = questionnaires.filter(q => q.id !== questionnaireId);
            localStorage.setItem('rehabverve_questionnaires', JSON.stringify(questionnaires));
            
            // Remove the actual questionnaire data
            localStorage.removeItem(questionnaireId);
            
            // If we're currently viewing this questionnaire, clear the view
            if (currentQuestionnaireState.id === questionnaireId) {
                createNewQuestionnaire();
            }
            
            // Reload the list
            loadSavedQuestionnaires();
            
            updateStatusIndicator('Questionnaire deleted');
            console.log('Deleted questionnaire:', questionnaireId);
            
        } catch (error) {
            console.error('Error deleting questionnaire:', error);
            updateStatusIndicator('Error deleting questionnaire', true);
        }
    }
};

// ==================== AUTO-SAVE ====================
setInterval(() => {
    if (!isGenerating && (currentQuestionnaireState.generatedForm || Object.keys(currentQuestionnaireState.formData).length > 0)) {
        saveFormData();
        saveToLocalStorage();
    }
}, 30000);

window.addEventListener('beforeunload', function() {
    if (!isGenerating && (currentQuestionnaireState.generatedForm || Object.keys(currentQuestionnaireState.formData).length > 0)) {
        saveFormData();
        saveToLocalStorage();
    }
});

console.log('Assessment.js loaded with questionnaire generator and clinical report functionality');
