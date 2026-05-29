# X2MD v1.1.11

本版修复 X Article 中代码块没有保存到 Markdown 的问题。

## 修复

- GraphQL Article 富文本解析支持 atomic code entity 和 Draft `code-block`，代码内容会保存为 Markdown 代码围栏。
- 页面渲染兜底会识别 X Article 里带“复制到剪贴板”的代码块，避免接口结构变化时丢失代码。
- 增加单元测试覆盖接口代码块和页面代码块两条路径。

## 验证

- `node --check extension/content.js && node --check extension/background.js && node --check extension/options.js && node --check extension/media_helpers.js && node --check extension/article_markdown.js`
- `python3 -m unittest discover -s tests -v`
- `node --test extension/tests/*.test.js`
