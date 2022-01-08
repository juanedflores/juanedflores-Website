PANDOCFLAGSHTML =                                           \
  --table-of-contents                                       \
  --toc-depth=4                                             \
  --from=markdown+markdown_in_html_blocks+bracketed_spans   \
  --template=../pandoc/blog_template.html

# a wildcard that searches recursively
rwildcard = $(wildcard $1$2) $(foreach d,$(wildcard $1*),$(call rwildcard,$d/,$2))

# find all markdown files
MARKDOWN := $(call rwildcard,./,*.md)
HTML = $(MARKDOWN:.md=.html)

all: $(HTML)

%.html: %.md
	@echo $@
	pandoc $< -o $@ $(PANDOCFLAGSHTML)
	python3 newBlogEntry.py $(@D)

clean:
	rm $(HTML)
