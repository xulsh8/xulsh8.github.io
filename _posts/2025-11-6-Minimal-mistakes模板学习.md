---
title: "Minimal-mistakes模板学习"
categories:
  - Website Building
---

## _config.yml文件参数配置

```yaml
remote_theme             : "mmistakes/minimal-mistakes@master"
# theme                  : minimal-mistakes-jekyll

minimal_mistakes_skin    : "dark" 
# "air", "aqua", "contrast", "dark", "dirt", "neon", "mint", "plum", "sunrise"
```

remote_theme是从远程加载主题，而theme是从本地安装的Ruby gem中加载主题，并且后者需要在Gemfile文件中执行gem install minimal-mistakes-jekyll命令。



```yaml
# 网页基本信息设置
locale                   : "en-US"
title                    : "Minimal Mistakes"
title_separator          : "-"
subtitle                 : "A Jekyll theme"
name                     : &name "Michael Rose" # 使用 YAML 锚（&name / &description）来定义可复用的变量（在文件其余地方用 *name / *description 引用）。
description              : &description "A flexible Jekyll theme for your blog or site with a minimalist aesthetic."
url                      : https://mmistakes.github.io # the base hostname & protocol for your site e.g. "https://mmistakes.github.io"
baseurl                  : "/minimal-mistakes" # the subpath of your site, e.g. "/blog"
repository               : "mmistakes/minimal-mistakes"
teaser                   : # path of fallback teaser image, e.g. "/assets/images/500x300.png"
logo                     : # path of logo image to display in the masthead, e.g. "/assets/images/88x88.png"
masthead_title           : # overrides the website title displayed in the masthead, use " " for no title
# breadcrumbs            : false # true, false (default)
words_per_minute         : 200
enable_copy_code_button  : true
```

```yaml
# 用于设置评论系统
comments:
  # 在provider这儿选择评论系统，而之后都是各个系统的设置。
  provider               : "false" # false (default), "disqus", "discourse", "facebook", "staticman_v2", "staticman", "utterances", "giscus", "custom"
  disqus:
    shortname            :
  discourse:
    server               : # https://meta.discourse.org/t/embedding-discourse-comments-via-javascript/31963 , e.g.: meta.discourse.org
  facebook:
    # https://developers.facebook.com/docs/plugins/comments
    appid                :
    num_posts            : # 5 (default)
    colorscheme          : # "light" (default), "dark"
  utterances:
    theme                : # "github-light" (default), "github-dark"
    issue_term           : # "pathname" (default)
  giscus:
    repo_id              : # Shown during giscus setup at https://giscus.app
    category_name        : # Full text name of the category
    category_id          : # Shown during giscus setup at https://giscus.app
    discussion_term      : # "pathname" (default), "url", "title", "og:title"
    reactions_enabled    : # '1' for enabled (default), '0' for disabled
    theme                : # "light" (default), "dark", "dark_dimmed", "transparent_dark", "preferred_color_scheme"
```

```yaml
# 用于设置人机验证(?)
reCaptcha:
  siteKey                : # "6LdRBykTAAAAAFB46MnIu6ixuxwu9W1ihFF8G60Q"
  secret                 : # "PznnZGu3P6eTHRPLORniSq+J61YEf+A9zmColXDM5icqF49gbunH51B8+h+i2IvewpuxtA9TFoK68TuhUp/X3YKmmqhXasegHYabY50fqF9nJh9npWNhvITdkQHeaOqnFXUIwxfiEeUt49Yoa2waRR7a5LdRAP3SVM8hz0KIBT4="
```

```yaml
# 用于设置网页的订阅源(?)
atom_feed:
  path                   : # blank (default) uses feed.xml
```

```yaml
# 用于设置网页的搜索功能
search                   : true # true, false (default)
search_full_content      : true # true, false (default)
search_provider          : algolia # lunr (default), algolia
algolia:
  application_id         : QB6HVGBSBA # YOUR_APPLICATION_ID
  index_name             : minimal_mistakes # YOUR_INDEX_NAME
  search_only_api_key    : 9d5014e5bbc77372547bce778dfa5663 # YOUR_SEARCH_ONLY_API_KEY
  powered_by             : true # true (default), false
  files_to_exclude:
    - _posts/2017-11-28-post-exclude-search.md
```



