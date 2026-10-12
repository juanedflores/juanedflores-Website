#!/usr/bin/python
# -*- coding: utf-8 -*-

# A script that I execute if I ever want to create a new blog entry.
# The blog home (../blog.html) builds its cards from posts.json, so this
# script only has to keep that file up to date.
#
#   python3 newBlogEntry.py
#       Asks for a title, description, category and tags; creates the
#       entry's directory with a .md template and a cover/ folder, adds the
#       entry to posts.json, then runs make.
#
#   python3 newBlogEntry.py <entry directory>
#       Sets the entry's "modified" date to today. The Makefile runs this
#       after building each post. Entries not in posts.json (drafts) are
#       left alone, so they stay off the blog home until added.

import os
import sys
import json
from datetime import date

POSTS_FILE = "posts.json"
CATEGORIES = ["sound", "code", "electronics", "image", "process"]

today = date.today()


def load_posts():
    with open(POSTS_FILE, "r") as f:
        return json.load(f)


def save_posts(posts):
    with open(POSTS_FILE, "w") as f:
        json.dump(posts, f, indent=2, ensure_ascii=False)
        f.write("\n")


def update_entry(entry_dir):
    slug = os.path.basename(os.path.normpath(entry_dir))
    posts = load_posts()
    for post in posts:
        if post["slug"] == slug:
            post["modified"] = str(today)
            save_posts(posts)
            print("Updated modified date for " + slug)
            return
    print(slug + " is not in posts.json, so it isn't listed on the blog home.")


def create_entry():
    title = input("Enter new blog entry title: ").strip()
    description = input("Enter a short description for {}: ".format(title)).strip()
    category = ""
    while category not in CATEGORIES:
        category = input("Category ({}): ".format(", ".join(CATEGORIES))).strip().lower()
    tags = [t.strip() for t in input("Enter any tags followed by comma: ").split(",") if t.strip()]

    slug = title.replace(" ", "_")
    os.mkdir(slug)
    os.mkdir(slug + "/cover")
    with open("{}/{}.md".format(slug, slug), "w+") as f:
        f.write("---\ntitle: {}\ndate_created: {}\n---\n\n".format(title, today.strftime("%B %d, %Y")))

    posts = load_posts()
    posts.insert(
        0,
        {
            "title": title,
            "slug": slug,
            "category": category,
            "modified": str(today),
            "description": description,
            "tags": tags,
            "cover": "cover/cover.png",
        },
    )
    save_posts(posts)
    print("Added {} to posts.json. Put its cover image at {}/cover/cover.png".format(title, slug))

    os.system("make")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        update_entry(sys.argv[1])
    else:
        create_entry()
