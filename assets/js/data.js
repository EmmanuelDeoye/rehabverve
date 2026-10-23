// data.js — shared reference lists (disciplines, places, currencies) and site defaults.
(function () {
    'use strict';
    const RV = window.RV = window.RV || {};

    // The rehabilitation team. `match` finds older listings that only have a free-text job title;
    // `legacy` keeps old ?category= links working.
    const CATEGORIES = [
        { value: 'physiotherapy', label: 'Physiotherapist', short: 'Physiotherapy', icon: 'bx-body', match: /physio/i, legacy: ['Physiotherapist'] },
        { value: 'occupational-therapy', label: 'Occupational Therapist', short: 'Occupational therapy', icon: 'bx-brush', match: /occupational/i, legacy: ['Occupational', 'Occupational Therapist'] },
        { value: 'speech-therapy', label: 'Speech & Language Therapist', short: 'Speech therapy', icon: 'bx-message-rounded-dots', match: /speech|language/i, legacy: ['Speech', 'Speech Therapist'] },
        { value: 'psychology', label: 'Psychologist', short: 'Psychology', icon: 'bx-brain', match: /psycholog|counsel/i, legacy: ['Psychologist'] },
        { value: 'behaviour-therapy', label: 'Behaviour Therapist', short: 'Behaviour therapy', icon: 'bx-happy-alt', match: /behavio|aba\b/i, legacy: ['Behavioural'] },
        { value: 'nursing', label: 'Rehabilitation Nurse', short: 'Nursing', icon: 'bx-plus-medical', match: /nurs/i, legacy: ['Nurses'] },
        { value: 'doctor', label: 'Doctor / Rehab Physician', short: 'Doctors', icon: 'bx-first-aid', match: /doctor|physician|physiatr|medical officer|\bdr\b/i, legacy: ['Doctor'] },
        { value: 'prosthetics-orthotics', label: 'Prosthetist & Orthotist', short: 'Prosthetics & orthotics', icon: 'bx-accessibility', match: /prosthe|orthot/i, legacy: ['Prosthesis and Orthosis'] },
        { value: 'audiology', label: 'Audiologist', short: 'Audiology', icon: 'bx-headphone', match: /audiolog|hearing/i, legacy: [] },
        { value: 'special-education', label: 'Special Educator / Tutor', short: 'Special education & tutoring', icon: 'bx-book-reader', match: /special educ|tutor|teacher|educator/i, legacy: [] },
        { value: 'dietetics', label: 'Dietitian / Nutritionist', short: 'Nutrition', icon: 'bx-bowl-hot', match: /dietit|nutrition/i, legacy: [] },
        { value: 'social-work', label: 'Social Worker', short: 'Social work', icon: 'bx-group', match: /social work/i, legacy: [] },
        { value: 'consultant', label: 'Rehabilitation Consultant', short: 'Consultants', icon: 'bx-briefcase-alt', match: /consultant/i, legacy: ['Consultant'] },
        { value: 'pharmacy', label: 'Pharmacist', short: 'Pharmacy', icon: 'bx-capsule', match: /pharmac/i, legacy: ['Pharmacist'] }
    ];

    const CENTER_TYPES = [
        { value: 'Rehabilitation Center', icon: 'bx-plus-medical', match: /rehab/i },
        { value: 'Mobile Rehab Service', icon: 'bx-car', match: /mobile/i },
        { value: 'Hospital / Clinic', icon: 'bx-clinic', match: /hospital|clinic/i },
        { value: 'Home Care', icon: 'bx-home-heart', match: /home/i },
        { value: 'Special School', icon: 'bx-book-reader', match: /school/i },
        { value: 'NGO', icon: 'bx-donate-heart', match: /ngo|non-governmental/i },
        { value: 'Assistive Technology', icon: 'bx-chip', match: /technolog|assistive/i },
        { value: 'Other', icon: 'bx-buildings', match: /^$/ }
    ];

    const COUNTRIES = [
        'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Uganda', 'Tanzania', 'Rwanda', 'Ethiopia', 'Egypt',
        'Morocco', 'Cameroon', "Côte d'Ivoire", 'Senegal', 'Zambia', 'Zimbabwe', 'Botswana', 'Malawi',
        'Sierra Leone', 'Liberia', 'The Gambia', 'Benin', 'Togo', 'Namibia', 'Mozambique', 'Angola',
        'United Kingdom', 'United States', 'Canada', 'Other'
    ];

    const NIGERIA_STATES = [
        'Abia', 'Abuja (FCT)', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
        'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna',
        'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
        'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
    ];

    const CURRENCIES = {
        NGN: '₦', GHS: 'GH₵', KES: 'KSh', ZAR: 'R', UGX: 'USh', TZS: 'TSh', RWF: 'FRw', ETB: 'Br',
        EGP: 'E£', MAD: 'DH', XOF: 'CFA', XAF: 'FCFA', ZMW: 'ZK', USD: '$', GBP: '£', EUR: '€', CAD: 'C$'
    };

    const PRICE_UNITS = { session: 'session', hour: 'hour', visit: 'home visit', day: 'day', week: 'week', month: 'month', term: 'term', package: 'package' };

    const PRO_MODES = { clinic: 'In clinic', home: 'Home visits', tele: 'Teletherapy' };
    const CENTER_MODES = { onsite: 'At the center', home: 'Mobile / home visits', tele: 'Teletherapy' };
    const MODE_ICONS = { clinic: 'bx-clinic', onsite: 'bx-buildings', home: 'bx-car', tele: 'bx-video' };

    const CLASS_SUBJECTS = ['Literacy & reading', 'Numeracy & maths', 'Speech & language', 'Social skills', 'Life skills', 'Sign language', 'Braille', 'Homework support', 'Exam preparation', 'Science', 'Coding', 'Music & arts', 'Other'];
    const AGE_GROUPS = ['Under 5', '5–8 years', '9–12 years', '13–17 years', 'All ages'];

    const DEFAULT_CONFIG = {
        whatsapp: '2348132912880',
        phone: '+234 813 291 2880',
        email: 'rehabverve@gmail.com',
        address: '44, Shonola Street, Ogba, Lagos State, Nigeria',
        social: { facebook: '', instagram: '', x: '', linkedin: '' },
        plans: [
            { id: 'starter', name: 'Starter Session', price: 15000, currency: 'NGN', unit: 'session', note: 'Ideal for first-time clients', features: ['1 assessment + 1 therapy session', 'Personalised therapy plan', 'Secure video session'] },
            { id: 'standard', name: 'Standard Package', price: 48000, currency: 'NGN', unit: 'month', note: '₦12,000 per session', featured: true, features: ['4 sessions per month', 'Progress tracking & follow-up', 'Personalised therapy plan'] },
            { id: 'comprehensive', name: 'Comprehensive Package', price: 135000, currency: 'NGN', unit: 'month', note: '₦11,250 per session', features: ['12 sessions per month (3 a week)', 'Multidisciplinary support', 'Progress reports & priority scheduling'] }
        ]
    };

    function categoryOf(value) {
        if (!value) return null;
        const v = String(value);
        return CATEGORIES.find(c => c.value === v || c.label === v || c.legacy.includes(v)) ||
            CATEGORIES.find(c => c.match.test(v)) || null;
    }

    // Category for a listing: the admin-set category wins, then the job title.
    function listingCategory(p) {
        return categoryOf(p && p.category) || categoryOf(p && p.job) || null;
    }

    function centerTypeOf(value) {
        const v = String(value || '');
        return CENTER_TYPES.find(t => t.value === v) || CENTER_TYPES.find(t => t.match.test(v)) || CENTER_TYPES[CENTER_TYPES.length - 1];
    }

    RV.data = {
        CATEGORIES, CENTER_TYPES, COUNTRIES, NIGERIA_STATES, CURRENCIES, PRICE_UNITS,
        PRO_MODES, CENTER_MODES, MODE_ICONS, CLASS_SUBJECTS, AGE_GROUPS, DEFAULT_CONFIG,
        categoryOf, listingCategory, centerTypeOf
    };
})();
