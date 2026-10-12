#!/bin/sh
# Rebuilds the KnowledgeBase guides from Creative_Coding_Guides, where the
# markdown and PDF are made (see its script.sh). Copies in the latest PDF
# and cover and renders the web page from the markdown with the blog's post
# template. The markdown itself isn't copied: its front matter has private
# notes (todo lists, local paths). Run from anywhere: sh KnowledgeBase/build.sh
#
# To add a guide: add a line to GUIDES below (source folder, source file
# name, page name), and an entry to ../data/knowledgebase.json.

set -e
cd "$(dirname "$0")"

GUIDES_DIR="$HOME/Documents/GitHub/Creative_Coding_Guides"

# source folder | markdown file (no extension) | page name on the site
GUIDES="
PICO-8|00_getting_started|PICO-8_Getting_Started
"

echo "$GUIDES" | while IFS='|' read -r src file page; do
  [ -z "$src" ] && continue
  mkdir -p "$page/cover"
  cp "$GUIDES_DIR/$src/$file.pdf" "$page/$page.pdf"
  cp "$GUIDES_DIR/$src/cover.jpg" "$page/cover/cover.jpg"
  (
    cd "$page"
    pandoc "$GUIDES_DIR/$src/$file.md" -o "$page.html" \
      --from=markdown+implicit_figures+inline_code_attributes \
      --lua-filter=../web.lua \
      --table-of-contents --toc-depth=3 \
      --template=../../pandoc/blog_template.html
  )
  echo "built $page"
done
