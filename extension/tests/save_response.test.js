const test = require("node:test");
const assert = require("node:assert/strict");

const { parseSaveResponse } = require("../save_response.js");

test("parseSaveResponse keeps service error reason on HTTP failure", async () => {
    const response = new Response(JSON.stringify({ success: false, error: "自定义保存路径无效或未在设置中配置" }), { status: 400 });
    const result = await parseSaveResponse(response);
    assert.equal(result.success, false);
    assert.equal(result.error, "自定义保存路径无效或未在设置中配置");
    assert.equal(result.result.error, "自定义保存路径无效或未在设置中配置");
});

test("parseSaveResponse uses first errors item for toast detail", async () => {
    const response = new Response(JSON.stringify({ success: false, errors: ["未配置保存路径"] }), { status: 500 });
    const result = await parseSaveResponse(response);
    assert.equal(result.success, false);
    assert.equal(result.error, "未配置保存路径");
});
