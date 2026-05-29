# X2MD v1.1.10

本版继续修复 X Article 批量抓取，重点改为优先走 status 对应 GraphQL 数据生成 Markdown，减少后台打开新标签页。

## 修复与改进

- Article URL 会自动转换为对应 `/status/` 作为接口入口。
- 新增 X Article GraphQL 富文本解析，可从接口内容生成 Markdown、原图链接和视频占位。
- 当接口富文本不可用时，才回退到 status/article 页面渲染提取。
- 保存博主文章 Markdown 时继续兜底补齐未内联成功的图片链接，并跳过重复图片。

## 验证

- `node --check extension/content.js && node --check extension/background.js && node --check extension/options.js`
- `python3 -m unittest discover -s tests -v`
- `node --test extension/tests/*.test.js`
