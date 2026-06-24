(function () {
    async function parseSaveResponse(resp) {
        const json = await resp.json().catch(() => ({}));
        const error = json?.errors?.[0] || json?.error || (!resp.ok ? `HTTP ${resp.status}` : "");
        return {
            success: resp.ok && json.success !== false,
            result: json,
            error: error || undefined,
        };
    }

    globalThis.parseSaveResponse = parseSaveResponse;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { parseSaveResponse };
    }
})();
