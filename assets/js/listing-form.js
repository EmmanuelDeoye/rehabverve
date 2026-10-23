// listing-form.js — one editor for professional and center listings, used by profile owners and admins.
// Only changed fields are written, so legacy listings stay valid under the database rules.
(function () {
    'use strict';
    const { esc, data: D } = RV;

    const currencyOptions = Object.keys(D.CURRENCIES).map(c => ({ value: c, label: `${D.CURRENCIES[c]} ${c}` }));
    const unitOptions = Object.entries(D.PRICE_UNITS).map(([value, label]) => ({ value, label: 'per ' + label }));

    const location = [
        { k: 'country', label: 'Country', type: 'select', options: ['', ...D.COUNTRIES] },
        { k: 'state', label: 'State / region', list: 'rv-states' },
        { k: 'city', label: 'City / town' }
    ];
    const fees = [
        { k: 'currency', label: 'Currency', type: 'select', options: currencyOptions, def: 'NGN' },
        { k: 'priceUnit', label: 'Charged per', type: 'select', options: unitOptions, def: 'session' },
        { k: 'priceMin', label: 'Lowest fee', type: 'number', hint: 'Leave blank if you prefer “fees on request”' },
        { k: 'priceMax', label: 'Highest fee', type: 'number' }
    ];
    const coverage = [
        { k: 'coverage.states', label: 'States / regions you cover', placeholder: 'e.g. Lagos, Ogun', full: true },
        { k: 'coverage.areas', label: 'Areas / neighbourhoods you cover', placeholder: 'e.g. Ikeja, Yaba, Lekki, Ikorodu', full: true },
        { k: 'coverage.countries', label: 'Other countries you serve', placeholder: 'e.g. Ghana, United Kingdom (online)' },
        { k: 'coverage.nationwide', label: 'I take clients from anywhere online', type: 'checkbox' }
    ];

    const SPECS = {
        pros: [
            { section: 'About' },
            { k: 'name', label: 'Full name', required: true },
            { k: 'job', label: 'Professional title', placeholder: 'e.g. Paediatric physiotherapist' },
            { k: 'category', label: 'Discipline', type: 'select', options: [{ value: '', label: 'Not set' }, ...D.CATEGORIES.map(c => ({ value: c.value, label: c.label }))], admin: true },
            { k: 'experience', label: 'Years of experience', type: 'number' },
            { k: 'education', label: 'Qualifications', placeholder: 'e.g. BMR (PT), MSc Neuro-rehab' },
            { k: 'languages', label: 'Languages', placeholder: 'English, Yoruba, Hausa…' },
            { k: 'availability', label: 'Availability', placeholder: 'e.g. Mon–Sat, 8am–6pm' },
            { k: 'bio', label: 'About you and how you work', type: 'textarea', full: true },
            { section: 'Contact' },
            { k: 'phone', label: 'Phone', type: 'tel' },
            { k: 'whatsapp', label: 'WhatsApp number', type: 'tel', hint: 'With country code, e.g. 2348012345678' },
            { k: 'email', label: 'Public email', type: 'email' },
            { k: 'website', label: 'Website', type: 'url' },
            { section: 'Where you are' }, ...location,
            { section: 'Fees' }, ...fees,
            { section: 'How and where you work' },
            { k: 'serviceModes', label: 'Ways you see clients', type: 'modes', options: D.PRO_MODES, full: true },
            ...coverage
        ],
        centers: [
            { section: 'About' },
            { k: 'centerName', label: 'Center or service name', required: true },
            { k: 'centerType', label: 'Type', type: 'select', options: D.CENTER_TYPES.map(t => t.value) },
            { k: 'operatingHours', label: 'Opening hours', placeholder: 'e.g. Mon–Fri 8am–5pm' },
            { k: 'accreditations', label: 'Accreditations & registrations' },
            { k: 'description', label: 'Services and description', type: 'textarea', full: true },
            { section: 'Contact' },
            { k: 'phone', label: 'Phone', type: 'tel' },
            { k: 'whatsapp', label: 'WhatsApp number', type: 'tel' },
            { k: 'email', label: 'Public email', type: 'email' },
            { k: 'website', label: 'Website', type: 'url' },
            { section: 'Where you are' },
            { k: 'address', label: 'Address', full: true }, ...location,
            { section: 'Fees' }, ...fees,
            { section: 'How and where you work' },
            { k: 'serviceModes', label: 'Services offered', type: 'modes', options: D.CENTER_MODES, full: true },
            ...coverage
        ]
    };
    const ADMIN_SPECS = [
        { section: 'Admin controls' },
        { k: 'verified', label: 'Verified by RehabVerve', type: 'checkbox' },
        { k: 'featured', label: 'Featured on the home page', type: 'checkbox' },
        { k: 'status', label: 'Listing status', type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended (hidden)' }], def: 'active' },
        { k: 'pos', label: 'Sort position (lower shows first)', type: 'number' }
    ];

    const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
    const specsFor = (kind, admin) => SPECS[kind].filter(s => admin || !s.admin).concat(admin ? ADMIN_SPECS : []);

    function fieldHTML(s, data) {
        if (s.section) return `<h4 class="full mt-2 mb-0">${esc(s.section)}</h4>`;
        const v = get(data, s.k);
        const id = 'lf-' + s.k.replace(/\./g, '-');
        const full = s.full ? ' full' : '';
        const hint = s.hint ? `<em>${esc(s.hint)}</em>` : '';
        if (s.type === 'checkbox') {
            return `<label class="check${full}"><input type="checkbox" name="${s.k}" ${v === true ? 'checked' : ''}> ${esc(s.label)}</label>`;
        }
        if (s.type === 'modes') {
            return `<div class="field${full}"><span>${esc(s.label)}</span><div class="checks">${Object.entries(s.options).map(([m, label]) =>
                `<label><input type="checkbox" name="${s.k}.${m}" ${v && v[m] ? 'checked' : ''}> <i class='bx ${D.MODE_ICONS[m]}'></i>${esc(label)}</label>`).join('')}</div></div>`;
        }
        let control;
        const val = v == null ? (s.def || '') : v;
        if (s.type === 'select') {
            // Keep a legacy value that is not in today's list instead of silently replacing it
            const known = s.options.some(o => (typeof o === 'string' ? o : o.value) === String(val));
            const opts = known || val === '' ? s.options : [String(val), ...s.options];
            control = `<select id="${id}" name="${s.k}">${RV.optionList(opts, val)}</select>`;
        }
        else if (s.type === 'textarea') control = `<textarea id="${id}" name="${s.k}" rows="5" maxlength="4000">${esc(val)}</textarea>`;
        else control = `<input id="${id}" name="${s.k}" type="${s.type === 'number' ? 'number' : s.type || 'text'}" value="${esc(val)}"${s.type === 'number' ? ' min="0" step="any"' : ' maxlength="600"'}${s.placeholder ? ` placeholder="${esc(s.placeholder)}"` : ''}${s.list ? ` list="${s.list}"` : ''}${s.required ? ' required' : ''}>`;
        return `<label class="field${full}" for="${id}"><span>${esc(s.label)}${s.required ? ' *' : ''}</span>${control}${hint}</label>`;
    }

    RV.listingFormHTML = (kind, data = {}, { admin = false } = {}) => `
        <div class="form-grid">${specsFor(kind, admin).map(s => fieldHTML(s, data)).join('')}</div>
        <datalist id="rv-states">${D.NIGERIA_STATES.map(s => `<option value="${esc(s)}">`).join('')}</datalist>`;

    // Returns { updates, error } — updates use slash paths for ref.update().
    RV.readListingForm = (form, kind, original = {}, { admin = false } = {}) => {
        const updates = {};
        const set = (path, value) => {
            const before = get(original, path);
            const same = before === value || (before == null && (value === '' || value === null || value === false));
            if (!same) updates[path.replace(/\./g, '/')] = value;
        };
        for (const s of specsFor(kind, admin)) {
            if (s.section) continue;
            if (s.type === 'modes') {
                Object.keys(s.options).forEach(m => {
                    const el = form.elements[`${s.k}.${m}`];
                    set(`${s.k}.${m}`, el && el.checked ? true : null);
                });
                continue;
            }
            const el = form.elements[s.k];
            if (!el) continue;
            if (s.type === 'checkbox') { set(s.k, el.checked); continue; }
            const raw = el.value.trim();
            if (s.required && !raw) return { error: `${s.label} is required.` };
            if (s.type === 'number') {
                const before = get(original, s.k);
                if (raw === '' && typeof before === 'string' && before.trim() && isNaN(Number(before))) continue; // e.g. "5 years"
                const n = raw === '' ? null : Number(raw);
                if (n != null && (!isFinite(n) || n < 0)) return { error: `${s.label} must be a positive number.` };
                set(s.k, n);
            } else if (s.type === 'url') {
                if (raw && !/^https:\/\//i.test(raw)) return { error: 'Website links must start with https://' };
                set(s.k, raw || null);
            } else if (s.type === 'email') {
                if (raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return { error: 'Enter a valid email address.' };
                set(s.k, raw);
            } else {
                set(s.k, raw);
            }
        }
        const lo = Number(form.elements.priceMin && form.elements.priceMin.value) || 0;
        const hi = Number(form.elements.priceMax && form.elements.priceMax.value) || 0;
        if (lo && hi && hi < lo) return { error: 'The highest fee must be more than the lowest fee.' };
        return { updates };
    };
})();