```yaml
# SEO Related
google_site_verification : "UQj93ERU9zgECodaaXgVpkjrFn9UrDMEzVamacSoQ8Y" # Replace this with your ID, or delete
bing_site_verification   :
naver_site_verification  :
yandex_site_verification :
baidu_site_verification  :
```

用于向各大搜索引擎证明你对网站的所有权。



```yaml
# Social Sharing
twitter:
  username               : &twitter "mmistakes"
facebook:
  username               : &facebook "michaelrose"
  app_id                 :
  publisher              :
og_image                 : "/assets/images/site-logo.png" # Open Graph/Twitter default site image
```

当你的网页在社交平台（Twitter、Facebook 等）被分享时，这些参数控制显示的内容。



```yaml
# For specifying social profiles, used in _includes/seo.html
# - https://developers.google.com/structured-data/customize/social-profiles
social:
  type                   : # Person or Organization (defaults to Person)
  name                   : # If the user or organization name differs from the site's name
  links: # An array of links to social media profiles
    - "https://twitter.com/mmistakes"
    - "https://www.facebook.com/michaelrose"
```

定义网站所属的个人或组织信息；用于生成结构化数据（structured data），帮助搜索引擎识别网站归属，利于 SEO。



```yaml
# Analytics
analytics:
  provider               : "google-universal" # false (default), "google", "google-universal", "google-gtag", "custom"
  google:
    tracking_id          : "UA-2011187-3" # Replace this with your ID, or delete
    anonymize_ip         : true
```

用于网站流量统计和分析。



```yaml
# Site Author
author:
  name             : *name # *name is a YAML reference pointing to the &anchor earlier
  avatar           : "/assets/images/michael-rose.jpg"
  bio              : "Just another *boring*, *tattooed*, *time traveling*, *designer*."
  location         : "Buffalo, NY"
  links:
    - label: "Made Mistakes"
      icon: "fas fa-fw fa-link"
      url: "https://mademistakes.com"
    - label: "Twitter"
      icon: "fab fa-fw fa-twitter-square"
      url: "https://twitter.com/mmistakes"
    - label: "GitHub"
      icon: "fab fa-fw fa-github"
      url: "https://github.com/mmistakes"
    - label: "Instagram"
      icon: "fab fa-fw fa-instagram"
      url: "https://instagram.com/mmistakes"
```

定义网站作者的基本信息，用于文章页的作者简介（author profile）或网站其它地方。



```yaml
# Site Footer
footer:
  links:
    - label: "Twitter"
      icon: "fab fa-fw fa-twitter-square"
      url: "https://twitter.com/mmistakes"
    - label: "GitHub"
      icon: "fab fa-fw fa-github"
      url: "https://github.com/mmistakes"
    - label: "Instagram"
      icon: "fab fa-fw fa-instagram"
      url: "https://instagram.com/mmistakes"
  since: "2013"
```

控制网站底部显示的内容。



```yaml
# Reading Files
include:
  - .htaccess
  - _pages
exclude:
  - "*.sublime-project"
  - "*.sublime-workspace"
  - vendor
  - .asset-cache
  - .bundle
  - .jekyll-assets-cache
  - .sass-cache
  - assets/js/plugins
  - assets/js/_main.js
  - assets/js/vendor
  - Capfile
  - CHANGELOG
  - config
  - Gemfile
  - Gruntfile.js
  - gulpfile.js
  - LICENSE
  - log
  - node_modules
  - package.json
  - Rakefile
  - README
  - tmp
# 构建后仍保留在输出目录（_site）里的文件。
keep_files:
  - .git
  - .svn
encoding: "utf-8"
markdown_ext: "markdown,mkdown,mkdn,mkd,md"
```

告诉 Jekyll 在构建网站时**哪些文件需要处理，哪些需要忽略**。



```yaml
# Conversion
markdown: kramdown
highlighter: rouge
lsi: false
excerpt_separator: "\n\n"
incremental: false

# Markdown Processing
kramdown:
  input: GFM
  hard_wrap: false
  auto_ids: true
  footnote_nr: 1
  entity_output: as_char
  toc_levels: 1..6
  smart_quotes: lsquo,rsquo,ldquo,rdquo
  enable_coderay: false
```

