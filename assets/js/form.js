// assets/js/form.js - Adaptive Teletherapy Intake (Fixed Timer & Pronouns)

(function() {
  // ---------- ADAPTIVE STEP DEFINITIONS ----------
  const STEPS = [
    // ---- USER INFO (always first) ----
    {
      id: "user_info",
      title: "Let's get to know you",
      subtitle: "Who is this form for?",
      type: "user_info",
      condition: () => true,
    },

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
      id: "insight_cognitive",
      title: "Did you know?",
      subtitle: "Teletherapy & cognitive rehabilitation",
      type: "insight",
      insightMessage: "🧠 67% of adults with untreated ADHD or anxiety report significant struggles with money management and career stability. The good news: structured online therapy improves executive function in as little as 8 weeks.",
      ctaText: "Show me how",
      nextSkip: true,
      condition: (a) => a.problemType === 'mental' || a.problemType === 'behavioural',
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

    // ---- ALWAYS SHOWN STEPS (final info & pricing) ----
    {
      id: "final_insight",
      title: "Your personalized path forward",
      subtitle: "Based on your responses, you're not alone — millions face similar struggles",
      type: "info_plan",
      highlight: "🧩 Our teletherapy clients see 68% improvement in attention, coping, and financial habits within 12 weeks.",
      toolsPreview: "✓ ADHD-friendly planners · ✓ Anxiety coping kits · ✓ Cognitive rehab exercises · ✓ Money management coaching · ✓ Family support sessions",
      condition: () => true,
    },
    {
      id: "pricing",
      title: "Your teletherapy plan is ready",
      subtitle: "Special discount reserved for you — secure your spot today",
      type: "pricing",
      plans: [
        { name: "Starter Session", save: "30%", oldPrice: "45.00", price: "31.50", perDay: "31.50/session", popular: false, desc: "Single 50-min session + initial assessment" },
        { name: "Monthly Core Plan", save: "83%", oldPrice: "59.99", price: "9.99", perDay: "0.33", popular: true, desc: "4 weekly sessions · Cognitive tools · Progress tracking" },
        { name: "Intensive 12-Week", save: "71%", oldPrice: "125.99", price: "43.99", perDay: "0.41", popular: false, desc: "12 sessions · Full cognitive rehab · Priority scheduling" }
      ],
      condition: () => true,
    }
  ];

  // ---------- GLOBAL STATE ----------
  let answers = {};
  let visibleStepsCache = [];
  let visibleIndex = 0;
  let discountSeconds = 900;      // 15 minutes urgency
  let priceTimerInterval = null;   // timer for pricing step only

  // DOM elements
  const stepsContainer = document.getElementById('stepsContainer');
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');
  const progressFill = document.querySelector('.step-progress-bar');
  const stepCounterSpan = document.getElementById('stepCounter');
  const globalTimerSpan = document.getElementById('globalTimerLabel');
  const globalUrgencyBadge = document.getElementById('globalUrgencyBadge');

  // Hide the global timer badge initially (we only show timer on pricing step)
  if (globalUrgencyBadge) globalUrgencyBadge.style.display = 'none';
  if (globalTimerSpan) globalTimerSpan.style.display = 'none';

  // ---------- HELPER: get visible steps ----------
  function getVisibleSteps() {
    return STEPS.filter(step => {
      if (!step.condition) return true;
      return step.condition(answers);
    });
  }

  // ---------- UPDATE PROGRESS BAR & COUNTER ----------
  function updateProgress(totalVisible) {
    const percent = ((visibleIndex + 1) / totalVisible) * 100;
    let style = document.querySelector('#progressStyle');
    if (!style) {
      style = document.createElement('style');
      style.id = 'progressStyle';
      document.head.appendChild(style);
    }
    style.textContent = `.step-progress-bar::after { width: ${percent}%; }`;
    if (stepCounterSpan) stepCounterSpan.innerText = `Step ${visibleIndex+1} / ${totalVisible}`;
  }

  // ---------- COUNTDOWN TIMER (only on pricing step) ----------
  function startPricingTimer() {
    // Clear any existing timer
    if (priceTimerInterval) {
      clearInterval(priceTimerInterval);
      priceTimerInterval = null;
    }
    
    // Reset discount seconds to 900 (15 minutes) when entering pricing step
    discountSeconds = 900;
    
    // Function to update the timer display
    const updateTimerDisplay = () => {
      const priceTimer = document.getElementById('priceCountdown');
      if (priceTimer) {
        if (discountSeconds > 0) {
          const mins = Math.floor(discountSeconds / 60);
          const secs = discountSeconds % 60;
          priceTimer.innerHTML = `⏳ Limited therapy slots — discount expires in ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          priceTimer.style.color = '#e67e22';
          priceTimer.style.fontWeight = 'bold';
          priceTimer.style.fontSize = '1.1rem';
          priceTimer.style.textAlign = 'center';
          priceTimer.style.padding = '12px';
          priceTimer.style.backgroundColor = '#fff3e0';
          priceTimer.style.borderRadius = '8px';
          priceTimer.style.marginBottom = '20px';
        } else {
          priceTimer.innerHTML = '❌ Offer expired — but reach out for sliding scale options';
          priceTimer.style.color = '#b91c1c';
          priceTimer.style.backgroundColor = '#fee2e2';
          clearInterval(priceTimerInterval);
          priceTimerInterval = null;
        }
      }
    };
    
    // Start the countdown
    updateTimerDisplay();
    priceTimerInterval = setInterval(() => {
      if (discountSeconds > 0) {
        discountSeconds--;
        updateTimerDisplay();
      } else {
        if (priceTimerInterval) {
          clearInterval(priceTimerInterval);
          priceTimerInterval = null;
        }
      }
    }, 1000);
  }

  function stopPricingTimer() {
    if (priceTimerInterval) {
      clearInterval(priceTimerInterval);
      priceTimerInterval = null;
    }
  }

  // ---------- SHOW INSIGHT BANNER ----------
  function showInsightIfAvailable(stepId, selectedValue) {
    const step = STEPS.find(s => s.id === stepId);
    if (!step || step.type !== 'single') return;
    const opt = step.options.find(o => o.value === selectedValue);
    if (opt && opt.insight) {
      const banner = document.createElement('div');
      banner.className = 'insight-banner dynamic-insight';
      banner.style.marginTop = '12px';
      banner.style.padding = '12px';
      banner.style.backgroundColor = '#eef2ff';
      banner.style.borderLeft = '4px solid #3b82f6';
      banner.style.borderRadius = '8px';
      banner.innerHTML = `<i class='bx bx-info-circle'></i> ${opt.insight}`;
      const container = document.querySelector('.options-grid');
      const existing = document.querySelector('.dynamic-insight');
      if (existing) existing.remove();
      if (container) container.insertAdjacentElement('afterend', banner);
      setTimeout(() => banner.style.opacity = '1', 10);
    }
  }

  // ---------- RENDER CURRENT STEP ----------
  function renderStep() {
    visibleStepsCache = getVisibleSteps();
    if (visibleIndex >= visibleStepsCache.length) visibleIndex = visibleStepsCache.length - 1;
    if (visibleIndex < 0) visibleIndex = 0;
    const step = visibleStepsCache[visibleIndex];
    if (!step) return;

    // Stop pricing timer if we're leaving pricing step
    if (step.id !== 'pricing') {
      stopPricingTimer();
    }

    // Dynamic title/subtitle
    let title = step.title;
    let subtitle = step.subtitle;
    if (step.dynamicTitle && typeof step.dynamicTitle === 'function') {
      title = step.dynamicTitle(answers);
    }
    if (step.dynamicSubtitle && typeof step.dynamicSubtitle === 'function') {
      subtitle = step.dynamicSubtitle(answers);
    }

    let html = `<div class="step-card"><div class="step-title">${title}</div>`;
    if (subtitle) html += `<div class="step-sub">${subtitle}</div>`;

    // ---- STEP TYPE: user_info ----
    if (step.type === 'user_info') {
      const savedUserType = answers.userType || '';
      const savedAge = answers.age || '';
      const savedProblem = answers.problemType || '';
      html += `
        <div class="options-grid" id="userTypeGroup">
          <div class="option-btn ${savedUserType === 'self' ? 'selected' : ''}" data-type="self">🙋 Myself</div>
          <div class="option-btn ${savedUserType === 'child' ? 'selected' : ''}" data-type="child">👶 My child</div>
          <div class="option-btn ${savedUserType === 'other' ? 'selected' : ''}" data-type="other">👥 Someone else</div>
        </div>
        <div style="margin-top: 1rem;">
          <label>Age (optional):</label>
          <input type="number" id="userAge" placeholder="e.g., 32 or 7" value="${savedAge}" style="width:100%; padding:0.5rem; margin-top:0.25rem; border:1px solid #ddd; border-radius:8px;">
        </div>
        <div style="margin-top: 1rem;">
          <label>Primary concern type:</label>
          <div class="options-grid" id="problemTypeGroup" style="margin-top:0.5rem;">
            <div class="option-btn ${savedProblem === 'mental' ? 'selected' : ''}" data-problem="mental">🧠 Mental (anxiety, depression, ADHD)</div>
            <div class="option-btn ${savedProblem === 'behavioural' ? 'selected' : ''}" data-problem="behavioural">🎯 Behavioural (habits, impulsivity, autism)</div>
            <div class="option-btn ${savedProblem === 'physical' ? 'selected' : ''}" data-problem="physical">💪 Physical (pain, mobility, injury)</div>
          </div>
        </div>
        <button class="btn-next" id="saveUserInfoBtn" style="width:100%; margin-top:1.5rem;">Continue →</button>
      `;
      stepsContainer.innerHTML = html;

      const userTypeBtns = document.querySelectorAll('#userTypeGroup .option-btn');
      const problemBtns = document.querySelectorAll('#problemTypeGroup .option-btn');
      userTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          userTypeBtns.forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          answers.userType = btn.dataset.type;
          saveAnswersToLocal();
        });
      });
      problemBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          problemBtns.forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          answers.problemType = btn.dataset.problem;
          saveAnswersToLocal();
        });
      });
      const ageInput = document.getElementById('userAge');
      if (ageInput) {
        ageInput.addEventListener('input', (e) => {
          answers.age = e.target.value ? parseInt(e.target.value) : '';
          saveAnswersToLocal();
        });
      }
      const saveBtn = document.getElementById('saveUserInfoBtn');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          if (!answers.userType) { alert("Please select who this form is for."); return; }
          if (!answers.problemType) { alert("Please select the primary concern type."); return; }
          goToNextStep();
        });
      }
      updateProgress(visibleStepsCache.length);
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      return;
    }

    // ---- STANDARD STEP TYPES ----
    if (step.type === 'single') {
      html += `<div class="options-grid" id="optionsGrid">`;
      step.options.forEach(opt => {
        const isSelected = answers[step.id] === opt.value;
        html += `<div class="option-btn ${isSelected ? 'selected' : ''}" data-value="${opt.value}" data-insight="${opt.insight || ''}">
          <i class='bx ${opt.icon || 'bx-checkbox'}'></i> ${opt.label}
        </div>`;
      });
      html += `</div>`;
    } 
    else if (step.type === 'multi') {
      const selectedArr = answers[step.id] || [];
      html += `<div class="checkbox-group" id="multiGroup">`;
      step.options.forEach(opt => {
        const isChecked = selectedArr.includes(opt);
        html += `<label class="checkbox-item ${isChecked ? 'selected' : ''}">
          <input type="checkbox" value="${opt.replace(/"/g, '&quot;')}" ${isChecked ? 'checked' : ''}>
          <span>${opt}</span>
        </label>`;
      });
      html += `</div>`;
      if (step.insightAfter) html += `<div class="insight-banner" style="margin-top:16px;"><i class='bx bx-heart-circle'></i> ${step.insightAfter}</div>`;
    }
    else if (step.type === 'insight') {
      html += `<div class="insight-banner" style="background:#eef2ff; border-left-color:#3b82f6; padding:16px; border-radius:8px;"><i class='bx bx-brain'></i> ${step.insightMessage}</div>`;
      html += `<button class="btn-next" id="insightContinueBtn" style="width:100%; background:#0f7b6e; margin-top:1rem; color:white; padding:12px; border:none; border-radius:8px; cursor:pointer;">${step.ctaText || 'Continue'}</button>`;
    }
    else if (step.type === 'info_plan') {
      html += `<div class="pricing-card-highlight" style="background:#f0f9ff; padding:20px; border-radius:12px; margin:16px 0;">
        <div class="discount-tag" style="background:#0f7b6e; color:white; display:inline-block; padding:4px 12px; border-radius:20px; font-size:0.8rem;">✨ Evidence-Based Teletherapy</div>
        <p style="margin: 0.5rem 0;"><strong>${step.highlight}</strong></p>
        <p>✅ ${step.toolsPreview}</p>
        <div class="testimonial-mini" style="background:#fff; padding:12px; border-radius:8px; margin-top:12px;">
          <i class='bx bxs-quote-left'></i> “After 8 weeks of cognitive teletherapy, my focus improved 70% and I finally feel in control.” — James, ADHD client
        </div>
      </div>`;
      html += `<button class="btn-next" id="infoNextBtn" style="width:100%; margin-top:0.5rem; background:#0f7b6e; color:white; padding:12px; border:none; border-radius:8px; cursor:pointer;">See Plans →</button>`;
    }
    else if (step.type === 'pricing') {
      html += `<div id="priceCountdown" class="countdown-timer" style="text-align:center; padding:12px; background:#fff3e0; border-radius:8px; margin-bottom:20px;">⏳ Loading special offer...</div>`;
      step.plans.forEach(plan => {
        const isPopular = plan.popular;
        html += `<div class="pricing-card-highlight" style="margin-bottom:1rem; padding:16px; border:1px solid #ddd; border-radius:12px; ${isPopular ? 'border:2px solid #0f7b6e; background:#f8fffe;' : 'background:white;'}">
          ${isPopular ? '<div class="discount-tag" style="background:#0f7b6e; color:white; display:inline-block; padding:4px 12px; border-radius:20px; font-size:0.8rem; margin-bottom:10px;">🔥 MOST POPULAR</div>' : `<div class="discount-tag" style="background:#e67e22; color:white; display:inline-block; padding:4px 12px; border-radius:20px; font-size:0.8rem; margin-bottom:10px;">Save ${plan.save}</div>`}
          <div class="price-row"><strong style="font-size:1.2rem;">${plan.name}</strong></div>
          <div class="price-row"><span style="text-decoration:line-through; color:#999;">$${plan.oldPrice}</span> <strong style="font-size:1.5rem; color:#0f7b6e;">$${plan.price}</strong></div>
          <div class="price-row"><span style="font-size:0.9rem; color:#666;">${plan.desc || (plan.perDay ? `Equivalent: $${plan.perDay}` : 'Flexible scheduling')}</span></div>
          <div class="price-row" style="margin:10px 0;">✅ 30-Day Satisfaction Guarantee</div>
          <button class="btn-next select-plan-btn" data-plan="${plan.name}" style="width:100%; margin-top:12px; background:#1e2a3e; color:white; padding:12px; border:none; border-radius:8px; cursor:pointer;">Claim My Spot →</button>
        </div>`;
      });
      html += `<div class="testimonial-mini" style="text-align:center; padding:12px; color:#666;">★★★★★ “Finally, therapy that understands my ADHD & anxiety. Life-changing.” — Taylor R.</div>`;
      
      stepsContainer.innerHTML = html;
      
      // Start the countdown timer ONLY on pricing step
      startPricingTimer();
      
      const planBtns = document.querySelectorAll('.select-plan-btn');
      planBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const planName = btn.dataset.plan;
          alert(`✨ You selected ${planName}! You'll be redirected to schedule your first teletherapy session.\nYour discount is locked for ${Math.floor(discountSeconds/60)} minutes.`);
        });
      });
      
      updateProgress(visibleStepsCache.length);
      if (prevBtn) prevBtn.style.display = visibleIndex === 0 ? 'none' : 'flex';
      if (nextBtn) nextBtn.style.display = 'none';
      return;
    }

    stepsContainer.innerHTML = html;

    // Attach event listeners based on step type
    if (step.type === 'single') {
      const options = document.querySelectorAll('.option-btn');
      options.forEach(opt => {
        opt.addEventListener('click', (e) => {
          const val = opt.dataset.value;
          answers[step.id] = val;
          document.querySelectorAll('.option-btn').forEach(el => el.classList.remove('selected'));
          opt.classList.add('selected');
          showInsightIfAvailable(step.id, val);
          saveAnswersToLocal();
        });
        if (answers[step.id] === opt.dataset.value) {
          opt.classList.add('selected');
          showInsightIfAvailable(step.id, answers[step.id]);
        }
      });
    } 
    else if (step.type === 'multi') {
      const checkboxes = document.querySelectorAll('#multiGroup input');
      const updateMulti = () => {
        const selectedVals = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
        answers[step.id] = selectedVals;
        document.querySelectorAll('.checkbox-item').forEach(item => {
          const cb = item.querySelector('input');
          if (cb && cb.checked) item.classList.add('selected');
          else item.classList.remove('selected');
        });
        saveAnswersToLocal();
      };
      checkboxes.forEach(cb => cb.addEventListener('change', updateMulti));
      updateMulti();
    }
    else if (step.type === 'insight') {
      const insightBtn = document.getElementById('insightContinueBtn');
      if (insightBtn) insightBtn.addEventListener('click', () => goToNextStep());
    }
    else if (step.type === 'info_plan') {
      const infoBtn = document.getElementById('infoNextBtn');
      if (infoBtn) infoBtn.addEventListener('click', () => goToNextStep());
    }

    // Update navigation buttons
    if (prevBtn) prevBtn.style.display = visibleIndex === 0 ? 'none' : 'flex';
    if (nextBtn) {
      if (step.type === 'insight' || step.type === 'info_plan') {
        nextBtn.style.display = 'none';
      } else {
        nextBtn.style.display = 'flex';
      }
    }
    updateProgress(visibleStepsCache.length);
  }

  // ---------- NAVIGATION ----------
  function goToNextStep() {
    const currentStep = visibleStepsCache[visibleIndex];
    
    // Validate current step before proceeding
    if (currentStep.type === 'single') {
      const val = answers[currentStep.id];
      if (!val) {
        alert("Please select an option before continuing.");
        return;
      }
    } else if (currentStep.type === 'multi') {
      const selected = answers[currentStep.id];
      if (!selected || selected.length === 0) {
        alert("Please select at least one option before continuing.");
        return;
      }
    }
    
    visibleStepsCache = getVisibleSteps();
    if (visibleIndex + 1 < visibleStepsCache.length) {
      visibleIndex++;
      renderStep();
    } else {
      alert("Thank you! A care coordinator will reach out within 24 hours.");
    }
  }

  function goToPrevStep() {
    if (visibleIndex > 0) {
      visibleIndex--;
      renderStep();
    }
  }

  // ---------- LOCALSTORAGE ----------
  function loadAnswersFromLocal() {
    const saved = localStorage.getItem('rehabverve_teletherapy_answers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.assign(answers, parsed);
      } catch(e) {}
    }
  }
  
  function saveAnswersToLocal() {
    localStorage.setItem('rehabverve_teletherapy_answers', JSON.stringify(answers));
  }

  // ---------- INITIALISE ----------
  function bindNav() {
    if (nextBtn) nextBtn.addEventListener('click', goToNextStep);
    if (prevBtn) prevBtn.addEventListener('click', goToPrevStep);
  }

  loadAnswersFromLocal();
  bindNav();
  visibleStepsCache = getVisibleSteps();
  visibleIndex = 0;
  renderStep();

  // Auto-save every 5 seconds
  setInterval(() => saveAnswersToLocal(), 5000);
})();