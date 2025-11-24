---
excerpt: "Beyond lines of code lies a journey"
permalink: /
layout: homepage       # 使用首页布局
header:			# 页面顶部横幅设置
  color: "#000"

news_row:
  - title: 网站上线
    excerpt: 用于记录学习笔记，发布学术主页。
    date: 2025.10.24
---

<div class="news-section">
  <h2>🏠 首页</h2>
  {% for item in page.news_row %}
    <div class="news-item">
      <strong>{{ item.date }}</strong> - <b>{{ item.title }}</b><br>
      <p>{{ item.excerpt }}</p>
    </div>
  {% endfor %}
</div>