控制 Markdown 的解析和高亮。



```yaml
# Collections
collections:
  docs:
    output: true
    permalink: /:collection/:path/
  recipes:
    output: true
    permalink: /:collection/:path/
  pets:
    output: true
    permalink: /:collection/:path/
  portfolio:
    output: true
    permalink: /:collection/:path/
```

定义自定义内容类型（非博客文章的内容集合）。output: true表示在网站中生成页面。



```yaml
# Defaults
defaults:
  # _posts
  - scope:
      path: ""
      type: posts
    values:
      layout: single
      author_profile: true
      read_time: true
      comments: true
      share: true
      related: true
  # _pages
  - scope:
      path: "_pages"
      type: pages
    values:
      layout: single
      author_profile: true
  # _docs
  - scope:
      path: ""
      type: docs
    values:
      layout: single
      read_time: false
      author_profile: false
      share: false
      comments: false
      toc_sticky: true
      sidebar:
        nav: "docs"
  # _recipes
  - scope:
      path: ""
      type: recipes
    values:
      layout: single
      author_profile: true
      share: true
      comments: true
  # _pets
  - scope:
      path: ""
      type: pets
    values:
      layout: single
      author_profile: true
      share: true
      comment: true
  # _portfolio
  - scope:
      path: ""
      type: portfolio
    values:
      layout: single
      author_profile: false
      share: true
```

为不同类型内容设置默认值，避免每篇文章或页面都重复配置。



```yaml
# Sass/SCSS
sass:
  sass_dir: _sass
  style: compressed # http://sass-lang.com/documentation/file.SASS_REFERENCE.html#output_style
```

配置 Jekyll 如何处理 Sass/SCSS 文件。



```yaml
# Outputting
permalink: /:categories/:title/
# paginate: 5 # amount of posts to show
# paginate_path: /page:num/
timezone: America/New_York # https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
```

`permalink`控制文章 URL 结构：`/:categories/:title/` → URL 会是 `网站域名/分类名/文章标题/`。

`paginate`表示每页显示文章数量（这里被注释掉）。

`paginate_path`表示分页路径（默认 `/page:num/`）。

`timezone`用于文章日期时间显示和 RSS Feed 时间戳。



```yaml
# Plugins (previously gems:)
plugins:
  - jekyll-paginate
  - jekyll-sitemap
  - jekyll-gist
  - jekyll-feed
  - jemoji
  - jekyll-include-cache
  
# mimic GitHub Pages with --safe
whitelist:
  - jekyll-paginate
  - jekyll-sitemap
  - jekyll-gist
  - jekyll-feed
  - jemoji
  - jekyll-include-cache
```

增加网站功能，通过插件扩展 Jekyll。



```yaml
# Archives
#  Type
#  - GitHub Pages compatible archive pages built with Liquid ~> type: liquid (default)
#  - Jekyll Archives plugin archive pages ~> type: jekyll-archives
#  Path (examples)
#  - Archive page should exist at path when using Liquid method or you can
#    expect broken links (especially with breadcrumbs enabled)
#  - <base_path>/tags/my-awesome-tag/index.html ~> path: /tags/
#  - <base_path>/categories/my-awesome-category/index.html ~> path: /categories/
#  - <base_path>/my-awesome-category/index.html ~> path: /
category_archive:
  type: liquid
  path: /categories/
tag_archive:
  type: liquid
  path: /tags/
# https://github.com/jekyll/jekyll-archives
# jekyll-archives:
#   enabled:
#     - categories
#     - tags
#   layouts:
#     category: archive-taxonomy
#     tag: archive-taxonomy
#   permalinks:
#     category: /categories/:name/
#     tag: /tags/:name/
```

生成分类和标签归档页。



```yaml
# HTML Compression
# - http://jch.penibelst.de/
compress_html:
  clippings: all
  ignore:
    envs: development
```

在构建网站时压缩 HTML，减少文件体积，加快加载速度。

`clippings: all`表示压缩所有空格、换行、注释。

`ignore.envs: development`表示开发环境下不压缩，方便调试。
