#!/bin/sh
# Rebuilds the KnowledgeBase guides from Creative_Coding_Guides, where the
# markdown and PDF are made (see its script.sh). Copies in the latest PDF
# and cover and renders the web page from the markdown with the blog's post
# template. The markdown itself isn't copied: its front matter has private
# notes (todo lists, local paths). Run from anywhere: sh KnowledgeBase/build.sh
#
# To add a guide: add a line to GUIDES below, and an entry to
# ../data/knowledgebase.json. Its cover comes from cover.jpg in the source
# folder if there is one (otherwise put one in <page>/cover/ yourself).

set -e
cd "$(dirname "$0")"

GUIDES_DIR="$HOME/Documents/GitHub/Creative_Coding_Guides"

# source folder | markdown file (no extension) | page name on the site |
# "pdf" to publish the PDF as a download
GUIDES="
PICO-8|00_getting_started|PICO-8_Getting_Started|pdf
MaxMsp_gen~/GSOT_Book/Wavetable_Synthesis|Wavetable_Synthesis|Wavetable_Synthesis|
"

echo "$GUIDES" | while IFS='|' read -r src file page pdf; do
  [ -z "$src" ] && continue
  mkdir -p "$page/cover"
  if [ "$pdf" = "pdf" ]; then
    cp "$GUIDES_DIR/$src/$file.pdf" "$page/$page.pdf"
  fi
  if [ -f "$GUIDES_DIR/$src/cover.jpg" ]; then
    cp "$GUIDES_DIR/$src/cover.jpg" "$page/cover/cover.jpg"
  fi
  (
    cd "$page"
    pandoc "$GUIDES_DIR/$src/$file.md" -o "$page.html" \
      --from=markdown+implicit_figures+inline_code_attributes \
      --lua-filter=../web.lua \
      --table-of-contents --toc-depth=3 \
      --katex \
      --template=../../pandoc/blog_template.html
  )
  echo "built $page"
done
