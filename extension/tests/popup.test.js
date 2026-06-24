const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");

function runPopup(responses) {
    const elements = {
        dot: { className: "" },
        "status-text": { textContent: "" },
        "path-list": { innerHTML: "" },
    };
    const context = {
        document: { getElementById: (id) => elements[id] },
        chrome: {
            runtime: {
                sendMessage(message, callback) {
                    callback(responses[message.action]);
                },
            },
        },
    };
    vm.runInNewContext(readFileSync("extension/popup.js", "utf8"), context);
    return elements;
}

test("popup shows service online and configured paths", () => {
    const elements = runPopup({
        ping: { online: true },
        get_config: { success: true, config: { save_paths: ["/vault/md"] } },
    });
    assert.equal(elements.dot.className, "dot online");
    assert.equal(elements["status-text"].textContent, "服务运行中");
    assert.match(elements["path-list"].innerHTML, /\/vault\/md/);
});

test("popup shows service offline and config error", () => {
    const elements = runPopup({ ping: { online: false }, get_config: { success: false } });
    assert.equal(elements.dot.className, "dot offline");
    assert.equal(elements["status-text"].textContent, "服务未启动");
    assert.match(elements["path-list"].innerHTML, /无法读取配置/);
});
