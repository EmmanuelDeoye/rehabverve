// intake.js — adaptive teletherapy intake. Questions adapt to who the care is for and the main concern;
// the answers are saved as a booking (type "intake") for the care team to review and match.
(function () {
    'use strict';
    const { $, esc } = RV;

    const QUESTIONS = [
      // ---- MENTAL / BEHAVIOURAL TRACK (adult or child) ----
      {
        id: "focus_attention",
        title: "Focus & Attention",
        subtitle: "How often do you struggle to maintain focus or finish tasks?",
        type: "single",
        options: [
          { value: "daily", label: "Almost every day", icon: "bx-tired", insight: "Frequent attention lapses may affect work, relationships, and daily routines." },
          { value: "often", label: "Several times a week", icon: "bx-calendar-week", insight: "Consistent struggles with focus can be linked to ADHD, anxiety, or burnout." },
          { value: "sometimes", label: "Occasionally", icon: "bx-time", insight: "Even mild concentration issues can escalate under stress. Early support helps." },
          { value: "rarely", label: "Rarely / Not an issue", icon: "bx-check-circle", insight: "Great! Still, maintaining cognitive sharpness is key to long-term wellbeing." }
        ],
        condition: (a) => a.problemType === 'mental' || a.problemType === 'behavioural',
        dynamicTitle: (a) => {
          if (a.userType === 'child') return "Your child's Focus & Attention";
          if (a.userType === 'other') return "Their Focus & Attention";
          return "Focus & Attention";
        },
        dynamicSubtitle: (a) => {
          if (a.userType === 'child') return "How often does your child struggle to maintain focus or finish tasks?";
          if (a.userType === 'other') return "How often do they struggle to maintain focus or finish tasks?";
          return "How often do you struggle to maintain focus or finish tasks?";
        }
      },
      {
        id: "memory_cognition",
        title: "Memory & Cognitive Clarity",
        subtitle: "Do you experience forgetfulness, brain fog, or trouble remembering recent events?",
        type: "single",
        options: [
          { value: "severe", label: "Yes, it interferes with daily life", icon: "bx-brain", insight: "Memory struggles can be linked to depression, anxiety, or early cognitive changes." },
          { value: "moderate", label: "Sometimes, especially under stress", icon: "bx-cloud", insight: "Stress and lack of sleep heavily impact short-term memory and decision-making." },
          { value: "mild", label: "Mild forgetfulness (names, appointments)", icon: "bx-notepad", insight: "Brain fog is common — our teletherapy includes cognitive exercises to sharpen recall." },
          { value: "none", label: "My memory feels sharp", icon: "bx-star", insight: "That's encouraging! Prevention & maintenance keep your mind resilient." }
        ],
        condition: (a) => a.problemType === 'mental' || a.problemType === 'behavioural',
        dynamicTitle: (a) => {
          if (a.userType === 'child') return "Your child's Memory & Learning";
          if (a.userType === 'other') return "Their Memory & Cognition";
          return "Memory & Cognitive Clarity";
        },
        dynamicSubtitle: (a) => {
          if (a.userType === 'child') return "Does your child experience forgetfulness or trouble remembering things?";
          if (a.userType === 'other') return "Do they experience forgetfulness, brain fog, or trouble remembering recent events?";
          return "Do you experience forgetfulness, brain fog, or trouble remembering recent events?";
        }
      },
      {
        id: "anxiety_worry",
        title: "Anxiety & Overthinking",
        subtitle: "How often do you feel overwhelmed by worry or anxious thoughts?",
        type: "single",
        options: [
          { value: "constant", label: "Almost constantly", icon: "bx-spa", insight: "Persistent anxiety can be exhausting — but it's highly treatable with CBT and coping tools." },
          { value: "frequent", label: "Several times a week", icon: "bx-alarm", insight: "Anxiety disorders affect millions. Small daily interventions make a big difference." },
          { value: "situational", label: "Only in specific situations", icon: "bx-conversation", insight: "Situational anxiety is normal, but learning grounding techniques builds confidence." },
          { value: "rare", label: "Rarely anxious", icon: "bx-smile", insight: "Stress management still boosts mental resilience for the future." }
        ],
        condition: (a) => a.problemType === 'mental',
        dynamicSubtitle: (a) => {
          if (a.userType === 'child') return "How often does your child feel overwhelmed by worry or anxious thoughts?";
          if (a.userType === 'other') return "How often do they feel overwhelmed by worry or anxious thoughts?";
          return "How often do you feel overwhelmed by worry or anxious thoughts?";
        }
      },
      {
        id: "mood_depression",
        title: "Mood & Energy Levels",
        subtitle: "Over the past two weeks, how often have you felt down, hopeless, or lost interest in things you once enjoyed?",
        type: "single",
        options: [
          { value: "daily", label: "Nearly every day", icon: "bx-cloud-rain", insight: "You're not alone. Depression is a medical condition — teletherapy provides proven strategies and support." },
          { value: "often", label: "More than half the days", icon: "bx-sad", insight: "Low mood can affect motivation and concentration. Our therapists specialize in evidence-based care." },
          { value: "some_days", label: "Several days", icon: "bx-meh", insight: "Catching early signs prevents deeper struggles. We'll help you build emotional tools." },
          { value: "rarely", label: "Rarely or never", icon: "bx-happy", insight: "Amazing! Maintaining mental wellness is still a journey worth investing in." }
        ],
        condition: (a) => a.problemType === 'mental',
        dynamicSubtitle: (a) => {
          if (a.userType === 'child') return "Over the past two weeks, how often has your child felt down, hopeless, or lost interest in things they once enjoyed?";
          if (a.userType === 'other') return "Over the past two weeks, how often have they felt down, hopeless, or lost interest in things they once enjoyed?";
          return "Over the past two weeks, how often have you felt down, hopeless, or lost interest in things you once enjoyed?";
        }
      },
      {
        id: "money_management",
        title: "Money Management & Impulsivity",
        subtitle: "How would you describe your financial decision-making and impulse control?",
        type: "single",
        options: [
          { value: "impulsive", label: "I often make impulsive purchases", icon: "bx-shopping-bag", insight: "Impulse spending is common in ADHD, bipolar, and anxiety. Therapy can rebuild financial habits." },
          { value: "struggle", label: "I struggle to track or budget money", icon: "bx-wallet", insight: "Money management requires executive function — we can help strengthen those skills." },
          { value: "moderate", label: "Could be better, but I manage", icon: "bx-line-chart", insight: "Even small improvements in financial habits reduce daily stress and anxiety." },
          { value: "confident", label: "I feel in control", icon: "bx-trophy", insight: "That's a strength! You can still grow by aligning finances with long-term peace." }
        ],
        condition: (a) => (a.problemType === 'mental' || a.problemType === 'behavioural') && a.userType !== 'child',
        dynamicSubtitle: (a) => {
          if (a.userType === 'other') return "How would you describe their financial decision-making and impulse control?";
          return "How would you describe your financial decision-making and impulse control?";
        }
      },
      {
        id: "adhd_autism_screen",
        title: "Neurodivergence & Executive Function",
        subtitle: "Have you ever been diagnosed with or suspected any of the following? (Choose all that apply)",
        type: "multi",
        options: [
          "ADHD (Attention Deficit Hyperactivity Disorder)",
          "Autism Spectrum Disorder",
          "Dyslexia or learning difference",
          "Tourette's or tic disorder",
          "I've never been diagnosed, but I suspect something",
          "None of the above / Not applicable"
        ],
        insightAfter: "Understanding neurodivergence helps us match you with specialists who truly get it.",
        condition: (a) => a.problemType === 'mental' || a.problemType === 'behavioural' || a.userType === 'child',
        dynamicSubtitle: (a) => {
          if (a.userType === 'child') return "Has your child been diagnosed with or shown signs of any of the following? (Choose all that apply)";
          if (a.userType === 'other') return "Have they been diagnosed with or suspected any of the following? (Choose all that apply)";
          return "Have you ever been diagnosed with or suspected any of the following? (Choose all that apply)";
        }
      },
      {
        id: "coping_problem_solving",
        title: "Coping Skills & Problem Solving",
        subtitle: "When facing a difficult situation, how do you typically respond?",
        type: "single",
        options: [
          { value: "overwhelmed", label: "I feel stuck or shut down", icon: "bx-lock-alt", insight: "Freeze responses are common in anxiety and trauma. We teach small, actionable steps." },
          { value: "avoid", label: "I avoid or delay dealing with it", icon: "bx-run", insight: "Avoidance fuels anxiety. Teletherapy builds problem-solving skills incrementally." },
          { value: "struggle", label: "I try, but often feel frustrated", icon: "bx-confused", insight: "Frustration is normal — we'll strengthen cognitive flexibility and coping." },
          { value: "confident", label: "I usually find a solution", icon: "bx-bulb", insight: "Great foundation! We can still refine emotional regulation under stress." }
        ],
        condition: (a) => a.problemType === 'mental' || a.problemType === 'behavioural',
        dynamicSubtitle: (a) => {
          if (a.userType === 'child') return "When your child faces a difficult situation, how do they typically respond?";
          if (a.userType === 'other') return "When they face a difficult situation, how do they typically respond?";
          return "When facing a difficult situation, how do you typically respond?";
        }
      },
      {
        id: "social_judgement",
        title: "Social Situations & Judgment",
        subtitle: "Do you find it hard to read social cues, maintain conversations, or avoid misunderstandings?",
        type: "single",
        options: [
          { value: "very_hard", label: "Yes, often leads to conflict or isolation", icon: "bx-group", insight: "Social cognition challenges are common in autism, ADHD, and social anxiety — we offer specialized coaching." },
          { value: "sometimes", label: "Occasionally, especially with new people", icon: "bx-conversation", insight: "Role-playing and structured therapy improve social confidence dramatically." },
          { value: "mild", label: "Slight difficulty, but I manage", icon: "bx-smile", insight: "Even small tweaks in communication reduce daily friction and boost self-esteem." },
          { value: "easy", label: "I navigate social settings easily", icon: "bx-chat", insight: "That's a strength! Still, everyone benefits from stress management tools." }
        ],
        condition: (a) => a.problemType === 'mental' || a.problemType === 'behavioural' || a.userType === 'child',
        dynamicSubtitle: (a) => {
          if (a.userType === 'child') return "Does your child find it hard to read social cues, maintain conversations, or avoid misunderstandings?";
          if (a.userType === 'other') return "Do they find it hard to read social cues, maintain conversations, or avoid misunderstandings?";
          return "Do you find it hard to read social cues, maintain conversations, or avoid misunderstandings?";
        }
      },
      {
        id: "daily_function",
        title: "Daily Functioning & Independence",
        subtitle: "How much do cognitive or emotional challenges affect your daily routine (work, chores, self-care)?",
        type: "single",
        options: [
          { value: "severe", label: "Major impact — I need support", icon: "bx-heart", insight: "You're taking a brave step. Our multidisciplinary team specializes in autism, dementia, and severe anxiety." },
          { value: "moderate", label: "Moderate impact, but I push through", icon: "bx-walk", insight: "Pushing through alone is exhausting. We provide structure and accountability." },
          { value: "mild", label: "Mild — I mostly manage", icon: "bx-check-shield", insight: "Preventive coaching keeps small issues from becoming crises." },
          { value: "minimal", label: "Minimal impact", icon: "bx-medal", insight: "Awesome! We'll help you stay resilient for the long haul." }
        ],
        condition: (a) => a.problemType === 'mental' || a.problemType === 'behavioural',
        dynamicSubtitle: (a) => {
          if (a.userType === 'child') return "How much do these challenges affect your child's daily routine (school, chores, self-care)?";
          if (a.userType === 'other') return "How much do these challenges affect their daily routine (work, chores, self-care)?";
          return "How much do cognitive or emotional challenges affect your daily routine (work, chores, self-care)?";
        }
      },
      {
        id: "conditions_list",
        title: "Which of these resonate with you?",
        subtitle: "Select any that apply — this helps us personalize your therapist match",
        type: "multi",
        options: [
          "Anxiety Disorder (GAD, Panic, Social Anxiety)",
          "ADHD (Inattentive or Hyperactive type)",
          "Autism Spectrum (including Asperger's)",
          "Depression (Persistent or Major Depressive Disorder)",
          "Body Dysmorphic Disorder (BDD)",
          "Dementia or Mild Cognitive Impairment (MCI)",
          "Obsessive-Compulsive Disorder (OCD)",
          "Bipolar Disorder",
          "PTSD or Trauma",
          "I'm not sure — I need an assessment"
        ],
        condition: (a) => a.problemType === 'mental' || a.problemType === 'behavioural',
        dynamicTitle: (a) => {
          if (a.userType === 'child') return "Which of these apply to your child?";
          if (a.userType === 'other') return "Which of these apply to them?";
          return "Which of these resonate with you?";
        }
      },
      {
        id: "therapist_approach",
        title: "Your preferred support style",
        subtitle: "We'll match you with a therapist who fits your needs",
        type: "single",
        options: [
          { value: "structured", label: "Structured exercises & homework", icon: "bx-task", insight: "Great for ADHD, executive dysfunction, and goal-oriented clients." },
          { value: "compassionate", label: "Gentle, talk-based & emotional support", icon: "bx-hands", insight: "Ideal for depression, anxiety, and trauma recovery." },
          { value: "practical", label: "Practical life skills (budgeting, routines)", icon: "bx-wrench", insight: "Perfect for building independence in autism, dementia, or cognitive challenges." },
          { value: "mixed", label: "A mix of everything", icon: "bx-layer", insight: "We'll tailor an integrated plan just for you." }
        ],
        condition: (a) => a.problemType !== 'physical',
        dynamicSubtitle: (a) => {
          if (a.userType === 'child') return "We'll match your child with a therapist who fits their needs";
          if (a.userType === 'other') return "We'll match them with a therapist who fits their needs";
          return "We'll match you with a therapist who fits your needs";
        }
      },
    
      // ---- CHILD-SPECIFIC STEPS (only when userType === 'child') ----
      {
        id: "child_development",
        title: "Developmental Milestones",
        subtitle: "Does your child show age‑appropriate speech, motor, and social skills?",
        type: "single",
        options: [
          { value: "delayed", label: "Significant delays in one or more areas", icon: "bx-hourglass", insight: "Early intervention makes a huge difference. Our pediatric therapists specialise in developmental support." },
          { value: "some", label: "Mild delays or uneven skills", icon: "bx-line-chart", insight: "Targeted therapy can bridge gaps quickly." },
          { value: "typical", label: "On track for their age", icon: "bx-check-circle", insight: "Great! We'll help you maintain progress and address any behavioural concerns." }
        ],
        condition: (a) => a.userType === 'child',
      },
      {
        id: "child_behavior",
        title: "Behaviour & Emotional Regulation",
        subtitle: "How often does your child experience tantrums, meltdowns, or difficulty following directions?",
        type: "single",
        options: [
          { value: "daily", label: "Daily or multiple times a day", icon: "bx-cloud-rain", insight: "Frequent outbursts often respond well to parent training and child‑centered therapy." },
          { value: "often", label: "Several times a week", icon: "bx-calendar-week", insight: "Consistent challenges with emotions can be improved with structured behavioural strategies." },
          { value: "sometimes", label: "Occasionally", icon: "bx-time", insight: "Even mild regulation issues can benefit from early coaching." },
          { value: "rarely", label: "Rarely", icon: "bx-smile", insight: "That's great! We'll focus on social skills and resilience." }
        ],
        condition: (a) => a.userType === 'child',
      },
      {
        id: "child_autism_screen",
        title: "Social Communication & Repetitive Behaviours",
        subtitle: "Does your child avoid eye contact, have trouble with back‑and‑forth conversation, or show repetitive movements (hand‑flapping, spinning)?",
        type: "single",
        options: [
          { value: "yes_several", label: "Yes, several of these are noticeable", icon: "bx-brain", insight: "These can be early signs of autism – we offer comprehensive diagnostic support and therapy." },
          { value: "yes_some", label: "Yes, a few behaviors", icon: "bx-conversation", insight: "Many children benefit from social skills groups and occupational therapy." },
          { value: "no", label: "No, not really", icon: "bx-check-circle", insight: "That's reassuring. We'll focus on other areas like attention or anxiety." }
        ],
        condition: (a) => a.userType === 'child',
      },
    
      // ---- PHYSICAL TRACK STEPS (only when problemType === 'physical') ----
      {
        id: "physical_pain",
        title: "Pain & Discomfort",
        subtitle: "How often does pain interfere with your daily activities?",
        type: "single",
        options: [
          { value: "constant", label: "Constant or daily", icon: "bx-frustrated", insight: "Chronic pain is exhausting – we integrate physical therapy with cognitive techniques." },
          { value: "frequent", label: "Several times a week", icon: "bx-calendar-week", insight: "Pain reprocessing therapy can reduce its impact on your life." },
          { value: "occasional", label: "Occasionally", icon: "bx-time", insight: "Early management prevents long‑term limitation." },
          { value: "rare", label: "Rarely or never", icon: "bx-run", insight: "That's good – we'll focus on maintaining mobility." }
        ],
        condition: (a) => a.problemType === 'physical',
        dynamicSubtitle: (a) => {
          if (a.userType === 'other') return "How often does pain interfere with their daily activities?";
          return "How often does pain interfere with your daily activities?";
        }
      },
      {
        id: "physical_mobility",
        title: "Mobility & Independence",
        subtitle: "Do you have difficulty walking, climbing stairs, or performing self‑care tasks?",
        type: "single",
        options: [
          { value: "severe", label: "Yes, major difficulty", icon: "bx-walk", insight: "Our physical therapists and occupational therapists can create a home‑based plan." },
          { value: "moderate", label: "Some difficulty", icon: "bx-line-chart", insight: "Strength and balance exercises can dramatically improve independence." },
          { value: "mild", label: "Mild difficulty", icon: "bx-check-shield", insight: "Preventive exercises keep you moving confidently." },
          { value: "none", label: "No difficulty", icon: "bx-medal", insight: "We'll focus on pain management and injury prevention." }
        ],
        condition: (a) => a.problemType === 'physical',
        dynamicSubtitle: (a) => {
          if (a.userType === 'other') return "Do they have difficulty walking, climbing stairs, or performing self‑care tasks?";
          return "Do you have difficulty walking, climbing stairs, or performing self‑care tasks?";
        }
      },
      {
        id: "physical_injury",
        title: "Injury or Surgery History",
        subtitle: "Have you had a recent injury, surgery, or worsening condition (e.g., arthritis, back pain)?",
        type: "single",
        options: [
          { value: "recent", label: "Yes, within the last 6 months", icon: "bx-band-aid", insight: "Post‑injury rehab is critical – we coordinate with your care team." },
          { value: "chronic", label: "Yes, a long‑term condition", icon: "bx-heart", insight: "We specialise in chronic pain management using evidence‑based psychology and movement." },
          { value: "no", label: "No major injuries or conditions", icon: "bx-check-circle", insight: "We'll help you stay active and pain‑free." }
        ],
        condition: (a) => a.problemType === 'physical',
        dynamicSubtitle: (a) => {
          if (a.userType === 'other') return "Have they had a recent injury, surgery, or worsening condition?";
          return "Have you had a recent injury, surgery, or worsening condition?";
        }
      },
        // ---- COMMUNICATION TRACK ----
        {
            id: "communication_main",
            title: "Speech, language & swallowing",
            subtitle: "What best describes the main difficulty?",
            type: "single",
            options: [
                { value: "speech", label: "Speech is unclear or hard to understand", icon: "bx-microphone" },
                { value: "language", label: "Finding or understanding words", icon: "bx-message-rounded-dots" },
                { value: "stammer", label: "Stammering / stuttering", icon: "bx-repeat" },
                { value: "swallow", label: "Swallowing, eating or drinking", icon: "bx-bowl-hot" },
                { value: "late", label: "Late talking (child)", icon: "bx-child" }
            ],
            condition: (a) => a.problemType === 'communication'
        },
        {
            id: "communication_cause",
            title: "When did it start?",
            subtitle: "This helps us choose the right speech and language therapist.",
            type: "single",
            options: [
                { value: "birth", label: "Since early childhood", icon: "bx-baby-carriage" },
                { value: "stroke", label: "After a stroke or head injury", icon: "bx-brain" },
                { value: "gradual", label: "Gradually over time", icon: "bx-trending-down" },
                { value: "unsure", label: "Not sure", icon: "bx-help-circle" }
            ],
            condition: (a) => a.problemType === 'communication'
        }
    ];

    const CONCERNS = [
        { value: 'physical', label: 'Movement, pain or injury', icon: 'bx-body', service: 'Physiotherapy & rehab' },
        { value: 'communication', label: 'Speech, language or swallowing', icon: 'bx-message-rounded-dots', service: 'Speech & language therapy' },
        { value: 'behavioural', label: 'Behaviour, autism or development', icon: 'bx-happy-alt', service: 'Behaviour therapy' },
        { value: 'mental', label: 'Mood, anxiety, focus or memory', icon: 'bx-brain', service: 'Mental health counselling' }
    ];
    const WHO = [
        { value: 'self', label: 'Myself', icon: 'bx-user' },
        { value: 'child', label: 'My child', icon: 'bx-child' },
        { value: 'other', label: 'Someone else', icon: 'bx-group' }
    ];

    const host = $('#intake');
    const answers = RV.store.get('rv-intake', {}) || {};
    let index = 0;
    const save = () => RV.store.set('rv-intake', answers);

    const visible = () => [{ id: 'start' }, ...QUESTIONS.filter(q => { try { return q.condition(answers); } catch (e) { return false; } }), { id: 'finish' }];
    const text = (q, key) => (q['dynamic' + key[0].toUpperCase() + key.slice(1)] ? q['dynamic' + key[0].toUpperCase() + key.slice(1)](answers) : q[key]) || '';
    const optionValue = o => (typeof o === 'string' ? o : o.value);
    const optionLabel = o => (typeof o === 'string' ? o : o.label);

    function progress(steps) {
        return `<div class="steps-bar" aria-hidden="true">${steps.map((_, i) => `<i class="${i <= index ? 'on' : ''}"></i>`).join('')}</div>
            <p class="muted mb-0">Step ${index + 1} of ${steps.length}</p>`;
    }

    function render() {
        const steps = visible();
        if (index >= steps.length) index = steps.length - 1;
        const step = steps[index];
        let html = progress(steps);

        if (step.id === 'start') {
            html += `
                <h2 class="mt-2">Who is this for?</h2>
                <div class="options" data-group="userType">${WHO.map(w => `<label><input type="radio" name="userType" value="${w.value}" ${answers.userType === w.value ? 'checked' : ''}><span><i class='bx ${w.icon}'></i>${w.label}</span></label>`).join('')}</div>
                <label class="field mt-2" style="max-width:200px"><span>Age <em>(optional)</em></span><input class="input" name="age" type="number" min="0" max="120" value="${esc(answers.age || '')}"></label>
                <h3 class="mt-3">What is the main concern?</h3>
                <div class="options" data-group="problemType">${CONCERNS.map(c => `<label><input type="radio" name="problemType" value="${c.value}" ${answers.problemType === c.value ? 'checked' : ''}><span><i class='bx ${c.icon}'></i>${c.label}</span></label>`).join('')}</div>`;
        } else if (step.id === 'finish') {
            html += finishHTML();
        } else {
            const multi = step.type === 'multi';
            const current = answers[step.id];
            html += `<h2 class="mt-2">${esc(text(step, 'title'))}</h2><p class="lead">${esc(text(step, 'subtitle'))}</p>
                <div class="${multi ? 'checks' : 'options'}">${step.options.map(o => {
                    const v = optionValue(o);
                    const on = multi ? (current || []).includes(v) : current === v;
                    return multi
                        ? `<label><input type="checkbox" name="${step.id}" value="${esc(v)}" ${on ? 'checked' : ''}> ${esc(optionLabel(o))}</label>`
                        : `<label><input type="radio" name="${step.id}" value="${esc(v)}" ${on ? 'checked' : ''}><span>${o.icon ? `<i class='bx ${esc(o.icon)}'></i>` : ''}${esc(optionLabel(o))}</span></label>`;
                }).join('')}</div>
                <div id="insight" class="notice mt-2" hidden><i class='bx bx-info-circle'></i><span></span></div>`;
        }
        html += `<div class="form-msg error mt-2" hidden></div>
            <div class="form-actions">
                ${index > 0 ? `<button type="button" class="btn" data-back><i class='bx bx-chevron-left'></i> Back</button>` : ''}
                <button type="button" class="btn btn-primary" data-next>${step.id === 'finish' ? "<i class='bx bx-send'></i> Send to the care team" : "Continue <i class='bx bx-right-arrow-alt'></i>"}</button>
            </div>`;
        host.innerHTML = html;
        showInsight(step);
    }

    function showInsight(step) {
        const box = $('#insight');
        if (!box || step.type !== 'single') return;
        const o = step.options.find(x => optionValue(x) === answers[step.id]);
        box.hidden = !(o && o.insight);
        if (o && o.insight) box.querySelector('span').textContent = o.insight;
    }

    function finishHTML() {
        const p = (RV.state && RV.state.profile) || {};
        return `
            <h2 class="mt-2">Almost done — how can we reach you?</h2>
            <p class="lead">Our clinical team reviews your answers and matches you with the right specialist. There is no charge for the intake.</p>
            <div class="form-grid">
                <label class="field"><span>Full name *</span><input name="name" maxlength="120" value="${esc(answers.name || p.name || '')}"></label>
                <label class="field"><span>Phone / WhatsApp *</span><input name="phone" type="tel" maxlength="40" value="${esc(answers.phone || p.phone || '')}"></label>
                <label class="field"><span>Preferred way to be seen</span><select name="mode">${RV.optionList([{ value: 'tele', label: 'Online (video)' }, { value: 'home', label: 'Home visit' }, { value: 'clinic', label: 'In clinic' }], answers.mode || 'tele')}</select></label>
                <label class="field"><span>City / country</span><input name="location" maxlength="300" value="${esc(answers.location || '')}" placeholder="e.g. Ibadan, Nigeria"></label>
                <label class="field full"><span>Anything else? <em>(optional)</em></span><textarea name="notes" rows="3" maxlength="3000">${esc(answers.notes || '')}</textarea></label>
            </div>
            <p class="hint">This intake is not a diagnosis. In an emergency, contact your local emergency services or nearest hospital.</p>`;
    }

    function collect() {
        const steps = visible();
        const step = steps[index];
        const v = RV.formValues(host);
        if (step.id === 'start') {
            if (!v.userType || !v.problemType) return 'Please choose who this is for and the main concern.';
            answers.userType = v.userType; answers.problemType = v.problemType; answers.age = v.age || '';
        } else if (step.id === 'finish') {
            Object.assign(answers, { name: v.name, phone: v.phone, mode: v.mode, location: v.location, notes: v.notes });
            if (!v.name) return 'Please enter your name.';
            if (RV.digits(v.phone).length < 7) return 'Please enter a phone number we can reach you on.';
        } else if (step.type === 'multi') {
            answers[step.id] = v[step.id] || [];
        } else {
            if (!v[step.id]) return 'Please choose an answer (or go back).';
            answers[step.id] = v[step.id];
        }
        save();
        return '';
    }

    async function submit(btn) {
        try {
            await RV.requireAuth('Sign in or create a free account so our care team can follow up and you can track your request.');
        } catch (e) { return 'Please sign in to send your intake.'; }
        const u = RV.state.user;
        const intake = {};
        const label = (q, v) => { const o = (q.options || []).find(x => optionValue(x) === v); return o ? optionLabel(o) : v; };
        intake.for = (WHO.find(w => w.value === answers.userType) || {}).label || '';
        if (answers.age) intake.age = String(answers.age);
        intake.concern = (CONCERNS.find(c => c.value === answers.problemType) || {}).label || '';
        QUESTIONS.forEach(q => {
            const a = answers[q.id];
            if (a == null || a === '' || (Array.isArray(a) && !a.length)) return;
            if (!visible().some(s => s.id === q.id)) return;
            intake[q.id] = (Array.isArray(a) ? a.map(x => label(q, x)).join('; ') : label(q, a)).slice(0, 600);
        });
        const types = { tele: 'teletherapy', home: 'home-visit', clinic: 'clinic' };
        const booking = {
            userId: u.uid, userEmail: u.email || '', type: 'intake',
            service: (CONCERNS.find(c => c.value === answers.problemType) || {}).service || 'Not sure — help me choose',
            audience: intake.for, name: answers.name, phone: answers.phone,
            notes: [`Preferred: ${types[answers.mode] || 'teletherapy'}`, answers.notes].filter(Boolean).join(' — ').slice(0, 3000),
            location: answers.location || '', intake, status: 'new', createdAt: RV.fb.TIMESTAMP
        };
        RV.busy(btn, true, 'Sending…');
        try {
            const ref = await RV.fb.db.ref('bookings').push(booking);
            const cfg = await RV.config();
            const refNo = ref.key.slice(-6).toUpperCase();
            RV.store.set('rv-intake', {});
            host.innerHTML = `
                <div class="center stack">
                    <i class='bx bx-check-circle' style="font-size:3.5rem;color:var(--success)"></i>
                    <h2>Thank you — intake #${esc(refNo)} received</h2>
                    <p class="muted">Our clinical team will review your answers and contact you on ${esc(answers.phone)} to match you with the right specialist.</p>
                    <div class="row" style="justify-content:center">
                        <a class="btn btn-whatsapp" href="${esc(RV.waLink(cfg.whatsapp, `Hello RehabVerve! I just completed intake #${refNo}.`))}" target="_blank" rel="noopener"><i class='bx bxl-whatsapp'></i> Message us</a>
                        <a class="btn btn-primary" href="#/settings/bookings">My bookings</a>
                    </div>
                </div>`;
            return '';
        } catch (err) {
            RV.busy(btn, false);
            return RV.errorMessage(err);
        }
    }

    const wrap = host; // the intake container is a <form>
    host.addEventListener('submit', e => e.preventDefault());
    host.addEventListener('change', e => {
        const steps = visible();
        const step = steps[index];
        if (step.type === 'single' && e.target.name === step.id) { answers[step.id] = e.target.value; showInsight(step); }
    });
    host.addEventListener('click', async e => {
        const msg = () => host.querySelector('.form-msg');
        if (e.target.closest('[data-back]')) { collectSoft(); index = Math.max(0, index - 1); render(); return; }
        const next = e.target.closest('[data-next]');
        if (!next) return;
        const err = collect();
        if (err) { msg().textContent = err; msg().hidden = false; return; }
        const steps = visible();
        if (steps[index].id === 'finish') {
            const failure = await submit(next);
            if (failure && msg()) { msg().textContent = failure; msg().hidden = false; }
            return;
        }
        index += 1;
        render();
        host.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    function collectSoft() { const steps = visible(); const s = steps[index]; if (s.type === 'multi') answers[s.id] = RV.formValues(wrap)[s.id] || []; save(); }

    render();
})();
