# FreeNode

> 免费公开节点/代理订阅源聚合导航。GitHub Actions 手动触发，PR 审核后部署。

🌐 **网站**：<https://weed33834.github.io/freenode/>
📦 **GitHub**：<https://github.com/weed33834/freenode>
📦 **GitCode**：<https://gitcode.com/badhope/freenode>

## 快速开始

直接打开网站，从首页选 Clash / V2Ray / 代理列表其中一种格式，点击「复制」即可。

## 工作原理

```
config/sources.json → crawler → parser → dedup → verifier → formatter → nodes/
                                                                              ↓
                                                                       site_builder.py
                                                                              ↓
                                                                       docs/_data/*.json
                                                                              ↓
                                                                  GitHub Pages 自动渲染
```

更新机制（手动触发 + PR 流程，避免 bot 污染 main 分支）：
- 用户在 Actions → Manual Update & PR → Run workflow
- 跑完自动创建 PR 到 main（不直接 push）
- owner review 后点 Merge 即触发 Pages 自动部署

无需服务器、数据库、cron。

## 本地运行

```bash
pip install -r requirements.txt
python scripts/update.py --verify    # 跑完整流水线
python scripts/site_builder.py      # 生成网站数据
git add nodes/ docs/_data/ && git commit -m "chore: manual update" && git push
```

或访问网站：<https://weed33834.github.io/freenode/>

## 文档

- [关于项目](https://weed33834.github.io/freenode/about.html)
- [数据源目录](https://weed33834.github.io/freenode/sources.html)
- [协议与客户端指南](https://weed33834.github.io/freenode/guides.html)

## 免责声明

本项目仅供网络协议学习、安全测试与隐私技术研究。所有节点来自第三方公开渠道，我们不拥有、运营或保证它们。请勿用于银行、支付或任何敏感登录。遵守您所在地的法律。

## License

MIT
