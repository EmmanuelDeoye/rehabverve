'use strict';

// Shared access to the AI model (DeepSeek, OpenAI-compatible chat API).
// The API key is read on the server from /tokens/deepseek/api_key. The database rules deny
// every browser read of /tokens, so the key never leaves Google's servers.

const { HttpsError } = require('firebase-functions/v2/https');
const { defineString } = require('firebase-functions/params');
const { getDatabase } = require('firebase-admin/database');

const AI_ENDPOINT = defineString('AI_ENDPOINT', { default: 'https://api.deepseek.com' });
const AI_MODEL = defineString('AI_MODEL', { default: 'deepseek-chat' });
const KEY_PATH = 'tokens/deepseek/api_key';

const clean = (value, max) => String(value == null ? '' : value)
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ')
    .slice(0, max)
    .trim();

const today = () => new Date().toISOString().slice(0, 10);

let cachedKey = { value: '', at: 0 };
async function apiKey() {
    if (cachedKey.value && Date.now() - cachedKey.at < 10 * 60 * 1000) return cachedKey.value;
    const raw = (await getDatabase().ref(KEY_PATH).get()).val();
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) {
        console.error(`No AI key at /${KEY_PATH}`);
        throw new HttpsError('failed-precondition', 'The AI service is not set up yet.');
    }
    cachedKey = { value, at: Date.now() };
    return value;
}

// Sends a chat to the model and returns its text answer.
async function callAI(messages, { temperature = 0.5, json = false, maxTokens = 0, timeoutMs = 100000 } = {}) {
    const key = await apiKey();
    const body = { model: AI_MODEL.value(), messages, temperature };
    if (json) body.response_format = { type: 'json_object' };
    if (maxTokens) body.max_tokens = maxTokens;
    let response;
    try {
        response = await fetch(`${AI_ENDPOINT.value().replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(timeoutMs)
        });
    } catch (err) {
        console.error('AI request failed', err);
        throw new HttpsError('unavailable', 'The AI service is not reachable right now. Please try again.');
    }
    if (!response.ok) {
        // A rejected key is re-read next time, so a replaced key works without a redeploy
        if (response.status === 401 || response.status === 403) cachedKey = { value: '', at: 0 };
        console.error('AI service error', response.status, (await response.text().catch(() => '')).slice(0, 500));
        throw new HttpsError('unavailable', 'The AI service is busy right now. Please try again in a minute.');
    }
    const data = await response.json().catch(() => null);
    const text = String((data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '').trim();
    if (!text) throw new HttpsError('internal', 'The AI service returned an empty answer.');
    return text;
}

// Counts one use against a daily limit; false when the limit is reached.
async function useQuota(path, limit) {
    const result = await getDatabase().ref(path).transaction(n => ((n || 0) >= limit ? undefined : (n || 0) + 1));
    return result.committed;
}

module.exports = { callAI, clean, today, useQuota };
